import { clearCachedFetch } from "@/lib/fetching-data-cache";
import type {
  DeskSection,
} from "@/features/lms/library-desk/types/desk-types";
import type {
  SectionRow,
} from "@/features/lms/library-desk/types/desk-types";

export interface UpdatesCacheEntry {
  results: SectionRow[DeskSection][];
  total: number;
  hasMore: boolean;
  timestamp: number;
  loadedCount: number;
}

export const sectionSearchCache: Record<string, UpdatesCacheEntry> = {};

export const UPDATES_CACHE_TTL = 5 * 60 * 1000;
export const UPDATES_DEBOUNCE_DELAY = 700;

export function clearSectionSearchCache(section: DeskSection): void {
  const prefix = `${section}_`;
  for (const key of Object.keys(sectionSearchCache)) {
    if (key.startsWith(prefix)) delete sectionSearchCache[key];
  }
}

export function clearAllSectionSearchCache(): void {
  for (const key of Object.keys(sectionSearchCache)) {
    delete sectionSearchCache[key];
  }
  clearCachedFetch("updatesDataPaginated");
}
