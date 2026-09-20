import * as functions from "firebase-functions";


export type AnyObj = Record<string, any>;


export const HttpsError = functions.https.HttpsError;


// ==========================================
// || SHARED                                ||
// ==========================================

export async function resolvePatron(
  db: FirebaseFirestore.Firestore,
  patronIdOrUID: string,
): Promise<{ ref: FirebaseFirestore.DocumentReference; data: AnyObj }> {
  const direct = db.collection("patrons").doc(patronIdOrUID);
  const snap = await direct.get();
  if (snap.exists) return { ref: direct, data: snap.data() as AnyObj };

  const q = await db
    .collection("patrons")
    .where("UID", "==", patronIdOrUID)
    .limit(1)
    .get();
  if (q.empty) throw new HttpsError("not-found", "Patron not found.");
  return { ref: q.docs[0].ref, data: q.docs[0].data() as AnyObj };
}


export function patronName(patron: AnyObj): string {
  return `${String(patron.FirstName || "")} ${String(patron.LastName || "")}`.trim();
}


// ==========================================
// || SLOT ACCOUNTING                       ||
// ==========================================

export interface SlotUsage {
  loans: number;
  holds: number;
  pending: number;
  total: number;
}


export function pendingRequestsQuery(
  db: FirebaseFirestore.Firestore,
  patronUID: string,
): FirebaseFirestore.Query {
  return db
    .collection("reservationRequests")
    .where("PatronUID", "==", patronUID)
    .where("Status", "==", "Pending");
}


export function slotUsage(
  summary: AnyObj,
  pendingSnap: FirebaseFirestore.QuerySnapshot,
): SlotUsage {
  const loans = Number(summary.ActiveLoans || 0);
  const holds = Number(summary.ActiveHolds || 0);
  let pending = 0;
  for (const doc of pendingSnap.docs) {
    const books = (doc.data() as AnyObj).Books;
    pending += Array.isArray(books) ? books.length : 0;
  }
  return { loans, holds, pending, total: loans + holds + pending };
}


export function describeSlots(usage: SlotUsage): string {
  const parts = [
    usage.loans ? `${usage.loans} on loan` : null,
    usage.holds ? `${usage.holds} waiting to collect` : null,
    usage.pending ? `${usage.pending} awaiting approval` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "nothing out";
}


export function copyIndexOf(copies: AnyObj[], accession: string): number {
  const index = copies.findIndex(
    (c) => String(c?.Accession || "") === String(accession),
  );
  if (index < 0) throw new HttpsError("not-found", "Copy not found.");
  return index;
}
