import { HttpsError } from "firebase-functions/v2/https";
import { writingLogsAttemptInternal } from "../lms/writes/writing-logs";
import {
  ArchiveLogData,
  EditLogData,
} from "../lms/writes/writing-types";
import { pickFields } from "../../core/coerce";
import { requireStaffActor } from "../../core/guards";
import { resolveStaffPermissions } from "./staff-permissions";
import {
  STAFF_EDITABLE_FIELDS,
  StaffArchivePayload,
  StaffArchiveResponse,
  StaffEditPayload,
  StaffEditResponse,
} from "./user-types";
import { db, now } from "../../core/firebase";

type FirestoreData = Record<string, unknown>;

function fullName(data: FirestoreData): string {
  return `${String(data.FirstName || "")} ${String(data.LastName || "")}`.trim();
}

export async function editStaffInformation(
  data: StaffEditPayload,
  authUid: string | null,
): Promise<StaffEditResponse> {
  const actor = await requireStaffActor(authUid ?? undefined, "StaffEdit");
  const { targetUID, profileData } = data;

  if (!targetUID || !profileData || typeof profileData !== "object") {
    throw new HttpsError(
      "invalid-argument",
      "targetUID and profileData are required",
    );
  }

  const staffSnap = await db
    .collection("staffs")
    .where("UID", "==", String(targetUID))
    .limit(1)
    .get();
  if (staffSnap.empty) {
    throw new HttpsError("not-found", "Staff not found");
  }
  const staffRef = staffSnap.docs[0].ref;
  const editedFields = pickFields(profileData, STAFF_EDITABLE_FIELDS);

  const targetName = await staffRef.firestore.runTransaction<string>(
    async (tx) => {
      const fresh = await tx.get(staffRef);
      if (!fresh.exists) {
        throw new HttpsError("not-found", "Staff not found");
      }
      const existing = fresh.data() as FirestoreData;

      const jobTitle = String(editedFields.JobTitle || existing.JobTitle || "");
      const finalData = {
        ...editedFields,
        ...resolveStaffPermissions(profileData, jobTitle),
      };

      tx.set(staffRef, finalData, { merge: true });

      return fullName({ ...existing, ...finalData }) || targetUID;
    },
  );

  try {
    const log: EditLogData = {
      case: "staffEdit",
      action: "StaffEdit",
      description: `${actor.publicUID} edited ${targetUID}'s information`,
      modifiedBy: actor.fullName,
      modifiedOn: now(),
      targetName,
      targetUID,
      UID: actor.publicUID,
    };
    await writingLogsAttemptInternal(log);
  } catch (logErr) {
    console.error("Failed to write staff edit log:", logErr);
  }

  return {
    success: true,
    message: "Staff profile updated.",
  };
}

export async function staffArchiveUnarchive(
  data: StaffArchivePayload,
  authUid: string | null,
): Promise<StaffArchiveResponse> {
  const actor = await requireStaffActor(authUid ?? undefined, "StaffArchive");
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
  if (targetUID === actor.publicUID) {
    throw new HttpsError(
      "failed-precondition",
      "You cannot archive your own staff account.",
    );
  }

  const staffSnap = await db
    .collection("staffs")
    .where("UID", "==", targetUID)
    .limit(1)
    .get();
  if (staffSnap.empty) {
    throw new HttpsError("not-found", "Staff not found");
  }
  const staffRef = staffSnap.docs[0].ref;
  const desiredStatus = action === "archive" ? "Archived" : "Active";

  const result = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(staffRef);
    if (!fresh.exists) {
      throw new HttpsError("not-found", "Staff not found during transaction");
    }
    const freshData = fresh.data() as FirestoreData;
    const previousStatus = String(freshData.Status || "Active");
    if (previousStatus !== desiredStatus) {
      tx.update(staffRef, { Status: desiredStatus });
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
      case: "staffArchiveUnarchive",
      action: "StaffArchive",
      archiveAction: action,
      actorName: actor.fullName,
      description: `${targetUID} ${action}d by ${actor.publicUID}`,
      targetName: result.targetName,
      targetUID,
      UID: actor.publicUID,
    };
    await writingLogsAttemptInternal(log);
  } catch (logErr) {
    console.error("Failed to write staff archive log:", logErr);
  }

  return {
    success: true,
    message:
      action === "archive"
        ? "Staff archived successfully."
        : "Staff unarchived successfully.",
    data: {
      targetUID: result.targetUID,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
    },
  };
}
