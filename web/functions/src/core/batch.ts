import { db } from "./firebase";

/** Firestore refuses a batch larger than this. */
export const BATCH_LIMIT = 500;

export function chunk<T>(items: T[], size = BATCH_LIMIT): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Apply `write` to every item, committing one batch per chunk. Returns the
 * number of items written so callers can report what they touched.
 */
export async function commitInChunks<T>(
  items: T[],
  write: (batch: FirebaseFirestore.WriteBatch, item: T) => void,
  size = BATCH_LIMIT,
): Promise<number> {
  for (const group of chunk(items, size)) {
    const batch = db.batch();
    for (const item of group) write(batch, item);
    await batch.commit();
  }
  return items.length;
}

/** Delete every reference, in batches. */
export const deleteRefs = (
  refs: FirebaseFirestore.DocumentReference[],
  size = BATCH_LIMIT,
): Promise<number> =>
  commitInChunks(refs, (batch, ref) => batch.delete(ref), size);
