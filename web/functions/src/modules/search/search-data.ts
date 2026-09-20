import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import {
  SEARCH_INDEX_META_DOC,
  StoredSearchEntry,
  queryWordsOf,
  readSearchEntry,
  scoreEntry,
} from "./search-index";
import {
  SortedSearchEntry,
  BookSearchResult,
  CollectionSearchIdsResponse,
  GoogleBooksApiResponse,
  GoogleBooksLookupResponse,
  GoogleBooksSearchResponse,
  GoogleBooksVolume,
  GoogleBooksVolumeInfo,
  SearchResponse,
  FirestoreData,
} from "./search-types";
import { db, storage } from "../../core/firebase";

function pageStartIndex(
  entries: Array<{ id: string }>,
  limit: number,
  page?: number,
  startAfterId?: string,
): number {
  if (page && page > 0) return (page - 1) * limit;
  if (startAfterId) {
    const idx = entries.findIndex((entry) => entry.id === startAfterId);
    if (idx !== -1) return idx + 1;
  }
  return 0;
}

let cachedSearchables: StoredSearchEntry[] | null = null;
let searchablesCacheTime = 0;
const SEARCHABLES_TTL = 5 * 60 * 1000;
let cachedIndexVersion = -1;

const sortedSearchCache = new Map<
  string,
  { entries: SortedSearchEntry[]; timestamp: number }
>();
const SORTED_CACHE_TTL = 5 * 60 * 1000;

async function indexVersionChanged(): Promise<boolean> {
  try {
    const snap = await db
      .collection("metadata")
      .doc(SEARCH_INDEX_META_DOC)
      .get();
    const version = Number((snap.data() as { version?: number })?.version);
    if (!Number.isFinite(version)) return false;
    if (version === cachedIndexVersion) return false;
    cachedIndexVersion = version;
    return true;
  } catch (error) {
    console.warn("Could not read search index version", error);
    return false;
  }
}

function invalidateSearchCaches(): void {
  cachedSearchables = null;
  searchablesCacheTime = 0;
  sortedSearchCache.clear();
}

async function getSearchablesData(): Promise<StoredSearchEntry[]> {
  const fresh =
    cachedSearchables && Date.now() - searchablesCacheTime < SEARCHABLES_TTL;

  if (fresh && !(await indexVersionChanged())) {
    return cachedSearchables as StoredSearchEntry[];
  }
  if (!fresh) invalidateSearchCaches();

  try {
    const snap = await db.collection("searches").get();

    if (snap.empty) {
      console.warn(
        '⚠️ No search entries found in "searches" collection, trying fallback...',
      );
      return await getSearchablesFromStorage();
    }

    const searchables: StoredSearchEntry[] = [];
    snap.forEach((doc) => {
      const entry = readSearchEntry(doc.id, doc.data() as FirestoreData);
      if (entry) searchables.push(entry);
    });

    if (searchables.length === 0) {
      console.warn('⚠️ "searches" collection is empty, trying fallback...');
      return await getSearchablesFromStorage();
    }

    cachedSearchables = searchables;
    searchablesCacheTime = Date.now();
    sortedSearchCache.clear();

    const legacy = searchables.filter((entry) => entry.v < 2).length;
    console.log(
      `✅ Searchables loaded from Firestore "searches": ${searchables.length} entries` +
        (legacy > 0
          ? ` (${legacy} still on the old shape — run the search index rebuild)`
          : ""),
    );
    return cachedSearchables;
  } catch (error) {
    console.error('❌ Failed to load from Firestore "searches":', error);
    return await getSearchablesFromStorage();
  }
}

async function getSearchablesFromStorage(): Promise<StoredSearchEntry[]> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file("collections/Searchables.json");
    const [exists] = await file.exists();

    if (!exists) {
      console.warn("⚠️ Searchables.json not found in Storage");
      return [];
    }

    const [content] = await file.download();
    const searchables = JSON.parse(content.toString()) as unknown[];

    if (!Array.isArray(searchables) || searchables.length === 0) {
      console.warn("⚠️ Searchables.json is empty or invalid");
      return [];
    }

    const validated: StoredSearchEntry[] = [];
    for (const item of searchables) {
      if (typeof item !== "object" || item === null) continue;
      const record = item as FirestoreData;
      const id = typeof record.id === "string" ? record.id : "";
      if (!id) continue;
      const entry = readSearchEntry(id, record);
      if (entry) validated.push(entry);
    }

    cachedSearchables = validated;
    searchablesCacheTime = Date.now();
    sortedSearchCache.clear();

    console.log(
      `✅ Searchables loaded from Storage (fallback): ${validated.length} entries`,
    );
    return cachedSearchables;
  } catch (error) {
    console.error("❌ Failed to load Searchables from Storage:", error);
    return [];
  }
}

