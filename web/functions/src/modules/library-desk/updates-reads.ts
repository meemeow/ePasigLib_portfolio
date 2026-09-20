import { HttpsError } from "firebase-functions/v2/https";
import { pagedFromQuery } from "../../core/pagination";
import { normalizeStatus, toMillis } from "./desk-common";
import type { PagedResponse } from "../lms/reads/fetching-types";
import type {
  AnnouncementReply,
  UpdateFile,
  UpdateStatus,
} from "./crud-updates-types";
import { db } from "../../core/firebase";

type DocData = Record<string, unknown>;

export type UpdatesSection = "announcements" | "news";

export interface UpdatesFilters {
  status?: string[];
  tags?: string[];
  dateField?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UpdatesSort {
  column?: string;
  direction?: "asc" | "desc";
}

export interface FetchUpdatesRequest {
  type: UpdatesSection;
  limit: number;
  page: number;
  searchTerm?: string;
  filters?: UpdatesFilters;
  sortBy?: UpdatesSort;
}

export interface AnnouncementRow {
  id: string;
  Subject: string;
  Message: string;
  AuthorName: string;
  AuthorUID: string;
  Status: UpdateStatus;
  ReplyCount: number;
  FileCount: number;
  CreatedOn: number | null;
  ModifiedOn: number | null;
}

export interface NewsRow {
  id: string;
  Title: string;
  Description: string;
  ImageURL: string;
  Tags: string[];
  MainAuthor: string;
  AuthorName: string;
  Status: UpdateStatus;
  ViewCount: number;
  CreatedOn: number | null;
  ModifiedOn: number | null;
}

export type UpdatesRow = AnnouncementRow | NewsRow;

export interface AnnouncementRecord extends AnnouncementRow {
  Files: UpdateFile[];
  Replies: Array<
    Omit<AnnouncementReply, "CreatedOn" | "ModifiedOn"> & {
      CreatedOn: number | null;
      ModifiedOn: number | null;
    }
  >;
  ModifiedBy: string;
}

export interface NewsRecord extends NewsRow {
  URL: string;
  Location: string;
  ModifiedBy: string;
}

function files(value: unknown): UpdateFile[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const file = (entry ?? {}) as DocData;
      return {
        URL: String(file.URL ?? file.url ?? ""),
        Name: String(file.Name ?? file.name ?? ""),
      };
    })
    .filter((file) => !!file.URL);
}

function replies(value: unknown): DocData[] {
  return Array.isArray(value) ? value.map((r) => (r ?? {}) as DocData) : [];
}

function toAnnouncementRow(id: string, doc: DocData): AnnouncementRow {
  return {
    id,
    Subject: String(doc.Subject ?? ""),
    Message: String(doc.Message ?? ""),
    AuthorName: String(doc.AuthorName ?? ""),
    AuthorUID: String(doc.AuthorUID ?? doc.UID ?? ""),
    Status: normalizeStatus(doc.Status),
    ReplyCount: replies(doc.Replies ?? doc.replies).length,
    FileCount: files(doc.Files).length,
    CreatedOn: toMillis(doc.CreatedOn),
    ModifiedOn: toMillis(doc.ModifiedOn),
  };
}

function toNewsRow(id: string, doc: DocData): NewsRow {
  return {
    id,
    Title: String(doc.Title ?? ""),
    Description: String(doc.Description ?? ""),
    ImageURL: String(doc.ImageURL ?? ""),
    Tags: Array.isArray(doc.Tags) ? doc.Tags.map((t) => String(t)) : [],
    MainAuthor: String(doc.MainAuthor ?? ""),
    AuthorName: String(doc.AuthorName ?? ""),
    Status: normalizeStatus(doc.Status),
    ViewCount: Number(doc.ViewCount ?? 0) || 0,
    CreatedOn: toMillis(doc.CreatedOn),
    ModifiedOn: toMillis(doc.ModifiedOn),
  };
}

function composeSearchText(row: UpdatesRow, isNews: boolean): string {
  const parts = isNews
    ? [
        (row as NewsRow).Title,
        (row as NewsRow).Description,
        (row as NewsRow).Tags.join(" "),
        (row as NewsRow).MainAuthor,
      ]
    : [
        (row as AnnouncementRow).Subject,
        (row as AnnouncementRow).Message,
        (row as AnnouncementRow).AuthorName,
      ];
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function startOfDay(value: string): number | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00+08:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function endOfDay(value: string): number | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999+08:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function matchesDateRange(
  row: UpdatesRow,
  filters: UpdatesFilters | undefined,
): boolean {
  const from = startOfDay(String(filters?.dateFrom ?? ""));
  const to = endOfDay(String(filters?.dateTo ?? ""));
  if (from === null && to === null) return true;

  const field = String(filters?.dateField ?? "CreatedOn");
  const value = field === "ModifiedOn" ? row.ModifiedOn : row.CreatedOn;

  if (value === null) return false;
  if (from !== null && value < from) return false;
  if (to !== null && value > to) return false;
  return true;
}

function sortRows(rows: UpdatesRow[], sortBy: UpdatesSort | undefined): void {
  const column = String(sortBy?.column ?? "CreatedOn");
  const direction = sortBy?.direction === "asc" ? 1 : -1;

  rows.sort((a, b) => {
    const left = (a as unknown as DocData)[column];
    const right = (b as unknown as DocData)[column];

    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;

    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * direction;
    }
    return String(left).localeCompare(String(right)) * direction;
  });
}

