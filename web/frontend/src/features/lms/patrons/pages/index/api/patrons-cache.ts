import { clearCachedFetch } from "@/lib/fetching-data-cache";
import type { TablePatron } from "@/features/lms/patrons/pages/index/types/patrons-types";

export interface SearchCacheEntry {
  results: TablePatron[];
  total: number;
  hasMore: boolean;
  timestamp: number;
  loadedCount: number;
}

export const searchCache: Record<string, SearchCacheEntry> = {};
export const CACHE_TTL = 5 * 60 * 1000;
export const DEBOUNCE_DELAY = 700;

const PATRON_CACHE_CASES = [
  "patronById",
  "patronDataPaginated",
  "searchPatrons",
  "getUnverifiedCount",
  "unverifiedPatrons",
  "circulationDataPaginated",
  "dashboardSummary",
  "listBorrowedBooks",
] as const;

export function invalidatePatronCaches(): void {
  for (const caseName of PATRON_CACHE_CASES) {
    clearCachedFetch(caseName);
  }
  for (const key of Object.keys(searchCache)) {
    delete searchCache[key];
  }
}
