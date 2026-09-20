import { clearCachedFetch } from "@/lib/fetching-data-cache";
import type { TableStaff } from "@/features/lms/staffs/pages/index/types/staffs-types";

export interface StaffSearchCacheEntry {
  results: TableStaff[];
  total: number;
  hasMore: boolean;
  timestamp: number;
  loadedCount: number;
}

export const staffSearchCache: Record<string, StaffSearchCacheEntry> = {};
export const STAFF_CACHE_TTL = 5 * 60 * 1000;
export const STAFF_DEBOUNCE_DELAY = 700;

const STAFF_CACHE_CASES = [
  "staffById",
  "staffDataPaginated",
  "searchStaffs",
] as const;

export function invalidateStaffCaches(): void {
  for (const caseName of STAFF_CACHE_CASES) {
    clearCachedFetch(caseName);
  }
  for (const key of Object.keys(staffSearchCache)) {
    delete staffSearchCache[key];
  }
}
