import * as admin from "firebase-admin";
import { searchCollections as rankedCollectionIds } from "../search/search-data";

type AnyObj = Record<string, any>;

const PREFIX_END = "\uf8ff";

const COPY_LIMIT = 25;
const PATRON_LIMIT = 5;

// ==========================================
// || COPIES                                ||
// ==========================================

export async function getBookByBarcode(
  db: FirebaseFirestore.Firestore,
  barcode: string,
): Promise<{ book: AnyObj | null; copy: AnyObj | null }> {
  const accession = String(barcode || "").trim();
  if (!accession) return { book: null, copy: null };

  const indexSnap = await db.collection("accessions").doc(accession).get();
  if (!indexSnap.exists) return { book: null, copy: null };

  const bookId = String((indexSnap.data() as AnyObj).BookID || "");
  if (!bookId) return { book: null, copy: null };

  const colSnap = await db.collection("collections").doc(bookId).get();
  if (!colSnap.exists) return { book: null, copy: null };

  const collection = colSnap.data() as AnyObj;
  const copies: AnyObj[] = Array.isArray(collection.Copies) ? collection.Copies : [];
  const copy = copies.find((c) => String(c?.Accession || "") === accession) || null;
  if (!copy) return { book: null, copy: null };

  return { book: { id: bookId, ...collection }, copy };
}

export async function searchCopies(
  db: FirebaseFirestore.Firestore,
  term: string,
): Promise<AnyObj[]> {
  const query = String(term || "").trim();
  if (!query) return [];

  const byAccession = await db
    .collection("accessions")
    .orderBy(admin.firestore.FieldPath.documentId())
    .startAt(query)
    .endAt(`${query}${PREFIX_END}`)
    .limit(COPY_LIMIT)
    .get();

  const bookIds = new Set<string>();
  for (const doc of byAccession.docs) {
    const id = String((doc.data() as AnyObj).BookID || "");
    if (id) bookIds.add(id);
  }

  if (byAccession.size < COPY_LIMIT) {
    try {
      const titles = await rankedCollectionIds(query);
      for (const id of (titles.ids || []).slice(0, 10)) bookIds.add(String(id));
    } catch (error) {
      console.error("Title search failed during copy lookup:", error);
    }
  }

  if (bookIds.size === 0) return [];

  const snaps = await db.getAll(
    ...[...bookIds].map((id) => db.collection("collections").doc(id)),
  );

  const matchedAccessions = new Set(byAccession.docs.map((d) => d.id));
  const out: AnyObj[] = [];

  for (const snap of snaps) {
    if (!snap.exists) continue;
    const collection = snap.data() as AnyObj;
    const book = { id: snap.id, ...collection };
    const copies: AnyObj[] = Array.isArray(collection.Copies) ? collection.Copies : [];
    const titleMatched = String(collection.CollectionTitle || "")
      .toLowerCase()
      .includes(query.toLowerCase());

    copies.forEach((copy, index) => {
      const accession = String(copy?.Accession || "");
      if (titleMatched || matchedAccessions.has(accession)) {
        out.push({ book, copy, copyIndex: index + 1 });
      }
    });
  }

  return out.slice(0, 50);
}

export async function searchCollections(
  db: FirebaseFirestore.Firestore,
  term: string,
): Promise<AnyObj[]> {
  const query = String(term || "").trim();
  if (!query) return [];

  const result = await rankedCollectionIds(query);
  const ids = (result.ids || []).slice(0, 20).map(String);
  if (!ids.length) return [];

  const snaps = await db.getAll(
    ...ids.map((id) => db.collection("collections").doc(id)),
  );
  return snaps
    .filter((snap) => snap.exists)
    .map((snap) => ({ id: snap.id, ...(snap.data() as AnyObj) }));
}

// ==========================================
// || PATRONS                               ||
// ==========================================

export async function searchPatrons(
  db: FirebaseFirestore.Firestore,
  term: string,
): Promise<AnyObj[]> {
  const query = String(term || "").trim();
  if (!query) return [];
  const lower = query.toLowerCase();

  const prefixQuery = (field: string, from: string) =>
    db
      .collection("patrons")
      .orderBy(field)
      .startAt(from)
      .endAt(`${from}${PREFIX_END}`)
      .limit(PATRON_LIMIT)
      .get();

  const [byPublicUID, byUID, byEmail, byName] = await Promise.all([
    prefixQuery("PublicUID", query),
    prefixQuery("UID", query),
    prefixQuery("Email", lower),
    prefixQuery("NameLower", lower),
  ]);

  const seen = new Map<string, AnyObj>();
  for (const snap of [byPublicUID, byUID, byEmail, byName]) {
    for (const doc of snap.docs) {
      if (seen.has(doc.id)) continue;
      seen.set(doc.id, { id: doc.id, ...(doc.data() as AnyObj) });
    }
  }

  return [...seen.values()].slice(0, PATRON_LIMIT);
}

export function nameLower(patron: AnyObj): string {
  return `${String(patron.FirstName || "")} ${String(patron.LastName || "")}`
    .trim()
    .toLowerCase();
}
