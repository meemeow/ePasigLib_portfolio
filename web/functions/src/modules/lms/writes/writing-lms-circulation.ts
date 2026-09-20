import * as admin from "firebase-admin";
import {
  allocateTransactionId,
  transactionsRef,
} from "../../circulation/circulation-policy";
import { CirculationLogData } from "./writing-types";
import { db, now } from "../../../core/firebase";

type AnyObj = Record<string, any>;

export function buildCirculationEntry(
  data: CirculationLogData,
  processedOn: admin.firestore.Timestamp | admin.firestore.FieldValue,
): AnyObj {
  const record: AnyObj = {
    Action: data.action,
    Description: data.description,
    ProcessedBy: data.processedBy,
    ProcessedOn: processedOn,
    TargetName: data.targetName,
    TargetUID: data.targetUID,
    UID: data.UID,

    Type: data.type,
    Status: data.status,

    Accession: String(data.accession || ""),
    CollectionTitle: String(data.collectionTitle || ""),
    CollectionUID: String(data.collectionUID || ""),
    Books: Array.isArray(data.books) ? data.books : [],

    DueDate: data.dueDate ?? null,
    NewDueDate: data.newDueDate ?? null,
    CheckinDate: data.checkinDate ?? null,
    Purpose: String(data.purpose || ""),

    Remarks: String(data.remarks || ""),
    Violations: String(data.violations || "None"),
    HasRenewed: Boolean(data.hasRenewed),
    DaysOfExtension:
      data.daysOfExtension === undefined ? null : data.daysOfExtension,
    BorrowID: String(data.borrowID || ""),
    OriginalCheckoutTransaction: data.originalCheckoutTransaction ?? null,
  };
  return record;
}

export async function writeCirculationEntry(
  data: CirculationLogData,
): Promise<{ id: string }> {
  let id = "";
  await db.runTransaction(async (tx) => {
    const { ids, commit } = await allocateTransactionId(tx, db);
    id = ids[0];
    const processedOn = data.processedOn ?? now();
    commit();
    tx.set(transactionsRef(db).doc(id), buildCirculationEntry(data, processedOn));
  });
  return { id };
}

// ==========================================
// || CASE HANDLERS                         ||
// ==========================================

export const logCheckout = (data: CirculationLogData) =>
  writeCirculationEntry({ ...data, case: "checkout", type: "Checkout" });

export const logCheckin = (data: CirculationLogData) =>
  writeCirculationEntry({ ...data, case: "checkin", type: "Checkin" });

export const logRenewal = (data: CirculationLogData) =>
  writeCirculationEntry({ ...data, case: "renewal", type: "Renewal" });

export const logReservationRequest = (data: CirculationLogData) =>
  writeCirculationEntry({ ...data, case: "reservation", type: "Reservation" });

export const logHold = (data: CirculationLogData) =>
  writeCirculationEntry({ ...data, case: "hold", type: "Reservation" });
