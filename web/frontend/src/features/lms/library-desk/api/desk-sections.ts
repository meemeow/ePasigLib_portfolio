import type { SortOption } from "@/components/ui/SortPopover";
import {
  UPDATE_STATUS_OPTIONS,
  defaultAnnouncementFilters,
  defaultAnnouncementSort,
  defaultNewsFilters,
  defaultNewsSort,
} from "@/features/lms/library-desk/types/updates-types";
import { defaultChatFilters } from "@/features/lms/library-desk/types/chat-types";
import type {
  DeskSection,
  DeskSortState,
} from "@/features/lms/library-desk/types/desk-types";
import type { SectionFilters } from "@/features/lms/library-desk/types/desk-types";

export interface DeskSectionConfig<S extends DeskSection> {
  section: S;
  label: string;
  slug: string;
  entityLabel: string;
  searchPlaceholder: string;
  emptyMessage: string;
  createLabel: string;
  defaultFilters: SectionFilters[S];
  defaultSort: DeskSortState<S>;
  sortOptions: SortOption[];
  statusOptions: { id: string; label: string }[];
  dateFieldOptions: { id: string; label: string }[];
}

const DATE_FIELDS = [
  { id: "CreatedOn", label: "Date Created" },
  { id: "ModifiedOn", label: "Date Modified" },
];

const announcements: DeskSectionConfig<"announcements"> = {
  section: "announcements",
  label: "Announcements",
  slug: "announcements",
  entityLabel: "Announcement",
  searchPlaceholder: "Search subject, message, author...",
  emptyMessage: "No announcements found. Try adjusting your filters or search.",
  createLabel: "Compose Announcement",
  defaultFilters: defaultAnnouncementFilters,
  defaultSort: defaultAnnouncementSort,
  sortOptions: [
    { id: "CreatedOn", label: "Date Created" },
    { id: "Subject", label: "Subject" },
    { id: "AuthorName", label: "Author" },
    { id: "Status", label: "Status" },
    { id: "ReplyCount", label: "Replies" },
  ],
  statusOptions: UPDATE_STATUS_OPTIONS,
  dateFieldOptions: DATE_FIELDS,
};

const news: DeskSectionConfig<"news"> = {
  section: "news",
  label: "News",
  slug: "news",
  entityLabel: "News item",
  searchPlaceholder: "Search title, description, tag, author...",
  emptyMessage: "No news found. Try adjusting your filters or search.",
  createLabel: "Create News",
  defaultFilters: defaultNewsFilters,
  defaultSort: defaultNewsSort,
  sortOptions: [
    { id: "CreatedOn", label: "Date Created" },
    { id: "Title", label: "Title" },
    { id: "MainAuthor", label: "Author" },
    { id: "Status", label: "Status" },
    { id: "ViewCount", label: "Views" },
  ],
  statusOptions: UPDATE_STATUS_OPTIONS,
  dateFieldOptions: DATE_FIELDS,
};

const conversations: DeskSectionConfig<"conversations"> = {
  section: "conversations",
  label: "Conversations",
  slug: "conversations",
  entityLabel: "Conversation",
  statusOptions: [],
  searchPlaceholder: "Search patron, concern, message...",
  emptyMessage: "No conversations found. Try adjusting your filters or search.",
  createLabel: "",
  defaultFilters: defaultChatFilters,
  defaultSort: { column: "Queue", direction: "desc" },
  sortOptions: [
    { id: "Queue", label: "Queue order" },
    { id: "StartedOn", label: "Started" },
    { id: "Unread", label: "Unread" },
    { id: "Status", label: "Status" },
  ],
  dateFieldOptions: [{ id: "StartedOn", label: "Date Started" }],
};

export const SECTION_CONFIG = {
  announcements,
  news,
  conversations,
} as const satisfies { [S in DeskSection]: DeskSectionConfig<S> };

export const DESK_SECTIONS: DeskSection[] = [
  "announcements",
  "news",
  "conversations",
];

export const SECTION_ROLE: Record<DeskSection, string> = {
  announcements: "AnnouncementCreation",
  news: "AnnouncementCreation",
  conversations: "LiveChat",
};

export const UPDATES_ROLE = "AnnouncementCreation" as const;
export const CHAT_ROLE = "LiveChat" as const;

export const BOOK_REQUESTS_SLUG = "book-requests";
export const BOOK_REQUESTS_LABEL = "Book Requests";
export const BOOK_REQUESTS_ROLE = "LiveChat" as const;
