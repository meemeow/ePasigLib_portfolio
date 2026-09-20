import type {
  AnnouncementFilters,
  AnnouncementRow,
  AnnouncementSortColumn,
  NewsFilters,
  NewsRow,
  NewsSortColumn,
} from "@/features/lms/library-desk/types/updates-types";
import {
  defaultAnnouncementFilters,
  defaultNewsFilters,
} from "@/features/lms/library-desk/types/updates-types";
import type {
  ChatFilters,
  ChatRow,
  ChatSortColumn,
} from "@/features/lms/library-desk/types/chat-types";
import { defaultChatFilters } from "@/features/lms/library-desk/types/chat-types";

export type DeskSection = "announcements" | "news" | "conversations";

export interface SectionRow {
  announcements: AnnouncementRow;
  news: NewsRow;
  conversations: ChatRow;
}

export interface SectionFilters {
  announcements: AnnouncementFilters;
  news: NewsFilters;
  conversations: ChatFilters;
}

export interface SectionSortColumn {
  announcements: AnnouncementSortColumn;
  news: NewsSortColumn;
  conversations: ChatSortColumn;
}

export type SortDirection = "asc" | "desc";

export interface DeskSortState<S extends DeskSection> {
  column: SectionSortColumn[S];
  direction: SortDirection;
}

export interface DeskFiltersPayload {
  status?: string[];
  tags?: string[];
  state?: string;
  concern?: string[];
  dateField?: string;
  dateFrom: string;
  dateTo: string;
}

export interface DeskSortPayload {
  column: string;
  direction: SortDirection;
}

export interface FetchDeskPayload {
  section: DeskSection;
  limit: number;
  page: number;
  searchTerm?: string;
  filters: DeskFiltersPayload;
  sortBy: DeskSortPayload;
  staffCode?: string;
}

export interface DeskPaginatedResponse<S extends DeskSection> {
  data: SectionRow[S][];
  page: number;
  totalPages: number;
  hasMore: boolean;
  total: number;
}

export const DEFAULT_FILTERS: {
  [S in DeskSection]: SectionFilters[S];
} = {
  announcements: defaultAnnouncementFilters,
  news: defaultNewsFilters,
  conversations: defaultChatFilters,
};
