import { cachedFetch, clearCachedFetch } from "@/lib/fetching-data-cache";
import type { Announcement } from "@/features/lms/home/types/home-types";

export { fetchDashboardSummaryApi } from "@/features/lms/circulations/api/circulation-records-api";

export const fetchAnnouncementsApi = async (
  isRefresh?: boolean,
): Promise<Announcement[] | undefined> => {
  try {
    const data = await cachedFetch<Announcement[]>(
      "fetchAnnouncementData",
      {},
      { force: isRefresh },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    return undefined;
  }
};

export function invalidateHomeCaches(): void {
  clearCachedFetch("dashboardSummary");
  clearCachedFetch("fetchAnnouncementData");
}
