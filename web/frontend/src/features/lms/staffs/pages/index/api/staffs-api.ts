import { cachedFetch } from "@/lib/fetching-data-cache";
import type { 
  StaffPaginatedResponse,
  StaffSearchIdsResponse,
  FetchStaffsPayload,
  SearchStaffsPayload,
} from "@/features/lms/staffs/pages/index/types/staffs-types";

export const fetchStaffsApi = async (
  payload: FetchStaffsPayload,
  isRefresh?: boolean
): Promise<StaffPaginatedResponse | undefined> => {
  try {
    const response = await cachedFetch<StaffPaginatedResponse>(
      "staffDataPaginated",
      payload,
      { force: isRefresh },
    );
    return response;
  } catch (error) {
    console.error("Failed to fetch staffs:", error);
    return undefined;
  }
};

export const searchStaffsApi = async (
  searchTerm: string,
  limit: number,
  page: number = 1
): Promise<StaffSearchIdsResponse | undefined> => {
  try {
    const payload: SearchStaffsPayload = {
      case: "searchStaffs",
      searchTerm: searchTerm.trim(),
      limit,
      page,
    };
    const response = await cachedFetch<StaffSearchIdsResponse>(
      "searchStaffs",
      payload,
      { force: true },
    );
    return response;
  } catch (error) {
    console.error("Failed to search staffs:", error);
    return undefined;
  }
};