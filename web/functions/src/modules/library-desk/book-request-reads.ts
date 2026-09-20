import { SUGGESTIONS_COLLECTION } from "../circulation/circulation-policy";
import { toMillis } from "./desk-common";
import {
  identityKeyOf,
  identityOf,
  type SuggestionIdentity,
} from "./book-request-matching";
import {
  isBookRequestStatus,
  type BookRequestGroup,
  type BookRequestStatus,
} from "./book-request-types";
import { db } from "../../core/firebase";
import { str } from "../../core/coerce";

type DocData = Record<string, unknown>;

export interface LoadedBookRequest {
  id: string;
  title: string;
  author: string;
  requestedBy: string;
  status: BookRequestStatus;
  createdOn: number | null;
  identity: SuggestionIdentity;
  key: string;
  isbns: string[];
  isbn13: string | null;
  image: string | null;
  infoLink: string | null;
}


export async function loadBookRequests(
  db: FirebaseFirestore.Firestore,
): Promise<LoadedBookRequest[]> {
  const snap = await db.collection(SUGGESTIONS_COLLECTION).get();
  const rows: LoadedBookRequest[] = [];

  for (const doc of snap.docs) {
    const data = doc.data() as DocData;
    const title = str(data.Title ?? data.title);
    if (!title) continue;

    const author = str(data.Author ?? data.author);
    const isbn10 = str(data.ISBN10 ?? data.isbn10);
    const isbn13 = str(data.ISBN13 ?? data.isbn13);
    const identity = identityOf({ title, author, isbn10, isbn13 });
    const rawStatus = data.Status;

    rows.push({
      id: doc.id,
      title,
      author,
      requestedBy: str(data.RequestedBy) || doc.id,
      status: isBookRequestStatus(rawStatus) ? rawStatus : "Under Review",
      createdOn: toMillis(data.CreatedOn),
      identity,
      key: identityKeyOf({ title, author }),
      isbns: Array.isArray(data.ISBNs)
        ? (data.ISBNs as unknown[]).map(str).filter(Boolean)
        : Array.from(identity.isbns),
      isbn13: isbn13 || null,
      image: str(data.GoogleBookImage) || null,
      infoLink: str(data.GoogleBookInfoLink) || null,
    });
  }

  return rows;
}

function makeUnionFind(size: number) {
  const parent = Array.from({ length: size }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  return { find, union };
}

const EMPTY_TALLY = (): Record<BookRequestStatus, number> => ({
  "Under Review": 0,
  Approved: 0,
  Declined: 0,
});

export function groupByIdentity(
  rows: LoadedBookRequest[],
): BookRequestGroup[] {
  const { find, union } = makeUnionFind(rows.length);

  const byKey = new Map<string, number>();
  const byIsbn = new Map<string, number>();
  const byTitle = new Map<string, number[]>();

  rows.forEach((row, index) => {
    const seenKey = byKey.get(row.key);
    if (seenKey === undefined) byKey.set(row.key, index);
    else union(seenKey, index);

    for (const isbn of row.isbns) {
      const seenIsbn = byIsbn.get(isbn);
      if (seenIsbn === undefined) byIsbn.set(isbn, index);
      else union(seenIsbn, index);
    }

    const bucket = byTitle.get(row.identity.title);
    if (bucket) bucket.push(index);
    else byTitle.set(row.identity.title, [index]);
  });

  for (const bucket of byTitle.values()) {
    if (bucket.length < 2) continue;
    const anchor = bucket.find((i) => rows[i].identity.author);
    if (anchor === undefined) continue;
    for (const index of bucket) {
      if (!rows[index].identity.author) union(anchor, index);
    }
  }

  const buckets = new Map<number, number[]>();
  rows.forEach((_row, index) => {
    const root = find(index);
    const existing = buckets.get(root);
    if (existing) existing.push(index);
    else buckets.set(root, [index]);
  });

  const groups: BookRequestGroup[] = [];

  for (const indices of buckets.values()) {
    const members = indices.map((i) => rows[i]);
    const requesters = new Set(members.map((m) => m.requestedBy));
    const tally = EMPTY_TALLY();
    for (const member of members) tally[member.status] += 1;

    const byRecency = [...members].sort(
      (a, b) => (b.createdOn ?? 0) - (a.createdOn ?? 0),
    );
    const newest = byRecency.find((member) => member.author) ?? byRecency[0];
    const withCover = members.find((m) => m.image);
    const withLink = members.find((m) => m.infoLink);
    const withIsbn = members.find((m) => m.isbn13);

    const times = members
      .map((m) => m.createdOn)
      .filter((t): t is number => t !== null);

    const status: BookRequestStatus =
      tally.Approved > 0
        ? "Approved"
        : tally.Declined > 0
          ? "Declined"
          : "Under Review";

    groups.push({
      id: members.map((m) => m.key).sort()[0],
      Title: newest.title,
      Author: newest.author,
      RequestIDs: members.map((m) => m.id),
      Count: members.length,
      Requesters: requesters.size,
      FirstRequestedOn: times.length ? Math.min(...times) : null,
      LastRequestedOn: times.length ? Math.max(...times) : null,
      Statuses: tally,
      Status: status,
      Image: withCover?.image ?? null,
      InfoLink: withLink?.infoLink ?? null,
      ISBN13: withIsbn?.isbn13 ?? null,
    });
  }

  return groups.sort(
    (a, b) => b.Count - a.Count || a.Title.localeCompare(b.Title),
  );
}

export async function fetchBookRequests(): Promise<BookRequestGroup[]> {
  return groupByIdentity(await loadBookRequests(db));
}

export async function resolveBookRequestGroup(
  db: FirebaseFirestore.Firestore,
  id: string,
  title: string,
  author: string,
): Promise<BookRequestGroup | null> {
  const groups = groupByIdentity(await loadBookRequests(db));

  const byId = groups.find((group) => group.id === id);
  if (byId) return byId;

  if (!title) return null;
  const wanted = identityKeyOf({ title, author });
  return (
    groups.find(
      (group) => identityKeyOf({ title: group.Title, author: group.Author }) === wanted,
    ) ?? null
  );
}