async function getScoredCollectionEntries(
  trimmedTerm: string,
): Promise<SortedSearchEntry[]> {
  const sortedKey = `sorted_${trimmedTerm}`;
  const cachedSorted = sortedSearchCache.get(sortedKey);

  if (cachedSorted && Date.now() - cachedSorted.timestamp < SORTED_CACHE_TTL) {
    console.log(
      `✅ [Server Cache] Sorted entries HIT for "${trimmedTerm}" (${cachedSorted.entries.length} items)`,
    );
    return cachedSorted.entries;
  }

  console.log(
    `🔄 [Server Cache] Sorted entries MISS for "${trimmedTerm}", computing...`,
  );

  const searchables = await getSearchablesData();
  if (!searchables || searchables.length === 0) return [];

  const queryWords = queryWordsOf(trimmedTerm);
  const scored = searchables
    .map((item) => ({ id: item.id, score: scoreEntry(item, queryWords) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));

  sortedSearchCache.set(sortedKey, { entries: scored, timestamp: Date.now() });
  console.log(
    `✅ [Server Cache] Cached sorted entries for "${trimmedTerm}" (${scored.length} items)`,
  );
  return scored;
}

const MAX_RANKED_IDS = 500;

export async function searchCollections(
  searchTerm: string,
): Promise<CollectionSearchIdsResponse> {
  const trimmedTerm = searchTerm.trim().toLowerCase();

  if (!trimmedTerm) {
    return { ids: [], total: 0, hasMore: false, nextStartAfterId: null };
  }

  const sortedEntries = await getScoredCollectionEntries(trimmedTerm);
  if (sortedEntries.length === 0) {
    return { ids: [], total: 0, hasMore: false, nextStartAfterId: null };
  }

  const ranked = sortedEntries.slice(0, MAX_RANKED_IDS);

  return {
    ids: ranked.map((entry) => entry.id),
    total: sortedEntries.length,
    hasMore: sortedEntries.length > ranked.length,
    nextStartAfterId: null,
  };
}

export async function searchCollectionsViaSearchables(
  searchTerm: string,
  limit: number = 7,
  startAfterId?: string,
): Promise<SearchResponse> {
  const trimmedTerm = searchTerm.trim().toLowerCase();
  const safeLimit = Math.min(limit, 7);

  if (!trimmedTerm) {
    return { results: [], total: 0, hasMore: false, nextStartAfterId: null };
  }

  const sortedEntries = await getScoredCollectionEntries(trimmedTerm);

  if (sortedEntries.length === 0) {
    return { results: [], total: 0, hasMore: false, nextStartAfterId: null };
  }

  let startIndex = 0;
  if (startAfterId) {
    const idx = sortedEntries.findIndex((e) => e.id === startAfterId);
    if (idx !== -1) startIndex = idx + 1;
  }

  const paginated = sortedEntries.slice(startIndex, startIndex + safeLimit);
  const hasMore = startIndex + safeLimit < sortedEntries.length;
  const nextStartAfterId =
    paginated.length > 0 ? paginated[paginated.length - 1].id : null;

  const fetchedDocs = await Promise.all(
    paginated.map(async (entry) => {
      const doc = await db.collection("collections").doc(entry.id).get();
      if (!doc.exists) return null;
      const data = doc.data() as FirestoreData;
      return {
        id: doc.id,
        CollectionTitle: data.CollectionTitle || "",
        MainAuthor: data.MainAuthor || "",
        CollectionImage: data.CollectionImage || "",
        Subjects: Array.isArray(data.Subjects) ? data.Subjects.map(String) : [],
        SecondTitle: data.SecondTitle || "",
        Edition: data.Edition || "",
        Volume: data.Volume || "",
        CallNumber: data.CallNumber || "",
        Publisher: data.Publisher || "",
        CopyrightYear: data.CopyrightYear || "",
        ISBN10: data.ISBN10 || "",
        ISBN13: data.ISBN13 || "",
        UID: data.UID || "",
        Status: data.Status || "",
      };
    }),
  );

  const results = fetchedDocs.filter(
    (doc): doc is BookSearchResult => doc !== null,
  );

  return {
    results,
    total: sortedEntries.length,
    hasMore,
    nextStartAfterId,
  };
}

// ==========================================
// || Google Books ISBN lookup             ||
// ==========================================

const GOOGLE_BOOKS_ENDPOINT = "https://www.googleapis.com/books/v1/volumes";
const ISBN_CACHE_TTL = 24 * 60 * 60 * 1000;
const GOOGLE_BOOKS_TIMEOUT = 10_000;

const googleBooksApiKey = defineSecret("GOOGLE_BOOKS_API_KEY");

function readGoogleBooksKey(): string {
  try {
    return googleBooksApiKey.value() || "";
  } catch {
    return process.env.GOOGLE_BOOKS_API_KEY || "";
  }
}
const isbnCache = new Map<
  string,
  { response: GoogleBooksLookupResponse; timestamp: number }
>();

function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += (10 - i) * Number(isbn[i]);
  sum += isbn[9] === "X" ? 10 : Number(isbn[9]);
  return sum % 11 === 0;
}

