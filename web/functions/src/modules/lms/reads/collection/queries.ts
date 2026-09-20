import { toMillis } from "../../../../core/time";
import { pagedFromQuery } from "../../../../core/pagination";
import { db } from "../../../../core/firebase";
import { CollectionCard, CollectionDataPaginatedRequest, CollectionDataPaginatedResponse, CollectionRecord, CollectionFilters, CollectionSort, RelatedCollectionsResponse, getCollectionSortDirection, getCollectionSortField } from "../fetching-types";
import { TABLE_FIELDS, mapCollection, mapCollectionCard, mapCollectionForTable, text } from "./mappers";
import { buildQuery, createdRange, hasResidualFilters, passesResidualFilters } from "./filters";


export async function getCollectionCount(
  filters?: CollectionFilters,
): Promise<number> {
  const snapshot = await buildQuery(filters).count().get();
  return snapshot.data().count;
}


export async function fetchCollectionById(
  collectionId: string,
): Promise<CollectionRecord | null> {
  if (!collectionId) return null;
  const doc = await db
    .collection("collections")
    .doc(collectionId)
    .get();
  return doc.exists ? mapCollection(doc) : null;
}


export const RELEVANCE_SORT = "Relevance";


function isRelevanceSort(sortBy?: CollectionSort): boolean {
  return sortBy?.column === RELEVANCE_SORT;
}


async function fetchCollectionsByIds(
  ids: string[],
  limit: number,
  page: number,
  filters?: CollectionFilters,
  sortBy?: CollectionSort,
): Promise<CollectionDataPaginatedResponse> {
  const refs = ids.map((id) => db.collection("collections").doc(id));
  const snaps = await db.getAll(...refs, { fieldMask: [...TABLE_FIELDS] });

  const matching = snaps.filter((doc) => {
    if (!doc.exists) return false;
    if (filters?.status && filters.status !== "All") {
      if (text(doc.get("Status")) !== filters.status) return false;
    }
    if (
      filters?.classCodes?.length &&
      !filters.classCodes.includes(text(doc.get("ClassCode")))
    ) {
      return false;
    }
    if (
      filters?.materialTypes?.length &&
      !filters.materialTypes.includes(text(doc.get("MaterialType")))
    ) {
      return false;
    }
    const { start, end } = createdRange(filters);
    const createdOn = toMillis(doc.get("CreatedOn"));
    if (start && (createdOn === null || createdOn < start.getTime())) return false;
    if (end && (createdOn === null || createdOn >= end.getTime())) return false;
    return passesResidualFilters(doc, filters);
  });

  const documents = matching.map(mapCollectionForTable);

  if (isRelevanceSort(sortBy)) {
    const rank = new Map(ids.map((id, index) => [id, index]));
    documents.sort(
      (a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity),
    );
  } else {
    const sortField = sortBy?.column
      ? getCollectionSortField(sortBy.column)
      : "CreatedOn";
    const descending =
      getCollectionSortDirection(sortBy?.direction ?? "asc") === "desc";

    documents.sort((a, b) => {
      const order =
        sortField === "CreatedOn" || sortField === "ModifiedOn"
          ? (a[sortField] ?? 0) - (b[sortField] ?? 0)
          : String(
            a[sortField as "CollectionTitle" | "MainAuthor"],
          ).localeCompare(
            String(b[sortField as "CollectionTitle" | "MainAuthor"]),
          );
      return descending ? -order : order;
    });
  }

  const safeLimit = Math.max(1, limit);
  const total = documents.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * safeLimit;

  return {
    data: documents.slice(from, from + safeLimit),
    page: safePage,
    totalPages,
    hasMore: safePage < totalPages,
    total,
  };
}


const RESIDUAL_SCAN_LIMIT = 5000;


