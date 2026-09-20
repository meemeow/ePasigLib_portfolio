import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { writingLogsAttemptInternal } from "../lms/writes/writing-logs";
import {
  ArchiveLogData,
  EditLogData,
  VerifyLogData,
} from "../lms/writes/writing-types";
import { pickFields } from "../../core/coerce";
import { requireStaffActor } from "../../core/guards";
import {
  holdsRef,
  loansRef,
  notifyPatron,
} from "../circulation/circulation-policy";
import { nameLower } from "../circulation/circulation-lookups";
import {
  PATRON_EDITABLE_FIELDS,
  PatronArchivePayload,
  PatronArchiveResponse,
  PatronEditPayload,
  PatronEditResponse,
  VerifyPatronPayload,
  VerifyPatronResponse,
} from "./user-types";
import { db, now, serverTimestamp } from "../../core/firebase";

type FirestoreData = Record<string, unknown>;

function fullName(data: FirestoreData): string {
  return `${String(data.FirstName || "")} ${String(data.LastName || "")}`.trim();
}

function assertNothingOutstanding(borrowed: number, reserved: number): void {
  if (borrowed === 0 && reserved === 0) return;

  const parts: string[] = [];
  if (borrowed > 0) {
    parts.push(`${borrowed} borrowed book${borrowed === 1 ? "" : "s"}`);
  }
  if (reserved > 0) {
    parts.push(`${reserved} reserved book${reserved === 1 ? "" : "s"}`);
  }

  throw new HttpsError(
    "failed-precondition",
    `This patron still has ${parts.join(" and ")}. ` +
      "Check the books in or release the reservations before archiving.",
  );
}

export async function editPatronInformation(
  data: PatronEditPayload,
  authUid: string | null,
): Promise<PatronEditResponse> {
  const actor = await requireStaffActor(authUid ?? undefined, "PatronEdit");
  const { targetUID, profileData } = data;

  if (!targetUID || !profileData || typeof profileData !== "object") {
    throw new HttpsError(
      "invalid-argument",
      "targetUID and profileData are required",
    );
  }

  const patronSnap = await db
    .collection("patrons")
    .where("UID", "==", String(targetUID))
    .limit(1)
    .get();
  if (patronSnap.empty) {
    throw new HttpsError("not-found", "Patron not found");
  }
  const patronRef = patronSnap.docs[0].ref;

  const outcome = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(patronRef);
    if (!fresh.exists) {
      throw new HttpsError("not-found", "Patron not found");
    }
    const existing = fresh.data() as FirestoreData;

    const finalData = pickFields(profileData, PATRON_EDITABLE_FIELDS);
    const merged = { ...existing, ...finalData };

    if (finalData.FirstName !== undefined || finalData.LastName !== undefined) {
      finalData.NameLower = nameLower(merged);
    }

    tx.set(patronRef, finalData, { merge: true });
    return {
      targetName: fullName(merged) || targetUID,
      changed: Object.keys(finalData).filter((key) => key !== "NameLower"),
    };
  });

  const targetName = outcome.targetName;

  try {
    const log: EditLogData = {
      case: "patronEdit",
      action: "PatronEdit",
      description: `${actor.publicUID} edited ${targetUID}'s information`,
      modifiedBy: actor.fullName,
      modifiedOn: now(),
      targetName,
      targetUID,
      UID: actor.publicUID,
    };
    await writingLogsAttemptInternal(log);
  } catch (logErr) {
    console.error("Failed to write patron edit log:", logErr);
  }

  const changed = outcome.changed;
  if (changed.length > 0) {
    await notifyPatron(db, patronRef.id, {
      title: "Account Details Updated",
      content:
        `The library updated your ${changed.join(", ")}.\n` +
        "If you were not expecting this, contact the library desk.",
      type: "account",
    });
  }

  return {
    success: true,
    message: "Patron profile updated.",
  };
}

