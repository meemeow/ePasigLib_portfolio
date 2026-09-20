import { clearCachedFetch } from "@/lib/fetching-data-cache";
import { clearAllSectionSearchCache } from "@/features/lms/library-desk/api/desk-records-cache";

const UPDATE_CACHE_CASES = [
  "updatesDataPaginated",
  "updateById",
  "fetchAnnouncementData",
  "fetchNewsData",
] as const;

const CHAT_CACHE_CASES = [
  "chatsDataPaginated",
  "fetchChatById",
  "fetchChatsBadgeCount",
] as const;

const BOOK_REQUEST_CACHE_CASES = [
  "fetchBookRequests",
  "suggestionQuota",
] as const;

export function invalidateDeskCaches(): void {
  for (const caseName of UPDATE_CACHE_CASES) clearCachedFetch(caseName);
  clearAllSectionSearchCache();
}

export function invalidateChatCaches(): void {
  for (const caseName of CHAT_CACHE_CASES) clearCachedFetch(caseName);
  clearAllSectionSearchCache();
}

export function invalidateBookRequestCaches(): void {
  for (const caseName of BOOK_REQUEST_CACHE_CASES) clearCachedFetch(caseName);
}
