import { clearCachedFetch } from "@/lib/fetching-data-cache";
import { clearSectionSearchCache } from "@/features/lms/circulations/api/circulation-records-cache";

const CIRCULATION_CACHE_CASES = [
  "circulationDataPaginated",
  "dashboardSummary",
  "listBorrowedBooks",
] as const;

type CacheListener = () => void;

const listeners = new Set<CacheListener>();

export function onCirculationDataChanged(listener: CacheListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function invalidateCirculationCaches(): void {
  for (const caseName of CIRCULATION_CACHE_CASES) {
    clearCachedFetch(caseName);
  }
  clearSectionSearchCache();

  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      console.error("A circulation cache listener failed:", error);
    }
  }
}