export async function fetchUpdatesPaginated(
  request: FetchUpdatesRequest,
): Promise<PagedResponse<UpdatesRow>> {
  const isNews = request.type === "news";

  const snap = await db
    .collection("updates")
    .where("Type", "==", isNews ? "News" : "Announcement")
    .get();

  let entries = snap.docs.map((doc) => {
    const data = doc.data() as DocData;
    const row = isNews
      ? toNewsRow(doc.id, data)
      : toAnnouncementRow(doc.id, data);
    const stored = String(data.SearchText ?? "").trim();
    return {
      row,
      searchText: stored || composeSearchText(row, isNews),
    };
  });

  const statuses = request.filters?.status ?? [];
  if (statuses.length > 0) {
    const wanted = new Set(statuses.map((s) => String(s)));
    entries = entries.filter((entry) => wanted.has(entry.row.Status));
  }

  const tags = request.filters?.tags ?? [];
  if (isNews && tags.length > 0) {
    const wanted = new Set(tags.map((t) => String(t).toLowerCase()));
    entries = entries.filter((entry) =>
      (entry.row as NewsRow).Tags.some((tag) => wanted.has(tag.toLowerCase())),
    );
  }

  entries = entries.filter((entry) =>
    matchesDateRange(entry.row, request.filters),
  );

  const words = String(request.searchTerm ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 0) {
    entries = entries.filter((entry) =>
      words.every((word) => entry.searchText.includes(word)),
    );
  }

  const rows = entries.map((entry) => entry.row);
  sortRows(rows, request.sortBy);

  const limit = Math.max(1, request.limit);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(1, request.page), totalPages);
  const start = (page - 1) * limit;

  return pagedFromQuery(rows.slice(start, start + limit), limit, page, total);
}

export async function fetchUpdateById(
  data: Record<string, unknown>,
): Promise<AnnouncementRecord | NewsRecord> {
  const id = String(data.id ?? "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id is required.");

  const snap = await db.collection("updates").doc(id).get();
  if (!snap.exists) throw new HttpsError("not-found", "Update not found.");
  const doc = (snap.data() ?? {}) as DocData;

  if (String(doc.Type ?? "") === "News") {
    return {
      ...toNewsRow(id, doc),
      URL: String(doc.URL ?? ""),
      Location: String(doc.Location ?? ""),
      ModifiedBy: String(doc.ModifiedBy ?? ""),
    };
  }

  return {
    ...toAnnouncementRow(id, doc),
    Files: files(doc.Files),
    Replies: replies(doc.Replies ?? doc.replies).map((reply, index) => ({
      ReplyID: String(reply.ReplyID ?? "") || `legacy-${index}`,
      Subject: String(reply.Subject ?? ""),
      Message: String(reply.Message ?? ""),
      Files: files(reply.Files),
      AuthorName: String(reply.AuthorName ?? ""),
      AuthorUID: String(reply.AuthorUID ?? reply.UID ?? ""),
      ModifiedBy: String(reply.ModifiedBy ?? ""),
      CreatedOn: toMillis(reply.CreatedOn),
      ModifiedOn: toMillis(reply.ModifiedOn),
    })),
    ModifiedBy: String(doc.ModifiedBy ?? ""),
  };
}

async function fetchPublishedByType(
  type: "Announcement" | "News",
): Promise<DocData[]> {
  try {
    const snap = await db.collection("updates").where("Type", "==", type).get();

    const rows = snap.docs
      .map((doc) => {
        const raw = doc.data() as DocData;
        return {
          ...raw,
          id: doc.id,
          Status: normalizeStatus(raw.Status),
          CreatedOn: toMillis(raw.CreatedOn),
          ModifiedOn: toMillis(raw.ModifiedOn),
          ...(type === "Announcement"
            ? {
                Replies: replies(raw.Replies ?? raw.replies).map(
                  (reply, index) => ({
                    ...reply,
                    ReplyID: String(reply.ReplyID ?? "") || `legacy-${index}`,
                    CreatedOn: toMillis(reply.CreatedOn),
                    ModifiedOn: toMillis(reply.ModifiedOn),
                  }),
                ),
              }
            : {}),
        };
      })
      .filter((row) => row.Status === "Published");

    rows.sort((a, b) => (b.CreatedOn ?? 0) - (a.CreatedOn ?? 0));
    return rows;
  } catch (error) {
    console.error(`Error fetching ${type} updates:`, error);
    return [];
  }
}

export function fetchAnnouncementData(): Promise<DocData[]> {
  return fetchPublishedByType("Announcement");
}

export function fetchNewsData(): Promise<DocData[]> {
  return fetchPublishedByType("News");
}
