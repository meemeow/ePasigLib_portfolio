import type { TableCollection } from "@/features/lms/collections/pages/index/types/collections-types";

export interface SearchCacheEntry {
  results: TableCollection[];
  total: number;
  hasMore: boolean;
  timestamp: number;
  loadedCount: number;
}

export const searchCache: Record<string, SearchCacheEntry> = {};
export const CACHE_TTL = 5 * 60 * 1000;
export const DEBOUNCE_DELAY = 700;
