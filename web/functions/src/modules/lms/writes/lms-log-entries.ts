import * as admin from "firebase-admin";

export const ENTRIES = "entries";

export const COLLECTION_LOG_REGISTERS = [
  "collection_add",
  "collection_edit",
  "collection_archive",
  "collection_configure",
] as const;

export const PATRON_LOG_REGISTERS = [
  "patron_register",
  "patron_edit",
  "patron_archive",
  "patron_verify",
] as const;

export const STAFF_LOG_REGISTERS = [
  "staff_register",
  "staff_edit",
  "staff_archive",
] as const;

export const ACCOUNT_LOG_REGISTERS = ["password_reset"] as const;

export const ALL_LOG_REGISTERS = [
  ...STAFF_LOG_REGISTERS,
  ...PATRON_LOG_REGISTERS,
  ...COLLECTION_LOG_REGISTERS,
] as const;

export type LogRegister =
  | (typeof ALL_LOG_REGISTERS)[number]
  | (typeof ACCOUNT_LOG_REGISTERS)[number];

export function logEntriesRef(
  db: FirebaseFirestore.Firestore,
  register: LogRegister,
): FirebaseFirestore.CollectionReference {
  return db.collection("lmslogs").doc(register).collection(ENTRIES);
}

export const ORDER_BY_ID = admin.firestore.FieldPath.documentId();

export async function allocateLogId(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  counterDoc: string,
  prefix: string,
): Promise<{ id: string; commit: () => void }> {
  const metaRef = db.collection("metadata").doc(counterDoc);
  const snap = await tx.get(metaRef);
  const next = snap.exists
    ? Number((snap.data() as Record<string, unknown>)?.nextUID) || 1
    : 1;
  return {
    id: `${prefix}${String(next).padStart(7, "0")}`,
    commit: () => tx.set(metaRef, { nextUID: next + 1 }, { merge: true }),
  };
}

export async function appendLogEntry(
  db: FirebaseFirestore.Firestore,
  register: LogRegister,
  counterDoc: string,
  prefix: string,
  buildRecord: (id: string) => Record<string, unknown>,
): Promise<string> {
  return db.runTransaction(async (tx) => {
    const { id, commit } = await allocateLogId(tx, db, counterDoc, prefix);
    tx.set(logEntriesRef(db, register).doc(id), buildRecord(id));
    commit();
    return id;
  });
}

export async function queryLogEntries(
  db: FirebaseFirestore.Firestore,
  registers: readonly LogRegister[],
  field: "TargetUID" | "UID",
  values: string[],
  limit?: number,
): Promise<Array<{ register: string; id: string; data: Record<string, unknown> }>> {
  if (values.length === 0) return [];

  const results = await Promise.all(
    registers.map(async (register) => {
      let query: FirebaseFirestore.Query = logEntriesRef(db, register);
      query =
        values.length === 1
          ? query.where(field, "==", values[0])
          : query.where(field, "in", values.slice(0, 30));
      if (limit) query = query.orderBy(ORDER_BY_ID, "desc").limit(limit);

      try {
        const snap = await query.get();
        return snap.docs.map((doc) => ({
          register,
          id: doc.id,
          data: doc.data() as Record<string, unknown>,
        }));
      } catch (error) {
        console.error(`Log query failed on ${register}:`, error);
        return [];
      }
    }),
  );

  return results.flat();
}
