import { toMillis } from "../../../../core/time";
import { db } from "../../../../core/firebase";
import { CollectionCheckinEntry, CollectionCheckoutEntry, CollectionLogEntry, CollectionLogsResponse } from "../fetching-types";
import { queryLogEntries } from "../../writes/lms-log-entries";
import { FirestoreData, text } from "./mappers";


const LOG_REGISTERS = [
  "collection_add",
  "collection_edit",
  "collection_archive",
] as const;


const LOG_DOC_ACTIONS: Record<string, string> = {
  collection_add: "CollectionAdd",
  collection_edit: "CollectionEdit",
  collection_archive: "CollectionArchive",
};


function transactionMatchesCollection(
  transaction: FirestoreData,
  collectionUID: string,
  collectionTitle: string,
): boolean {
  const uid = text(transaction.CollectionUID);
  if (uid) return uid === collectionUID;
  return text(transaction.CollectionTitle) === collectionTitle;
}


function mapCollectionLog(
  docId: string,
  entryKey: string,
  entry: FirestoreData,
  collectionUID: string,
): CollectionLogEntry {
  const CreatedOn = toMillis(entry.CreatedOn);
  const ModifiedOn = toMillis(entry.ModifiedOn) ?? toMillis(entry.EditedOn);
  const ArchivedOn = toMillis(entry.ArchivedOn);
  const UnarchivedOn = toMillis(entry.UnarchivedOn);
  const ProcessedOn = toMillis(entry.ProcessedOn) ?? toMillis(entry.ConfiguredOn);

  const CreatedBy = text(entry.CreatedBy);
  const ModifiedBy = text(entry.ModifiedBy || entry.EditedBy);
  const ArchivedBy = text(entry.ArchivedBy);
  const UnarchivedBy = text(entry.UnarchivedBy);
  const ProcessedBy = text(entry.ProcessedBy || entry.By || entry.StaffName);

  const storedAction = text(entry.Action);
  const isUnarchive = UnarchivedOn !== null || UnarchivedBy !== "";
  const Action =
    isUnarchive && storedAction === "CatalogingArchive"
      ? "CatalogingUnarchive"
      : storedAction || LOG_DOC_ACTIONS[docId] || "";

  return {
    id: `${docId}_${entryKey}`,
    Action,
    TargetName: text(
      entry.TargetCollection || entry.TargetName || entry.CollectionTitle,
    ),
    Description: text(entry.Description),
    On: ModifiedOn ?? CreatedOn ?? ArchivedOn ?? UnarchivedOn ?? ProcessedOn,
    By: ModifiedBy || CreatedBy || ArchivedBy || UnarchivedBy || ProcessedBy,
    CreatedBy,
    CreatedOn,
    ModifiedBy,
    ModifiedOn,
    ArchivedBy,
    ArchivedOn,
    UnarchivedBy,
    UnarchivedOn,
    ProcessedBy,
    ProcessedOn,
    UID: entry.UID ? text(entry.UID) : undefined,
    TargetUID: collectionUID,
  };
}


export async function fetchCollectionLogs(
  collectionUID: string,
  collectionTitle: string,
): Promise<CollectionLogsResponse> {
  const entriesRef = db
    .collection("lmslogs")
    .doc("transactions")
    .collection("entries");

  const [rows, byUID, byTitle] = await Promise.all([
    collectionUID
      ? queryLogEntries(db, LOG_REGISTERS, "TargetUID", [collectionUID])
      : Promise.resolve([]),
    collectionUID
      ? entriesRef.where("CollectionUID", "==", collectionUID).get()
      : null,
    collectionTitle
      ? entriesRef.where("CollectionTitle", "==", collectionTitle).get()
      : null,
  ]);

  const modificationLogs: CollectionLogEntry[] = [];
  const checkoutHistory: CollectionCheckoutEntry[] = [];
  const checkinHistory: CollectionCheckinEntry[] = [];

  const seen = new Set<string>();
  for (const result of [byUID, byTitle]) {
    for (const doc of result?.docs || []) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      const entry = doc.data() as FirestoreData;
      if (!transactionMatchesCollection(entry, collectionUID, collectionTitle)) {
        continue;
      }
      if (entry.Type === "Checkout") {
        checkoutHistory.push({
          id: doc.id,
          Accession: text(entry.Accession),
          FullName: text(entry.TargetName),
          CheckedOutBy: text(entry.ProcessedBy),
          CheckoutDate: toMillis(entry.ProcessedOn),
          DueDate: toMillis(entry.DueDate),
          ReturnStatus: text(entry.Status),
        });
      } else if (entry.Type === "Checkin") {
        checkinHistory.push({
          id: doc.id,
          Accession: text(entry.Accession),
          FullName: text(entry.TargetName),
          CheckedInBy: text(entry.ProcessedBy || entry.CheckinBy),
          CheckInDate: toMillis(entry.CheckinDate ?? entry.ProcessedOn),
          Violations: text(entry.Violations),
        });
      }
    }
  }

  for (const { register, id: entryKey, data } of rows) {
    modificationLogs.push(
      mapCollectionLog(register, entryKey, data as FirestoreData, collectionUID),
    );
  }

  modificationLogs.sort((a, b) => (b.On ?? 0) - (a.On ?? 0));
  checkoutHistory.sort((a, b) => (b.CheckoutDate ?? 0) - (a.CheckoutDate ?? 0));
  checkinHistory.sort((a, b) => (b.CheckInDate ?? 0) - (a.CheckInDate ?? 0));

  return { modificationLogs, checkoutHistory, checkinHistory };
}
