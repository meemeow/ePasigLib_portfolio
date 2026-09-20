import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import {
  SEARCH_INDEX_META_DOC,
  buildSearchEntry,
} from "./search-index";
import type { SearchIndexEntry } from "./search-index";
import { db, increment, serverTimestamp } from "../../core/firebase";

const BATCH_LIMIT = 450;

function metaRef(): admin.firestore.DocumentReference {
  return db.collection("metadata").doc(SEARCH_INDEX_META_DOC);
}

export async function bumpSearchIndexVersion(): Promise<void> {
  await metaRef().set(
    {
      version: increment(1),
      updatedOn: serverTimestamp(),
    },
    { merge: true },
  );
}

function sameSearchEntry(
  stored: admin.firestore.DocumentData | undefined,
  next: SearchIndexEntry,
): boolean {
  if (!stored) return false;
  if (Number(stored.v) !== next.v) return false;
  if (String(stored.title ?? "") !== next.title) return false;
  if (String(stored.text ?? "") !== next.text) return false;

  const lists = ["titleTokens", "authorTokens", "otherTokens", "keywords"] as const;
  for (const key of lists) {
    const before = stored[key];
    const after = next[key];
    if (!Array.isArray(before) || before.length !== after.length) return false;
    for (let i = 0; i < after.length; i += 1) {
      if (String(before[i]) !== after[i]) return false;
    }
  }
  return true;
}

export async function writeSearchEntry(
  collectionId: string,
  data: admin.firestore.DocumentData | undefined,
): Promise<void> {
  const ref = db.collection("searches").doc(collectionId);
  if (!data) {
    await ref.delete();
    return;
  }
  await ref.set(buildSearchEntry(data));
}

export async function rebuildSearchIndex(): Promise<{
  written: number;
  removed: number;
  unchanged: number;
}> {
  const [collections, existing, existingAccessions] = await Promise.all([
    db.collection("collections").get(),
    db.collection("searches").get(),
    db.collection("accessions").get(),
  ]);

  const live = new Set<string>();
  const liveAccessions = new Set<string>();
  let batch = db.batch();
  let pending = 0;
  let written = 0;
  let removed = 0;
  let unchanged = 0;

  const storedSearches = new Map(existing.docs.map((doc) => [doc.id, doc.data()]));
  const storedAccessions = new Map(
    existingAccessions.docs.map((doc) => [doc.id, doc.data()]),
  );

  const flush = async (): Promise<void> => {
    if (pending === 0) return;
    await batch.commit();
    batch = db.batch();
    pending = 0;
  };

  for (const doc of collections.docs) {
    live.add(doc.id);
    const data = doc.data();

    const entry = buildSearchEntry(data);
    if (sameSearchEntry(storedSearches.get(doc.id), entry)) {
      unchanged += 1;
    } else {
      batch.set(db.collection("searches").doc(doc.id), entry);
      written += 1;
      pending += 1;
      if (pending >= BATCH_LIMIT) await flush();
    }

    for (const copy of Array.isArray(data.Copies) ? data.Copies : []) {
      const accession = String(copy?.Accession || "").trim();
      if (!accession) continue;
      liveAccessions.add(accession);

      if (storedAccessions.get(accession)?.BookID === doc.id) {
        unchanged += 1;
        continue;
      }
      batch.set(db.collection("accessions").doc(accession), { BookID: doc.id });
      written += 1;
      pending += 1;
      if (pending >= BATCH_LIMIT) await flush();
    }
  }

  for (const doc of existing.docs) {
    if (live.has(doc.id)) continue;
    batch.delete(doc.ref);
    removed += 1;
    pending += 1;
    if (pending >= BATCH_LIMIT) await flush();
  }

  for (const doc of existingAccessions.docs) {
    if (liveAccessions.has(doc.id)) continue;
    batch.delete(doc.ref);
    removed += 1;
    pending += 1;
    if (pending >= BATCH_LIMIT) await flush();
  }

  await flush();

  if (written > 0 || removed > 0) await bumpSearchIndexVersion();

  console.log(
    `✅ Search index rebuilt: ${written} written, ${removed} stale removed, ` +
      `${unchanged} already correct`,
  );
  return { written, removed, unchanged };
}

// ==========================================
// || ACCESSION INDEX                       ||
// ==========================================

function accessionsOf(data: admin.firestore.DocumentData | undefined): Set<string> {
  const out = new Set<string>();
  const copies = Array.isArray(data?.Copies) ? data!.Copies : [];
  for (const copy of copies) {
    const accession = String(copy?.Accession || "").trim();
    if (accession) out.add(accession);
  }
  return out;
}

export async function syncAccessionEntries(
  collectionId: string,
  before: admin.firestore.DocumentData | undefined,
  after: admin.firestore.DocumentData | undefined,
): Promise<void> {
  const previous = accessionsOf(before);
  const current = accessionsOf(after);

  const writes: Array<() => void> = [];
  let batch = db.batch();
  let pending = 0;

  const flush = async () => {
    if (pending === 0) return;
    await batch.commit();
    batch = db.batch();
    pending = 0;
  };

  for (const accession of current) {
    if (previous.has(accession)) continue;
    writes.push(() =>
      batch.set(db.collection("accessions").doc(accession), {
        BookID: collectionId,
      }),
    );
  }
  for (const accession of previous) {
    if (current.has(accession)) continue;
    writes.push(() => batch.delete(db.collection("accessions").doc(accession)));
  }

  if (writes.length === 0) return;

  for (const write of writes) {
    write();
    pending += 1;
    if (pending >= BATCH_LIMIT) await flush();
  }
  await flush();
}

export const syncCollectionSearchIndex = onDocumentWritten(
  "collections/{collectionId}",
  async (event) => {
    const collectionId = event.params.collectionId;
    const before = event.data?.before;
    const after = event.data?.after;

    try {
      await writeSearchEntry(
        collectionId,
        after?.exists ? after.data() : undefined,
      );
      await bumpSearchIndexVersion();
    } catch (error) {
      console.error(
        `Failed to sync search index for ${collectionId}:`,
        error,
      );
    }

    try {
      await syncAccessionEntries(
        collectionId,
        before?.exists ? before.data() : undefined,
        after?.exists ? after.data() : undefined,
      );
    } catch (error) {
      console.error(
        `Failed to sync accession index for ${collectionId}:`,
        error,
      );
    }
  },
);
