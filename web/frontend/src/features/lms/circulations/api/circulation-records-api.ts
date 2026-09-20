import { cachedFetch } from "@/lib/fetching-data-cache";
import type {
  CirculationPaginatedResponse,
  CirculationSection,
  FetchCirculationRecordsPayload,
} from "@/features/lms/circulations/types/circulation-records-types";
import type {
  DashboardSummary,
  ListBorrowedBooksResponse,
  PatronSlotUsage,
} from "@/features/lms/circulations/types/circulation-transaction-types";

export const fetchCirculationRecordsApi = async <S extends CirculationSection>(
  payload: FetchCirculationRecordsPayload,
  isRefresh?: boolean,
): Promise<CirculationPaginatedResponse<S> | undefined> => {
  try {
    return await cachedFetch<CirculationPaginatedResponse<S>>(
      "circulationDataPaginated",
      payload,
      { force: isRefresh },
    );
  } catch (error) {
    console.error("Failed to fetch circulation records:", error);
    return undefined;
  }
};

export const fetchDashboardSummaryApi = async (
  isRefresh?: boolean,
): Promise<DashboardSummary | undefined> => {
  try {
    return await cachedFetch<DashboardSummary>(
      "dashboardSummary",
      {},
      { force: isRefresh },
    );
  } catch (error) {
    console.error("Failed to fetch dashboard summary:", error);
    return undefined;
  }
};

export const fetchBorrowedBooksApi = async (
  patronIdOrUID: string,
): Promise<ListBorrowedBooksResponse | undefined> => {
  try {
    return await cachedFetch<ListBorrowedBooksResponse>(
      "listBorrowedBooks",
      { patronIdOrUID },
      { force: true },
    );
  } catch (error) {
    console.error("Failed to fetch borrowed books:", error);
    return undefined;
  }
};

export const fetchPatronSlotUsageApi = async (
  patronIdOrUID: string,
): Promise<PatronSlotUsage | undefined> => {
  try {
    return await cachedFetch<PatronSlotUsage>(
      "patronSlotUsage",
      { patronIdOrUID },
      { force: true },
    );
  } catch (error) {
    console.error("Failed to fetch patron slot usage:", error);
    return undefined;
  }
};