export async function patronArchiveUnarchive(
  data: PatronArchivePayload,
  authUid: string | null,
): Promise<PatronArchiveResponse> {
  const actor = await requireStaffActor(authUid ?? undefined, "PatronArchive");
  const { targetUID, action } = data;

  if (!targetUID) {
    throw new HttpsError("invalid-argument", "targetUID is required");
  }
  if (action !== "archive" && action !== "unarchive") {
    throw new HttpsError(
      "invalid-argument",
      "Valid action (archive|unarchive) is required",
    );
  }

  const patronSnap = await db
    .collection("patrons")
    .where("UID", "==", targetUID)
    .limit(1)
    .get();
  if (patronSnap.empty) {
    throw new HttpsError("not-found", "Patron not found");
  }
  const patronRef = patronSnap.docs[0].ref;
  const desiredStatus = action === "archive" ? "Archived" : "Active";

  const result = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(patronRef);
    if (!fresh.exists) {
      throw new HttpsError("not-found", "Patron not found during transaction");
    }
    const freshData = fresh.data() as FirestoreData;
    const previousStatus = String(freshData.Status || "Active");

    if (action === "archive") {
      const [loans, holds] = await Promise.all([
        tx.get(loansRef(db, targetUID)),
        tx.get(holdsRef(db, targetUID)),
      ]);
      assertNothingOutstanding(loans.size, holds.size);
    }

    if (previousStatus !== desiredStatus) {
      tx.update(patronRef, { Status: desiredStatus });
    }
    return {
      targetUID,
      previousStatus,
      newStatus: desiredStatus,
      targetName: fullName(freshData) || targetUID,
    };
  });

  try {
    const log: ArchiveLogData = {
      case: "patronArchiveUnarchive",
      action: "PatronArchive",
      archiveAction: action,
      actorName: actor.fullName,
      description: `${targetUID} ${action}d by ${actor.publicUID}`,
      targetName: result.targetName,
      targetUID,
      UID: actor.publicUID,
    };
    await writingLogsAttemptInternal(log);
  } catch (logErr) {
    console.error("Failed to write patron archive log:", logErr);
  }

  if (result.previousStatus !== result.newStatus) {
    await notifyPatron(db, patronRef.id, {
      title:
        action === "archive" ? "Account Archived" : "Account Reactivated",
      content:
        action === "archive"
          ? "Your library account has been archived, so borrowing, reserving and renewing are closed. Contact the library desk if this is unexpected."
          : "Your library account is active again. You can borrow, reserve and renew as before.",
      type: "account",
    });
  }

  return {
    success: true,
    message:
      action === "archive"
        ? "Patron archived successfully."
        : "Patron unarchived successfully.",
    data: {
      targetUID: result.targetUID,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
    },
  };
}

export async function verifyUnverifiedPatrons(
  data: VerifyPatronPayload,
  authUid: string | null,
): Promise<VerifyPatronResponse> {
  const actor = await requireStaffActor(authUid ?? undefined, "VerifyIDs");
  const { action, targetUID, remarks } = data;

  if (!targetUID || (action !== "approve" && action !== "reject")) {
    throw new HttpsError("invalid-argument", "Missing or invalid parameters");
  }

  const patronRef = db.collection("patrons").doc(targetUID);
  const newState = action === "approve" ? "Verified" : "Rejected";

  const patronData = await db.runTransaction<FirestoreData>(async (tx) => {
    const fresh = await tx.get(patronRef);
    if (!fresh.exists) {
      throw new HttpsError("not-found", "Patron not found");
    }

    const data = (fresh.data() || {}) as FirestoreData;
    const currentState = String(data.State || "");
    if (currentState !== "Unverified") {
      throw new HttpsError(
        "failed-precondition",
        `Patron is not Unverified (current state: ${currentState})`,
      );
    }

    const updatePayload: admin.firestore.UpdateData<FirestoreData> = {
      State: newState,
    };
    if (action === "reject") {
      updatePayload.reverificationAt =
        serverTimestamp();
    }
    tx.update(patronRef, updatePayload);

    return data;
  });

  const patronPublicUID = String(patronData.UID || targetUID);

  try {
    const log: VerifyLogData = {
      case: "verifyPatronID",
      action: "PatronVerify",
      description: `${actor.publicUID} ${
        action === "approve" ? "approved" : "rejected"
      } verification for ${patronPublicUID}`,
      processedBy: actor.fullName,
      processedOn: now(),
      remarks: action === "reject" ? remarks : "",
      status: action === "approve" ? "Approved" : "Rejected",
      targetName: fullName(patronData),
      targetUID: patronPublicUID,
      UID: actor.publicUID,
    };
    await writingLogsAttemptInternal(log);
  } catch (logErr) {
    console.error("Failed to write patron verify log:", logErr);
  }

  if (action === "approve") {
    await notifyPatron(db, patronRef.id, {
      title: "ID Verified",
      content:
        "Your library ID has been verified. You can now borrow, reserve and renew books.",
      type: "verification",
    });
  } else {
    await notifyPatron(db, patronRef.id, {
      title: "ID Needs Re-uploading",
      content:
        `Your library ID could not be verified.${
          remarks ? `\nReason: ${remarks}` : ""
        }\n` +
        "Upload a clearer photo from your profile page and the desk will review it again.",
      type: "verification",
    });
  }

  return {
    status: "updated",
    case: "verifyUnverifiedPatrons",
    success: true,
    newState,
  };
}
