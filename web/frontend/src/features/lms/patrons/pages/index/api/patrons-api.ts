import { cachedFetch } from "@/lib/fetching-data-cache";
import type { TablePatron, PatronFiltersPayload, PatronSortPayload } from "@/features/lms/patrons/pages/index/types/patrons-types";

export interface PaginatedResponse {
  data: TablePatron[];
  page: number;
  totalPages: number;
  hasMore: boolean;
  total: number;
}

export interface SearchIdsResponse {
  ids: string[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
}

export interface FetchPatronsPayload {
  limit: number;
  page: number;
  filters: PatronFiltersPayload;
  sortBy: PatronSortPayload;
  ids?: string[];
}

export interface SearchPatronsPayload {
  case: "searchPatrons";
  searchTerm: string;
  limit: number;
  page: number;
}

export const fetchPatronsApi = async (
  payload: FetchPatronsPayload,
  isRefresh?: boolean
): Promise<PaginatedResponse | undefined> => {
  try {
    const response = await cachedFetch<PaginatedResponse>(
      "patronDataPaginated",
      payload,
      { force: isRefresh },
    );
    return response;
  } catch (error) {
    console.error("Failed to fetch patrons:", error);
    return undefined;
  }
};

export const searchPatronsApi = async (
  searchTerm: string,
  limit: number,
  page: number = 1
): Promise<SearchIdsResponse | undefined> => {
  try {
    const payload: SearchPatronsPayload = {
      case: "searchPatrons",
      searchTerm: searchTerm.trim(),
      limit,
      page,
    };
    const response = await cachedFetch<SearchIdsResponse>(
      "searchPatrons",
      payload,
      { force: true },
    );
    return response;
  } catch (error) {
    console.error("Failed to search patrons:", error);
    return undefined;
  }
};

export async function fetchUnverifiedCount(): Promise<number> {
  try {
    const res = await cachedFetch<number>("getUnverifiedCount", {}, { force: true });
    return typeof res === 'number' ? res : 0;
  } catch (error) {
    console.warn("Failed to fetch unverified count:", error);
    return 0;
  }
}
