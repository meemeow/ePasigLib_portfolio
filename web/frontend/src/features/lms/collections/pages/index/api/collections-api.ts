import { cachedFetch } from "@/lib/fetching-data-cache";
import type {
  CollectionPaginatedResponse,
  CollectionSearchIdsResponse,
  FetchCollectionsPayload,
  SearchCollectionsPayload,
} from "@/features/lms/collections/pages/index/types/collections-types";

export const fetchCollectionsApi = async (
  payload: FetchCollectionsPayload,
  isRefresh?: boolean,
): Promise<CollectionPaginatedResponse | undefined> => {
  try {
    return await cachedFetch<CollectionPaginatedResponse>(
      "collectionDataPaginated",
      payload,
      { force: isRefresh },
    );
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    return undefined;
  }
};

export const searchCollectionsApi = async (
  searchTerm: string,
): Promise<CollectionSearchIdsResponse | undefined> => {
  try {
    const payload: SearchCollectionsPayload = {
      case: "searchCollections",
      searchTerm: searchTerm.trim(),
    };
    return await cachedFetch<CollectionSearchIdsResponse>(
      "searchCollections",
      payload,
      { force: true },
    );
  } catch (error) {
    console.error("Failed to search collections:", error);
    return undefined;
  }
};
