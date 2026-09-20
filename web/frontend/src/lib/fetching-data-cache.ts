import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

type CacheEntry = {
  timestamp: number;
  data: any;
  ttl: number;
};

const LOGS_CACHE = {
  ttl: 30 * 60 * 1000,
  staleWhileRevalidate: false,
  functionName: "fetchingDataAttempt",
};

const CACHE_CONFIG: Record<
  string,
  { ttl: number; staleWhileRevalidate: boolean; functionName?: string }
> = {
  fetchBooksCollection: { ttl: 5 * 60 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  fetchClassCodeMaterialTypes: { ttl: 60 * 60 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  fetchLibraryLocations: { ttl: 60 * 60 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  fetchSections: { ttl: 60 * 60 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },

  loggedInProfile: { ttl: 0, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },

  patronById: { ttl: 0, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },
  patronDataPaginated: { ttl: 15 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  getUnverifiedCount: { ttl: 30 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  patronLogs: LOGS_CACHE,
  unverifiedPatrons: { ttl: 30 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },

  staffById: { ttl: 0, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },
  staffDataPaginated: { ttl: 30 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  staffLogs: LOGS_CACHE,

  searchDataAttempt: { ttl: 5 * 60 * 1000, staleWhileRevalidate: true, functionName: "searchDataAttempt" },
  searchPatrons: { ttl: 5 * 60 * 1000, staleWhileRevalidate: true, functionName: "searchDataAttempt" },
  searchStaffs: { ttl: 5 * 60 * 1000, staleWhileRevalidate: true, functionName: "searchDataAttempt" },
  searchCollections: { ttl: 5 * 60 * 1000, staleWhileRevalidate: true, functionName: "searchDataAttempt" },
  searchGoogleBooks: { ttl: 30 * 1000, staleWhileRevalidate: false, functionName: "searchDataAttempt" },
  searchGoogleBooksByTitle: { ttl: 60 * 1000, staleWhileRevalidate: false, functionName: "searchDataAttempt" },

  collectionById: { ttl: 0, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },
  collectionLogs: LOGS_CACHE,
  collectionDataPaginated: { ttl: 15 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },

  circulationDataPaginated: { ttl: 15 * 1000, staleWhileRevalidate: false, functionName: "circulationRecordAttempt" },
  dashboardSummary: { ttl: 60 * 1000, staleWhileRevalidate: true, functionName: "circulationRecordAttempt" },
  listBorrowedBooks: { ttl: 0, staleWhileRevalidate: false, functionName: "circulationRecordAttempt" },
  patronSlotUsage: { ttl: 0, staleWhileRevalidate: false, functionName: "circulationRecordAttempt" },

  suggestionQuota: { ttl: 60 * 1000, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },

  libraryCalendar: { ttl: 5 * 60 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },

  fetchAnnouncementData: { ttl: 60 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  fetchNewsData: { ttl: 60 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  updatesDataPaginated: { ttl: 15 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  updateById: { ttl: 0, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },

  chatsDataPaginated: { ttl: 5 * 1000, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },
  fetchChatById: { ttl: 0, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },
  fetchChatsBadgeCount: { ttl: 15 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
  fetchBookRequests: { ttl: 60 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },

  reportSummary: { ttl: 60 * 1000, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },
  reportYears: { ttl: 60 * 60 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },


  checkPatronVerificationStatus: { ttl: 0, staleWhileRevalidate: false, functionName: "fetchingDataAttempt" },

  default: { ttl: 30 * 1000, staleWhileRevalidate: true, functionName: "fetchingDataAttempt" },
};

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<any>>();
const staleCache = new Map<string, CacheEntry>();

function stableSerialize(value: any): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) {
    return "[" + value.map(stableSerialize).join(",") + "]";
  }
  try {
    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys
        .map((k) => JSON.stringify(k) + ":" + stableSerialize(value[k]))
        .join(",") +
      "}"
    );
  } catch {
    return String(value);
  }
}

function getCacheConfig(caseName: string) {
  return CACHE_CONFIG[caseName] || CACHE_CONFIG.default;
}

export async function cachedFetch<T = any>(
  caseName: string,
  payload: any = {},
  opts?: { force?: boolean; ttlMs?: number; cacheKey?: string },
): Promise<T> {
  const key = opts?.cacheKey ?? caseName + "::" + stableSerialize(payload || {});
  const config = getCacheConfig(caseName);
  const ttl = opts?.ttlMs ?? config.ttl;

  if (!opts?.force) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }

    if (config.staleWhileRevalidate) {
      const stale = staleCache.get(key) || cache.get(key);
      if (stale) {
        setTimeout(() => {
          fetchAndCache(key, caseName, payload, ttl).catch(console.error);
        }, 0);
        return stale.data;
      }
    }
  }

  return fetchAndCache(key, caseName, payload, ttl);
}

async function fetchAndCache(
  key: string,
  caseName: string,
  payload: any,
  ttl: number,
) {
  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const config = getCacheConfig(caseName);
      const functionName = config.functionName || "fetchingDataAttempt";

      const fn = httpsCallable(functions, functionName);

      const callPayload = { ...(payload || {}), case: caseName };

      const res: any = await fn(callPayload);
      const data = res?.data;

      const entry: CacheEntry = { timestamp: Date.now(), data, ttl };
      cache.set(key, entry);
      staleCache.set(key, entry);

      setTimeout(() => {
        if (staleCache.get(key) === entry) staleCache.delete(key);
      }, ttl * 2);

      return data;
    } catch (err: any) {
      console.error(`❌ [cachedFetch] Failed to fetch ${caseName}:`, err);
      console.error(`❌ [cachedFetch] Error details:`, err.message, err.code);
      const stale = staleCache.get(key) || cache.get(key);
      if (stale) return stale.data;
      throw err;
    }
  })();

  pendingRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    pendingRequests.delete(key);
  }
}

export function clearCachedFetch(caseName?: string) {
  if (!caseName) {
    cache.clear();
    staleCache.clear();
    return;
  }
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(caseName + "::")) {
      cache.delete(k);
      staleCache.delete(k);
    }
  }
}

export function clearAllCachedFetch() {
  cache.clear();
  staleCache.clear();
  pendingRequests.clear();
}
