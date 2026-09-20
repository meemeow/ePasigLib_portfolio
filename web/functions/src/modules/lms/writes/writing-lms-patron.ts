import * as admin from "firebase-admin";
import {
  ArchiveLogData,
  EditLogData,
  RegistrationLogData,
  VerifyLogData,
} from "./writing-types";
import { appendLogEntry, logEntriesRef } from "./lms-log-entries";
import { db, serverTimestamp } from "../../../core/firebase";

export const logPatronLMSRegistration = async (data: RegistrationLogData) => {
  try {
    await appendLogEntry(
      db,
      "patron_register",
      "patron_register",
      "PTRN_REGIS_",
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
    console.error("Failed to log patron registration:", error);
    throw error;
  }
};

export const logEditPatronInformation = async (data: EditLogData) => {
  try {
    await db.runTransaction(async (transaction) => {
      const metadataRef = db
        .collection("metadata")
        .doc("patron_edit");
      const entriesRef = logEntriesRef(db, "patron_edit");

      const metadataDoc = await transaction.get(metadataRef);

      let nextuid = 1;
      if (metadataDoc.exists && metadataDoc.data()?.nextUID !== undefined) {
        nextuid = (metadataDoc.data() as { nextUID: number }).nextUID;
      }

      const paddedUID = String(nextuid).padStart(7, "0");
      const logFieldName = `PTRN_UPDTE_${paddedUID}`;

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
    console.error("Failed to log patron information edit:", error);
    throw error;
  }
};

export const logPatronArchiveUnarchive = async (data: ArchiveLogData) => {
  try {
    await db.runTransaction(async (transaction) => {
      const metadataRef = db
        .collection("metadata")
        .doc("patron_archive");
      const entriesRef = logEntriesRef(db, "patron_archive");

      const metadataDoc = await transaction.get(metadataRef);
      let nextuid = 1;
      if (metadataDoc.exists && metadataDoc.data()?.nextUID !== undefined) {
        nextuid = (metadataDoc.data() as { nextUID: number }).nextUID;
      }

      const paddedUID = String(nextuid).padStart(7, "0");
      const logFieldName = `PTRN_ARCHV_${paddedUID}`;

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
    console.error("Failed to log patron archive/unarchive:", error);
    throw error;
  }
};

export const logVerifyPatronID = async (data: VerifyLogData) => {
  try {
    await appendLogEntry(
      db,
      "patron_verify",
      "patron_verify",
      "PTRN_VERFY_",
      () => ({
        Action: data.action,
        Description: data.description,
        ProcessedBy: data.processedBy,
        ProcessedOn: data.processedOn,
        Remarks: data.remarks,
        Status: data.status,
        TargetName: data.targetName,
        TargetUID: data.targetUID,
        UID: data.UID,
      }),
    );
  } catch (error) {
    console.error("Failed to log verify patron id:", error);
    throw error;
  }
};