async function pageWithResidualFilters(
  query: FirebaseFirestore.Query,
  limit: number,
  page: number,
  filters?: CollectionFilters,
): Promise<CollectionDataPaginatedResponse> {
  const snapshot = await query.limit(RESIDUAL_SCAN_LIMIT).get();
  const matching = snapshot.docs.filter((doc) =>
    passesResidualFilters(doc, filters),
  );

  const safeLimit = Math.max(1, limit);
  const total = matching.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * safeLimit;

  return {
    data: matching.slice(from, from + safeLimit).map(mapCollectionForTable),
    page: safePage,
    totalPages,
    hasMore: safePage < totalPages,
    total,
  };
}


async function stepFromAnchor(
  query: FirebaseFirestore.Query,
  anchorId: string,
  limit: number,
  exclusive: boolean,
): Promise<FirebaseFirestore.QuerySnapshot | null> {
  try {
    const anchor = await db
      .collection("collections")
      .doc(anchorId)
      .get();
    if (!anchor.exists) return null;

    const positioned = exclusive
      ? query.startAfter(anchor)
      : query.startAt(anchor);
    return await positioned.limit(limit).get();
  } catch (error) {
    console.error(`Cursor step from ${anchorId} failed, using offset:`, error);
    return null;
  }
}


export async function fetchCollectionDataPaginated(
  params: CollectionDataPaginatedRequest,
): Promise<CollectionDataPaginatedResponse> {
  const { limit, page = 1, filters, sortBy, ids, after, at } = params;

  if (ids && ids.length > 0) {
    return await fetchCollectionsByIds(ids, limit, page, filters, sortBy);
  }

  let query = buildQuery(filters).select(...TABLE_FIELDS);

  const requestedField = sortBy?.column
    ? getCollectionSortField(sortBy.column)
    : "CreatedOn";
  const sortDirection = sortBy?.direction
    ? getCollectionSortDirection(sortBy.direction)
    : "asc";

  const { start, end } = createdRange(filters);
  const sortField = start || end ? "CreatedOn" : requestedField;
  query = query.orderBy(sortField, sortDirection);

  if (hasResidualFilters(filters)) {
    return await pageWithResidualFilters(query, limit, page, filters);
  }

  const total = await getCollectionCount(filters);
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const anchorId = after || at;
  let snapshot = anchorId
    ? await stepFromAnchor(query, anchorId, limit, Boolean(after))
    : null;

  if (!snapshot) {
    let fallback = query;
    if (safePage > 1) fallback = fallback.offset((safePage - 1) * limit);
    snapshot = await fallback.limit(limit).get();
  }

  const documents = snapshot.docs.map(mapCollectionForTable);

  return pagedFromQuery(documents, limit, safePage, total);
}


export async function fetchCollectionCards(
  limit: number = 12,
): Promise<CollectionCard[]> {
  const snap = await db
    .collection("collections")
    .orderBy("CollectionTitle")
    .limit(limit)
    .get();
  return snap.docs.map(mapCollectionCard);
}


export async function fetchCollectionsByClassCode(
  classCode: string,
  limit: number = 4,
): Promise<CollectionCard[]> {
  const snap = await db
    .collection("collections")
    .where("ClassCode", "==", classCode)
    .limit(limit)
    .get();
  return snap.docs.map(mapCollectionCard);
}


export async function fetchRelatedCollections(
  author: string,
  publisher: string,
  excludeId: string,
): Promise<RelatedCollectionsResponse> {
  const collections = db.collection("collections");

  const [authorSnap, publisherSnap] = await Promise.all([
    author
      ? collections.where("MainAuthor", "==", author).limit(20).get()
      : null,
    publisher
      ? collections.where("Publisher", "==", publisher).limit(20).get()
      : null,
  ]);

  const exclude = (docs?: FirebaseFirestore.QuerySnapshot): CollectionCard[] =>
    (docs?.docs || [])
      .filter((doc) => doc.id !== excludeId)
      .map(mapCollectionCard);

  return {
    relatedByAuthor: exclude(authorSnap ?? undefined),
    relatedByPublisher: exclude(publisherSnap ?? undefined),
  };
}
