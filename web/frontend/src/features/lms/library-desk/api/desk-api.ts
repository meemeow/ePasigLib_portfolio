import { cachedFetch } from "@/lib/fetching-data-cache";
import type {
  AnnouncementRecord,
  NewsRecord,
} from "@/features/lms/library-desk/types/updates-types";
import type { ChatDetail } from "@/features/lms/library-desk/types/chat-types";
import type { BookRequestGroup } from "@/features/lms/library-desk/types/book-request-types";
import type {
  FetchDeskPayload,
  DeskPaginatedResponse,
  DeskSection,
} from "@/features/lms/library-desk/types/desk-types";

export async function fetchDeskRowsApi<S extends DeskSection>(
  payload: FetchDeskPayload,
  isRefresh?: boolean,
): Promise<DeskPaginatedResponse<S> | undefined> {
  const isConversations = payload.section === "conversations";
  const caseName = isConversations
    ? "chatsDataPaginated"
    : "updatesDataPaginated";

  const request = isConversations
    ? payload
    : { ...payload, type: payload.section };

  try {
    return await cachedFetch<DeskPaginatedResponse<S>>(caseName, request, {
      force: isRefresh,
    });
  } catch (error) {
    console.error("Failed to fetch desk records:", error);
    return undefined;
  }
}

export async function fetchUpdateByIdApi(
  id: string,
  isRefresh?: boolean,
): Promise<AnnouncementRecord | NewsRecord | undefined> {
  try {
    return await cachedFetch<AnnouncementRecord | NewsRecord>(
      "updateById",
      { id },
      { force: isRefresh },
    );
  } catch (error) {
    console.error("Failed to fetch update:", error);
    return undefined;
  }
}

export function isAnnouncementRecord(
  record: AnnouncementRecord | NewsRecord,
): record is AnnouncementRecord {
  return "Subject" in record;
}

export async function fetchChatByIdApi(
  chatId: string,
  staffCode: string,
  isRefresh?: boolean,
): Promise<ChatDetail | undefined> {
  try {
    return await cachedFetch<ChatDetail>(
      "fetchChatById",
      { chatId, staffCode },
      { force: isRefresh },
    );
  } catch (error) {
    console.error("Failed to fetch chat:", error);
    return undefined;
  }
}

export async function fetchBookRequestsApi(
  isRefresh?: boolean,
): Promise<BookRequestGroup[] | undefined> {
  try {
    const data = await cachedFetch<BookRequestGroup[]>(
      "fetchBookRequests",
      {},
      { force: isRefresh },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch book requests:", error);
    return undefined;
  }
}
