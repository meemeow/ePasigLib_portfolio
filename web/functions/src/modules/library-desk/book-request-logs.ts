import type { BookRequestStatus } from "./book-request-types";
import { now, serverTimestamp } from "../../core/firebase";

const LOG_DOC = "book_requests";
const ENTRIES = "entries";
const COUNTER_DOC = "book_requests_log";
const ID_PREFIX = "BKRQ_TRAIL_";

export type BookRequestLogAction =
  | "BookRequestCreate"
  | "BookRequestApprove"
  | "BookRequestDecline"
  | "BookRequestReopen"
  | "BookRequestDelete";

export interface BookRequestActor {
  uid: string;
  name: string;
  role: "Patron" | "Staff";
}

export interface BookRequestLogParams {
  action: BookRequestLogAction;
  targetUID: string;
  targetName: string;
  author?: string;
  requestIds: string[];
  fromStatus?: BookRequestStatus | null;
  toStatus?: BookRequestStatus | null;
  actor: BookRequestActor;
  description?: string;
}

export interface BookRequestLogEntry {
  Action: BookRequestLogAction;
  TargetUID: string;
  TargetName: string;
  Author: string;
  RequestIDs: string[];
  RequestCount: number;
  FromStatus: BookRequestStatus | null;
  ToStatus: BookRequestStatus | null;
  UID: string;
  CreatedBy: string;
  CreatedByRole: "Patron" | "Staff";
  CreatedOn: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  Description: string;
}

export function bookRequestLogEntriesRef(
  db: FirebaseFirestore.Firestore,
): FirebaseFirestore.CollectionReference {
  return db.collection("lmslogs").doc(LOG_DOC).collection(ENTRIES);
}

export async function allocateBookRequestLogId(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
): Promise<{ id: string; commit: () => void }> {
  const metaRef = db.collection("metadata").doc(COUNTER_DOC);
  const snap = await tx.get(metaRef);
  const next = snap.exists
    ? Number((snap.data() as Record<string, unknown>)?.nextUID) || 1
    : 1;
  return {
    id: `${ID_PREFIX}${String(next).padStart(7, "0")}`,
    commit: () => tx.set(metaRef, { nextUID: next + 1 }, { merge: true }),
  };
}

const VERB: Record<BookRequestLogAction, string> = {
  BookRequestCreate: "suggested the library acquire",
  BookRequestApprove: "approved the request for",
  BookRequestDecline: "declined the request for",
  BookRequestReopen: "put back under review the request for",
  BookRequestDelete: "removed every request for",
};

export function describeBookRequestLog(params: BookRequestLogParams): string {
  if (params.description) return params.description;

  const who = params.actor.name || params.actor.uid;
  const what = params.targetName ? ` "${params.targetName}"` : " a book";
  const by = params.author ? ` by ${params.author}` : "";
  const base = `${who} ${VERB[params.action]}${what}${by}`;

  const count = params.requestIds.length;
  if (params.action !== "BookRequestCreate" && count > 0) {
    return `${base} (${count} request${count === 1 ? "" : "s"}).`;
  }
  return `${base}.`;
}

export function buildBookRequestLogEntry(
  params: BookRequestLogParams,
  createdOn:
    | FirebaseFirestore.Timestamp
    | FirebaseFirestore.FieldValue = serverTimestamp(),
): BookRequestLogEntry {
  return {
    Action: params.action,
    TargetUID: params.targetUID,
    TargetName: params.targetName,
    Author: params.author || "",
    RequestIDs: params.requestIds,
    RequestCount: params.requestIds.length,
    FromStatus: params.fromStatus ?? null,
    ToStatus: params.toStatus ?? null,
    UID: params.actor.uid,
    CreatedBy: params.actor.name || params.actor.uid,
    CreatedByRole: params.actor.role,
    CreatedOn: createdOn,
    Description: describeBookRequestLog(params),
  };
}

export function writeBookRequestLogEntry(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  logId: string,
  params: BookRequestLogParams,
): void {
  tx.set(
    bookRequestLogEntriesRef(db).doc(logId),
    buildBookRequestLogEntry(params, now()),
  );
}

export async function allocateBookRequestLogIdStandalone(
  db: FirebaseFirestore.Firestore,
): Promise<string> {
  const metaRef = db.collection("metadata").doc(COUNTER_DOC);
  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(metaRef);
    const next = snap.exists
      ? Number((snap.data() as Record<string, unknown>)?.nextUID) || 1
      : 1;
    tx.set(metaRef, { nextUID: next + 1 }, { merge: true });
    return `${ID_PREFIX}${String(next).padStart(7, "0")}`;
  });
}
