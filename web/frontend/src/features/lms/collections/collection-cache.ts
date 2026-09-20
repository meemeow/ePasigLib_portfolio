import { clearCachedFetch } from "@/lib/fetching-data-cache";

const COLLECTION_CACHE_CASES = [
  "collectionById",
  "collectionDataPaginated",
  "searchCollections",
  "fetchBooksCollection",
  "searchCollectionsViaSearchables",
  "circulationDataPaginated",
  "dashboardSummary",
] as const;

export function invalidateCollectionCaches(): void {
  for (const caseName of COLLECTION_CACHE_CASES) {
    clearCachedFetch(caseName);
  }
}
