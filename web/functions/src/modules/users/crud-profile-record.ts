import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { v4 as uuidv4 } from "uuid";
import { writingLogsAttemptInternal } from "../lms/writes/writing-logs";
import { EditLogData } from "../lms/writes/writing-types";
import { pickFields } from "../../core/coerce";
import { notifyPatron } from "../circulation/circulation-policy";
import {
  OWN_PATRON_EDITABLE_FIELDS,
  OWN_PROFILE_EDITABLE_FIELDS,
  OwnProfilePayload,
  OwnProfileResponse,
  ProfileUploadPayload,
  ProfileUploadResponse,
} from "./user-types";
import { db, now, serverTimestamp, storage } from "../../core/firebase";

type FirestoreData = Record<string, unknown>;

interface SelfRecord {
  collection: "staffs" | "patrons";
  ref: admin.firestore.DocumentReference;
  data: FirestoreData;
  publicUID: string;
  fullName: string;
}

async function requireSelfRecord(authUid: string | null): Promise<SelfRecord> {
  if (!authUid) {
    throw new HttpsError("unauthenticated", "You must be signed in to do this.");
  }


  const staffRef = db.collection("staffs").doc(authUid);
  const staffSnap = await staffRef.get();
  if (staffSnap.exists) {
    const data = (staffSnap.data() || {}) as FirestoreData;
    return {
      collection: "staffs",
      ref: staffRef,
      data,
      publicUID: String(data.UID || authUid),
      fullName: `${String(data.FirstName || "")} ${String(
        data.LastName || "",
      )}`.trim(),
    };
  }

  const patronRef = db.collection("patrons").doc(authUid);
  const patronSnap = await patronRef.get();
  if (patronSnap.exists) {
    const data = (patronSnap.data() || {}) as FirestoreData;
    return {
      collection: "patrons",
      ref: patronRef,
      data,
      publicUID: String(data.UID || authUid),
      fullName: `${String(data.FirstName || "")} ${String(
        data.LastName || "",
      )}`.trim(),
    };
  }

  throw new HttpsError("not-found", "No profile found for this account.");
}

async function writeSelfEditLog(
  self: SelfRecord,
  description: string,
): Promise<void> {
  const isStaff = self.collection === "staffs";

  try {
    const log: EditLogData = {
      case: isStaff ? "staffEdit" : "patronEdit",
      action: isStaff ? "StaffEdit" : "PatronEdit",
      description,
      modifiedBy: self.fullName,
      modifiedOn: now(),
      targetName: self.fullName,
      targetUID: self.publicUID,
      UID: self.publicUID,
    };
    await writingLogsAttemptInternal(log);
  } catch (logErr) {
    console.error("Failed to write own profile log:", logErr);
  }
}

async function saveProfileImage(
  filePath: string,
  imageData: string,
): Promise<string> {
  let base64 = imageData;
  let contentType = "image/webp";

  const dataUrlMatch = imageData.match(/^data:(.*?);base64,(.*)$/);
  if (dataUrlMatch) {
    contentType = dataUrlMatch[1] || "image/webp";
    base64 = dataUrlMatch[2];
  }

  const bucket = storage.bucket();
  const file = bucket.file(filePath);
  const token = uuidv4();

  await file.save(Buffer.from(base64, "base64"), {
    contentType,
    public: false,
    metadata: {
      metadata: { firebaseStorageDownloadTokens: token },
      cacheControl: "public, max-age=31536000",
    },
    resumable: false,
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

export async function editOwnProfile(
  data: OwnProfilePayload,
  authUid: string | null,
): Promise<OwnProfileResponse> {
  const self = await requireSelfRecord(authUid);
  const { profileData } = data;

  if (!profileData || typeof profileData !== "object") {
    throw new HttpsError("invalid-argument", "profileData is required");
  }

  const allowed =
    self.collection === "patrons"
      ? OWN_PATRON_EDITABLE_FIELDS
      : OWN_PROFILE_EDITABLE_FIELDS;

  const finalData = pickFields(profileData, allowed);
  if (Object.keys(finalData).length === 0) {
    throw new HttpsError("invalid-argument", "No editable fields provided");
  }

  await self.ref.set(finalData, { merge: true });

  await writeSelfEditLog(
    self,
    `${self.publicUID} edited ${self.publicUID}'s information`,
  );

  if (self.collection === "patrons") {
    await notifyPatron(db, self.ref.id, {
      title: "Profile Updated",
      content:
        `You updated your ${Object.keys(finalData).join(", ")}.\n` +
        "If this was not you, change your password and contact the library desk.",
      type: "account",
    });
  }

  return { success: true, message: "Profile updated." };
}

export async function uploadAvatar(
  data: ProfileUploadPayload,
  authUid: string | null,
): Promise<ProfileUploadResponse> {
  const self = await requireSelfRecord(authUid);
  const imageData = String(data?.imageData || "");
  if (!imageData) {
    throw new HttpsError(
      "invalid-argument",
      "imageData (base64 or data URL) is required",
    );
  }

  const downloadURL = await saveProfileImage(
    `avatar/${self.publicUID}.webp`,
    imageData,
  );
  await self.ref.set({ Avatar: downloadURL }, { merge: true });

  await writeSelfEditLog(self, `${self.publicUID} updated their profile photo`);

  return { success: true, url: downloadURL };
}

export async function uploadPatronID(
  data: ProfileUploadPayload,
  authUid: string | null,
): Promise<ProfileUploadResponse> {
  const self = await requireSelfRecord(authUid);
  if (self.collection !== "patrons") {
    throw new HttpsError(
      "permission-denied",
      "Only patron accounts have a library ID to upload.",
    );
  }

  const imageData = String(data?.imageData || "");
  if (!imageData) {
    throw new HttpsError(
      "invalid-argument",
      "imageData (base64 or data URL) is required",
    );
  }

  const downloadURL = await saveProfileImage(
    `ids/${self.publicUID}.webp`,
    imageData,
  );

  await self.ref.set(
    {
      ID: downloadURL,
      State: "Unverified",
      reverificationAt: serverTimestamp(),
    },
    { merge: true },
  );

  await writeSelfEditLog(
    self,
    `${self.publicUID} reuploaded their ID for re-verification`,
  );

  await notifyPatron(db, self.ref.id, {
    title: "ID Submitted for Review",
    content:
      "Your library ID has been submitted. The desk will review it and you will be notified either way.",
    type: "verification",
  });

  return { success: true, url: downloadURL };
}