function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10 === Number(isbn[12]);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function mapVolume(
  info: GoogleBooksVolumeInfo,
  volumeId = "",
): GoogleBooksVolume {
  const identifiers = Array.isArray(info.industryIdentifiers)
    ? info.industryIdentifiers
    : [];
  const identifierOf = (type: string): string =>
    String(
      identifiers.find((entry) => entry?.type === type)?.identifier || "",
    );

  const publishedDate = String(info.publishedDate || "");
  const year = /\d{4}/.exec(publishedDate);

  const thumbnail = String(
    info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "",
  ).replace(/^http:\/\//, "https://");

  return {
    id: volumeId,
    title: String(info.title || ""),
    subtitle: String(info.subtitle || ""),
    authors: stringArray(info.authors),
    publisher: String(info.publisher || ""),
    publishedDate,
    publicationYear: year ? year[0] : "",
    description: String(info.description || ""),
    pageCount: info.pageCount ? String(info.pageCount) : "",
    categories: stringArray(info.categories),
    isbn10: identifierOf("ISBN_10"),
    isbn13: identifierOf("ISBN_13"),
    thumbnail,
    infoLink: String(info.infoLink || "").replace(/^http:\/\//, "https://"),
  };
}

export async function searchGoogleBooksByIsbn(
  rawIsbn: string,
): Promise<GoogleBooksLookupResponse> {
  const isbn = normalizeIsbn(String(rawIsbn || ""));

  if (!isValidIsbn10(isbn) && !isValidIsbn13(isbn)) {
    return { status: "invalid", isbn, volume: null };
  }

  const cached = isbnCache.get(isbn);
  if (cached && Date.now() - cached.timestamp < ISBN_CACHE_TTL) {
    console.log(`✅ [Google Books] Cache HIT for ${isbn}`);
    return cached.response;
  }

  let payload: GoogleBooksApiResponse;
  try {
    payload = await requestGoogleBooks(`isbn:${isbn}`, 1);
  } catch (error) {
    console.error("❌ [Google Books] Lookup failed:", error);
    throw new functions.https.HttpsError(
      "unavailable",
      error instanceof Error && error.message
        ? error.message
        : "Could not reach Google Books. Try again in a moment.",
    );
  }

  const item = payload.items?.[0];
  const info = item?.volumeInfo;
  const response: GoogleBooksLookupResponse = info
    ? { status: "found", isbn, volume: mapVolume(info, String(item?.id || "")) }
    : { status: "not-found", isbn, volume: null };

  if (response.status === "found") {
    isbnCache.set(isbn, { response, timestamp: Date.now() });
  }
  console.log(`✅ [Google Books] ${response.status} for ${isbn}`);
  return response;
}

const TITLE_SEARCH_RESULTS = 10;
const TITLE_CACHE_TTL = 2 * 60 * 1000;
const titleCache = new Map<
  string,
  { response: GoogleBooksSearchResponse; timestamp: number }
>();

export async function searchGoogleBooksByTitle(
  rawQuery: string,
): Promise<GoogleBooksSearchResponse> {
  const query = String(rawQuery || "").trim().replace(/\s+/g, " ");

  if (query.length < 2) {
    return { status: "invalid", query, results: [] };
  }

  const key = query.toLowerCase();
  const cached = titleCache.get(key);
  if (cached && Date.now() - cached.timestamp < TITLE_CACHE_TTL) {
    console.log(`✅ [Google Books] Title cache HIT for "${query}"`);
    return cached.response;
  }

  let payload: GoogleBooksApiResponse;
  try {
    payload = await requestGoogleBooks(query, TITLE_SEARCH_RESULTS);
  } catch (error) {
    console.error("❌ [Google Books] Title search failed:", error);
    throw new functions.https.HttpsError(
      "unavailable",
      error instanceof Error && error.message
        ? error.message
        : "Could not reach Google Books. Try again in a moment.",
    );
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const results: GoogleBooksVolume[] = [];
  for (const item of items) {
    const info = item?.volumeInfo;
    if (!info) continue;
    const volume = mapVolume(info, String(item?.id || ""));
    if (volume.title) results.push(volume);
  }

  const response: GoogleBooksSearchResponse = {
    status: results.length > 0 ? "found" : "not-found",
    query,
    results,
  };

  if (response.status === "found") {
    titleCache.set(key, { response, timestamp: Date.now() });
  }
  console.log(
    `✅ [Google Books] ${response.status} — ${results.length} for "${query}"`,
  );
  return response;
}

function googleBooksUrl(
  query: string,
  maxResults: number,
  apiKey: string,
): string {
  const url = new URL(GOOGLE_BOOKS_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("country", "PH");
  if (apiKey) url.searchParams.set("key", apiKey);
  return url.toString();
}

async function callGoogleBooks(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_BOOKS_TIMEOUT);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requestGoogleBooks(
  query: string,
  maxResults: number,
): Promise<GoogleBooksApiResponse> {
  const apiKey = readGoogleBooksKey();
  if (!apiKey) {
    console.warn(
      "⚠️ [Google Books] No API key bound — requests are rate limited by IP.",
    );
  }

  let request = await callGoogleBooks(
    googleBooksUrl(query, maxResults, apiKey),
  );

  if (!request.ok && apiKey && (request.status === 400 || request.status === 403)) {
    const detail = await request.text().catch(() => "");
    console.error(
      `❌ [Google Books] Key rejected (${request.status}): ${detail.slice(0, 300)}`,
    );
    request = await callGoogleBooks(googleBooksUrl(query, maxResults, ""));
  }

  if (!request.ok) {
    const detail = await request.text().catch(() => "");
    console.error(
      `❌ [Google Books] HTTP ${request.status}: ${detail.slice(0, 300)}`,
    );
    if (request.status === 429) {
      throw new Error("Google Books is rate limiting us. Try again shortly.");
    }
    throw new Error(`Google Books responded ${request.status}.`);
  }

  return (await request.json()) as GoogleBooksApiResponse;
}

export async function searchPatrons(
  searchTerm: string,
  limit: number = 10,
  startAfterId?: string,
  page?: number,
): Promise<{
  ids: string[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
}> {
  const trimmedTerm = searchTerm.trim().toLowerCase();
  const safeLimit = Math.min(limit, 100);

  if (!trimmedTerm) {
    return { ids: [], total: 0, hasMore: false, nextStartAfterId: null };
  }


  let query = db.collection("patrons").limit(safeLimit);

  const snapshot = await query.get();

  const results: Array<{ id: string; score: number }> = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const searchableFields = [
      data.PublicUID,
      data.UID,
      data.FirstName,
      data.MiddleName,
      data.LastName,
      data.Suffix,
      data.Email,
      data.Barangay,
      data.SchoolWork,
      data.City,
    ];

    let score = 0;
    for (const field of searchableFields) {
      if (field && typeof field === "string") {
        const lower = field.toLowerCase();
        if (lower === trimmedTerm) {
          score = 1.5;
          break;
        }
        if (lower.startsWith(trimmedTerm)) {
          score = Math.max(score, 1.3);
        }
        if (lower.includes(trimmedTerm)) {
          score = Math.max(score, 1.0);
        }
        const words = lower.split(/\s+/);
        for (const word of words) {
          if (word === trimmedTerm) {
            score = Math.max(score, 1.2);
          }
          if (word.startsWith(trimmedTerm)) {
            score = Math.max(score, 1.0);
          }
          if (word.includes(trimmedTerm) && word.length >= 3) {
            score = Math.max(score, 0.8);
          }
        }
      }
    }

    if (score > 0) {
      results.push({ id: doc.id, score });
    }
  });

  results.sort((a, b) => b.score - a.score);

  const startIndex = pageStartIndex(results, safeLimit, page, startAfterId);

  const paginated = results.slice(startIndex, startIndex + safeLimit);
  const hasMore = startIndex + safeLimit < results.length;
  const nextStartAfterId =
    paginated.length > 0 ? paginated[paginated.length - 1].id : null;

  return {
    ids: paginated.map((r) => r.id),
    total: results.length,
    hasMore,
    nextStartAfterId,
  };
}

export async function searchStaffs(
  searchTerm: string,
  limit: number = 10,
  startAfterId?: string,
  page?: number,
): Promise<{
  ids: string[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
}> {
  const trimmedTerm = searchTerm.trim().toLowerCase();
  const safeLimit = Math.min(limit, 100);

  if (!trimmedTerm) {
    return { ids: [], total: 0, hasMore: false, nextStartAfterId: null };
  }


  let query = db.collection("staffs").limit(safeLimit);

  const snapshot = await query.get();

  const results: Array<{ id: string; score: number }> = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const searchableFields = [
      data.StaffCode,
      data.FirstName,
      data.MiddleName,
      data.LastName,
      data.Suffix,
      data.Email,
      data.JobTitle,
      data.Position,
    ];

    let score = 0;
    for (const field of searchableFields) {
      if (field && typeof field === "string") {
        const lower = field.toLowerCase();
        if (lower === trimmedTerm) {
          score = 1.5;
          break;
        }
        if (lower.startsWith(trimmedTerm)) {
          score = Math.max(score, 1.3);
        }
        if (lower.includes(trimmedTerm)) {
          score = Math.max(score, 1.0);
        }
        const words = lower.split(/\s+/);
        for (const word of words) {
          if (word === trimmedTerm) {
            score = Math.max(score, 1.2);
          }
          if (word.startsWith(trimmedTerm)) {
            score = Math.max(score, 1.0);
          }
          if (word.includes(trimmedTerm) && word.length >= 3) {
            score = Math.max(score, 0.8);
          }
        }
      }
    }

    if (score > 0) {
      results.push({ id: doc.id, score });
    }
  });

  results.sort((a, b) => b.score - a.score);

  const startIndex = pageStartIndex(results, safeLimit, page, startAfterId);

  const paginated = results.slice(startIndex, startIndex + safeLimit);
  const hasMore = startIndex + safeLimit < results.length;
  const nextStartAfterId =
    paginated.length > 0 ? paginated[paginated.length - 1].id : null;

  return {
    ids: paginated.map((r) => r.id),
    total: results.length,
    hasMore,
    nextStartAfterId,
  };
}

export const searchDataAttempt = onCall(
  {
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: [googleBooksApiKey],
  },
  async (request) => {
    const data = request.data as {
      case?: string;
      searchTerm?: string;
      limit?: number;
      startAfterId?: string;
      page?: number;
    };

    if (!data) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing request data",
      );
    }

    const which: string | undefined = data?.case;

    if (!which) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing case parameter",
      );
    }

    try {
      switch (which) {
        case "searchCollectionsViaSearchables": {
          const searchTerm = String(data?.searchTerm || "").trim();
          const limit = Math.min(Number(data?.limit) || 7, 7);
          const startAfterId = data?.startAfterId as string | undefined;

          return await searchCollectionsViaSearchables(
            searchTerm,
            limit,
            startAfterId,
          );
        }

        case "searchGoogleBooks": {
          return await searchGoogleBooksByIsbn(String(data?.searchTerm || ""));
        }

        case "searchGoogleBooksByTitle": {
          return await searchGoogleBooksByTitle(String(data?.searchTerm || ""));
        }

        case "searchCollections":
          return await searchCollections(String(data?.searchTerm || "").trim());

        case "searchPatrons": {
          const searchTerm = String(data?.searchTerm || "").trim();
          const limit = Math.min(Number(data?.limit) || 10, 100);
          const startAfterId = data?.startAfterId as string | undefined;
          const page = data?.page ? Math.max(1, Number(data.page)) : undefined;

          return await searchPatrons(searchTerm, limit, startAfterId, page);
        }

        case "searchStaffs": {
          const searchTerm = String(data?.searchTerm || "").trim();
          const limit = Math.min(Number(data?.limit) || 10, 100);
          const startAfterId = data?.startAfterId as string | undefined;
          const page = data?.page ? Math.max(1, Number(data.page)) : undefined;

          return await searchStaffs(searchTerm, limit, startAfterId, page);
        }

        default:
          throw new functions.https.HttpsError(
            "invalid-argument",
            `Unknown case: ${which}`,
          );
      }
    } catch (error) {
      console.error(`Error in searchDataAttempt case ${which}:`, error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error instanceof Error ? error.message : "Search failed",
      );
    }
  },
);
