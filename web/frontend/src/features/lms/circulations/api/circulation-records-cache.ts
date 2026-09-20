import type {
  CirculationSection,
  SectionRow,
} from "@/features/lms/circulations/types/circulation-records-types";

export interface SectionSearchCacheEntry {
  results: SectionRow[CirculationSection][];
  total: number;
  hasMore: boolean;
  timestamp: number;
  loadedCount: number;
}

export const sectionSearchCache: Record<string, SectionSearchCacheEntry> = {};
export const CIRC_CACHE_TTL = 5 * 60 * 1000;
export const CIRC_DEBOUNCE_DELAY = 700;

export function clearSectionSearchCache(section?: CirculationSection): void {
  const prefix = section ? `${section}_` : "";
  for (const key of Object.keys(sectionSearchCache)) {
    if (!prefix || key.startsWith(prefix)) delete sectionSearchCache[key];
  }
}
