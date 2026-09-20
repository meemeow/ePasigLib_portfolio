import * as admin from "firebase-admin";
import {
  ArchiveLogData,
  EditLogData,
  RegistrationLogData,
} from "./writing-types";
import { appendLogEntry, logEntriesRef } from "./lms-log-entries";
import { db, serverTimestamp } from "../../../core/firebase";

export const logStaffLMSRegistration = async (data: RegistrationLogData) => {
  try {
    await appendLogEntry(
      db,
      "staff_register",
      "staff_register",
      "STAF_REGIS_",
      () => ({
        Action: data.action,
        CreatedBy: data.createdBy,
        CreatedOn: data.createdOn,
        Description: data.description,
        TargetName: data.targetName,
        TargetUID: data.targetUID,
        UID: data.UID,
      }),
    );
  } catch (error) {
    console.error("Failed to log staff registration:", error);
    throw error;
  }
};

export const logEditStaffInformation = async (data: EditLogData) => {
  try {
    await db.runTransaction(async (transaction) => {
      const metadataRef = db
        .collection("metadata")
        .doc("staff_edit");
      const entriesRef = logEntriesRef(db, "staff_edit");

      const metadataDoc = await transaction.get(metadataRef);

      let nextuid = 1;
      if (metadataDoc.exists && metadataDoc.data()?.nextUID !== undefined) {
        nextuid = (metadataDoc.data() as { nextUID: number }).nextUID;
      }

      const paddedUID = String(nextuid).padStart(7, "0");
      const logFieldName = `STAF_UPDTE_${paddedUID}`;

      const logRecord = {
        Action: data.action,
        Description: data.description,
        ModifiedBy: data.modifiedBy,
        ModifiedOn: data.modifiedOn,
        TargetName: data.targetName,
        TargetUID: data.targetUID,
        UID: data.UID,
      };

      transaction.set(metadataRef, { nextUID: nextuid + 1 }, { merge: true });
      transaction.set(entriesRef.doc(logFieldName), logRecord);
    });
  } catch (error) {
    console.error("Failed to log staff information edit:", error);
    throw error;
  }
};

export const logStaffArchiveUnarchive = async (data: ArchiveLogData) => {
  try {
    await db.runTransaction(async (transaction) => {
      const metadataRef = db
        .collection("metadata")
        .doc("staff_archive");
      const entriesRef = logEntriesRef(db, "staff_archive");

      const metadataDoc = await transaction.get(metadataRef);
      let nextuid = 1;
      if (metadataDoc.exists && metadataDoc.data()?.nextUID !== undefined) {
        nextuid = (metadataDoc.data() as { nextUID: number }).nextUID;
      }

      const paddedUID = String(nextuid).padStart(7, "0");
      const logFieldName = `STAF_ARCHV_${paddedUID}`;

      const logRecord: {
        Action: string;
        ArchivedBy?: string;
        ArchivedOn?: admin.firestore.FieldValue;
        Description: string;
        TargetName: string;
        TargetUID: string;
        UID: string;
        UnarchivedBy?: string;
        UnarchivedOn?: admin.firestore.FieldValue;
      } = {
        Action: data.action,
        Description: data.description,
        TargetName: data.targetName,
        TargetUID: data.targetUID,
        UID: data.UID,
      };

      if (data.archiveAction === "archive") {
        logRecord.ArchivedBy = data.actorName;
        logRecord.ArchivedOn = serverTimestamp();
      } else {
        logRecord.UnarchivedBy = data.actorName;
        logRecord.UnarchivedOn = serverTimestamp();
      }

      transaction.set(metadataRef, { nextUID: nextuid + 1 }, { merge: true });
      transaction.set(entriesRef.doc(logFieldName), logRecord);
    });
  } catch (error) {
    console.error("Failed to log staff archive/unarchive:", error);
    throw error;
  }
};
