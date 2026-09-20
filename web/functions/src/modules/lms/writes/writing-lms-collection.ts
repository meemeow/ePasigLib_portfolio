import { toTimestamp } from "../../../core/time";
import {
  CollectionAddLogRecord,
  CollectionArchiveLogRecord,
  CollectionConfigureLogRecord,
  CollectionEditLogRecord,
} from "./writing-lms-collection-types";
import { logEntriesRef } from "./lms-log-entries";
import { db, serverTimestamp } from "../../../core/firebase";

interface StaffNameFields {
  UID?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Suffix?: string;
}

interface CollectionUidFields {
  UID?: string;
  uid?: string;
}

interface UidCounter {
  nextUID?: number;
}

type CollectionDocument =
  | FirebaseFirestore.QueryDocumentSnapshot
  | FirebaseFirestore.DocumentSnapshot;

type CollectionLogRequest = Record<string, unknown>;

function logText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function firstText(data: CollectionLogRequest, ...keys: string[]): string {
  for (const key of keys) {
    const value = logText(data[key]);
    if (value) return value;
  }
  return "";
}

function staffFullName(record: StaffNameFields): string {
  return [record.FirstName, record.MiddleName, record.LastName, record.Suffix]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function counterValue(snapshot: FirebaseFirestore.DocumentSnapshot): number {
  const stored = Number((snapshot.data() as UidCounter | undefined)?.nextUID);
  return Number.isFinite(stored) && stored > 0 ? stored : 1;
}

export async function resolveStaffActor(
  uid: string,
  providedName: string,
): Promise<{ name: string; customUID: string }> {
  if (!uid) return { name: providedName, customUID: "" };

  try {
    const staffs = db.collection("staffs");

    const byDoc = await staffs.doc(uid).get();
    if (byDoc.exists) {
      const record = byDoc.data() as StaffNameFields;
      return {
        name: providedName || staffFullName(record),
        customUID: String(record.UID || ""),
      };
    }

    const byField = await staffs.where("UID", "==", uid).limit(1).get();
    if (!byField.empty) {
      const record = byField.docs[0].data() as StaffNameFields;
      return {
        name: providedName || staffFullName(record),
        customUID: String(record.UID || ""),
      };
    }
  } catch (error) {
    console.warn("Staff lookup failed", uid, error);
  }

  return { name: providedName, customUID: "" };
}

export const logAddCollectionRecord = async (
  data: CollectionLogRequest,
): Promise<void> => {
  try {
    const authUid = logText(data.UID);
    const { name: staffName, customUID: staffCustomUID } =
      await resolveStaffActor(
        authUid,
        firstText(data, "StaffName", "staffName"),
      );

    await db.runTransaction(async (transaction) => {
      const metadataRef = db
        .collection("metadata")
        .doc("collection_add");
      const entriesRef = logEntriesRef(db, "collection_add");

      const metadataDoc = await transaction.get(metadataRef);
      const nextuid = counterValue(metadataDoc);

      const paddedUID = String(nextuid).padStart(7, "0");
      const logFieldName = `CLTN_ADDTN_${paddedUID}`;

      const targetUID = logText(data.TargetUID);
      const targetCollection = firstText(data, "TargetCollection", "TargetName");
      const description =
        logText(data.Description) ||
        `${targetUID} was created by ${staffCustomUID || authUid}`;

      const logRecord: CollectionAddLogRecord = {
        Action: logText(data.Action) || "CatalogingAdd",
        Description: description,
        TargetUID: targetUID,
        TargetCollection: targetCollection,
        CreatedOn:
          toTimestamp(data.CreatedOn) ??
          serverTimestamp(),
        CreatedBy: staffName || staffCustomUID || authUid || "",
        UID: staffCustomUID || authUid || "",
      };

      transaction.set(metadataRef, { nextUID: nextuid + 1 }, { merge: true });
      transaction.set(entriesRef.doc(logFieldName), logRecord);
    });
  } catch (error) {
    console.error("Failed to log collection add:", error);
    console.error("Error details:", {
      dataReceived: data,
    });
    throw error;
  }
};

export const logEditCollectionInformation = async (
  data: CollectionLogRequest,
): Promise<void> => {
  try {
    const providedName = firstText(
      data,
      "StaffName",
      "staffName",
      "ModifiedBy",
      "CreatedBy",
    );
    const lookupUID = firstText(
      data,
      "StaffUID",
      "staffUID",
      "UID",
      "ModifiedBy",
      "CreatedBy",
    );

    const { name: resolvedName, customUID } = await resolveStaffActor(
      lookupUID,
      "",
    );
    const resolvedActorName = resolvedName || providedName;
    const actorLookupUID = customUID || lookupUID;

    await db.runTransaction(async (transaction) => {
      const metadataRef = db
        .collection("metadata")
        .doc("collection_edit");
      const entriesRef = logEntriesRef(db, "collection_edit");

      const metadataDoc = await transaction.get(metadataRef);
      const nextuid = counterValue(metadataDoc);

      const paddedUID = String(nextuid).padStart(7, "0");
      const logFieldName = `CLTN_UPDTE_${paddedUID}`;

      const modifiedOnTs =
        toTimestamp(data.ModifiedOn) ??
        toTimestamp(data.CreatedOn) ??
        serverTimestamp();
      const targetUIDRaw = firstText(data, "TargetUID", "targetUID");
      const targetName = firstText(
        data,
        "TargetName",
        "TargetCollection",
        "targetName",
      );

      let targetUID = targetUIDRaw;
      try {
        const collections = db.collection("collections");

        if (!/^C\d+$/i.test(targetUIDRaw)) {
          let found: CollectionDocument | null = null;
          if (targetUIDRaw) {
            const byUidSnap = await collections
              .where("UID", "==", targetUIDRaw)
              .limit(1)
              .get();
            if (!byUidSnap.empty) found = byUidSnap.docs[0];
          }

          if (!found && targetUIDRaw) {
            const byDoc = await collections.doc(targetUIDRaw).get();
            if (byDoc.exists) found = byDoc;
          }

          if (!found && targetName) {
            const byTitleSnap = await collections
              .where("CollectionTitle", "==", targetName)
              .limit(1)
              .get();
            if (!byTitleSnap.empty) found = byTitleSnap.docs[0];
          }

          if (!found && targetUIDRaw) {
            const slugFields = ["CollectionSlug", "Slug", "NormalizedTitle"];
            for (const f of slugFields) {
              const snap = await collections
                .where(f, "==", targetUIDRaw)
                .limit(1)
                .get();
              if (!snap.empty) {
                found = snap.docs[0];
                break;
              }
            }
          }

          if (found) {
            const record = found.data() as CollectionUidFields | undefined;
            targetUID = String(
              record?.UID || record?.uid || found.id || targetUIDRaw,
            );
          }
        }
      } catch (e) {
        console.warn("Collection UID lookup failed", targetUIDRaw, e);
      }

      const staffUID = actorLookupUID || firstText(data, "StaffUID", "staffUID");

      const action = logText(data.Action) || "CatalogingEdit";
      const description =
        logText(data.Description) ||
        `${staffUID} edited ${targetUID}'s information`;

      const logRecord: CollectionEditLogRecord = {
        Action: action,
        Description: description,
        TargetUID: targetUID || "",
        TargetCollection: targetName,
        ModifiedOn: modifiedOnTs,
        ModifiedBy: resolvedActorName || "",
        UID: staffUID || "",
      };

      transaction.set(metadataRef, { nextUID: nextuid + 1 }, { merge: true });
      transaction.set(entriesRef.doc(logFieldName), logRecord);
    });
  } catch (error) {
    console.error("Failed to log collection information edit:", error);
    throw error;
  }
};

export const logCollectionArchiveUnarchive = async (
  data: CollectionLogRequest,
): Promise<void> => {
  try {
    const authUid = logText(data.UID);
    const providedName = firstText(data, "StaffName", "staffName", "CreatedBy");
    const providedUID = firstText(data, "StaffUID", "staffUID");

    let staffName = providedName;
    let staffCustomUID = providedUID;
    if (!staffCustomUID || !staffName) {
      const resolved = await resolveStaffActor(authUid, providedName);
      staffName = resolved.name;
      staffCustomUID = staffCustomUID || resolved.customUID;
    }

    await db.runTransaction(async (transaction) => {
      const metadataRef = db
        .collection("metadata")
        .doc("collection_archive");
      const entriesRef = logEntriesRef(db, "collection_archive");

      const metadataDoc = await transaction.get(metadataRef);
      const nextuid = counterValue(metadataDoc);

      const paddedUID = String(nextuid).padStart(7, "0");
      const logFieldName = `CLTN_ARCHV_${paddedUID}`;

      const action = logText(data.Action);
      const archiveAction =
        firstText(data, "ArchiveAction", "action") ||
        (action === "CatalogingArchive"
          ? "archive"
          : action === "CatalogingUnarchive"
            ? "unarchive"
            : "");
      const targetUID = firstText(data, "TargetUID", "targetUID");
      const targetCollection = firstText(
        data,
        "TargetCollection",
        "targetName",
        "TargetName",
      );

      const verb = archiveAction === "unarchive" ? "unarchived" : "archived";
      const actorUID = staffCustomUID || providedUID || authUid;
      const description =
        logText(data.Description) || `${targetUID} ${verb} by ${actorUID}`;

      const stamp = serverTimestamp();
      const actorName = staffName || "Epasig Library";
      const logRecord: CollectionArchiveLogRecord = {
        Action:
          archiveAction === "unarchive"
            ? "CatalogingUnarchive"
            : "CatalogingArchive",
        Description: description,
        TargetUID: targetUID,
        TargetCollection: targetCollection,
        UID: actorUID,
        ...(archiveAction === "archive"
          ? { ArchivedBy: actorName, ArchivedOn: stamp }
          : {}),
        ...(archiveAction === "unarchive"
          ? { UnarchivedBy: actorName, UnarchivedOn: stamp }
          : {}),
      };

      transaction.set(metadataRef, { nextUID: nextuid + 1 }, { merge: true });
      transaction.set(entriesRef.doc(logFieldName), logRecord);
    });
  } catch (error) {
    console.error("Failed to log staff archive/unarchive:", error);
    throw error;
  }
};

export const logCollectionConfigure = async (
  data: CollectionLogRequest,
): Promise<void> => {
  try {
    const authUid = logText(data.UID);
    const { name: staffName, customUID } = await resolveStaffActor(
      authUid,
      firstText(data, "StaffName", "staffName"),
    );

    const metaRef = db.collection("metadata").doc("collection_configure");
    let nextUID = 1;
    await db.runTransaction(async (tx) => {
      const meta = await tx.get(metaRef);
      nextUID = counterValue(meta);
      tx.set(metaRef, { nextUID: nextUID + 1 }, { merge: true });
    });

    const fieldName = `CLTN_CNFGR_${String(nextUID).padStart(7, "0")}`;
    const actorUID = customUID || authUid || "";

    const targetName =
      logText(data.TargetName) || "Class Codes and Material Types";

    const logRecord: CollectionConfigureLogRecord = {
      Action: logText(data.Action) || "CatalogingEdit",
      ModifiedBy: staffName || customUID || "",
      ModifiedOn: serverTimestamp(),
      Description:
        logText(data.Description) ||
        `${targetName} has been configured by ${actorUID}`,
      TargetName: targetName,
      UID: actorUID,
    };

    await logEntriesRef(db, "collection_configure")
      .doc(fieldName)
      .set(logRecord);
  } catch (error) {
    console.warn("Failed to write configuration log:", error);
    throw error;
  }
};
