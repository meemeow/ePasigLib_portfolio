export type UpdateStatus = "Draft" | "Published" | "Archived";

export interface UpdateFile {
  URL: string;
  Name: string;
}

// ==========================================
// || LIST ROWS                            ||
// ==========================================

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

// ==========================================
// || DETAIL RECORDS                       ||
// ==========================================

export interface AnnouncementReplyRecord {
  ReplyID: string;
  Subject: string;
  Message: string;
  Files: UpdateFile[];
  AuthorName: string;
  AuthorUID: string;
  ModifiedBy: string;
  CreatedOn: number | null;
  ModifiedOn: number | null;
}

export interface AnnouncementRecord extends AnnouncementRow {
  Files: UpdateFile[];
  Replies: AnnouncementReplyRecord[];
  ModifiedBy: string;
}

export interface NewsRecord extends NewsRow {
  URL: string;
  Location: string;
  ModifiedBy: string;
}

// ==========================================
// || FILTER AND SORT STATE                ||
// ==========================================

export type UpdatesDateField = "CreatedOn" | "ModifiedOn";

export interface AnnouncementFilters {
  status: UpdateStatus[];
  dateField: UpdatesDateField;
  dateFrom: string;
  dateTo: string;
}

export interface NewsFilters extends AnnouncementFilters {
  tags: string[];
}

export type AnnouncementSortColumn =
  | "CreatedOn"
  | "Subject"
  | "AuthorName"
  | "Status"
  | "ReplyCount";

export type NewsSortColumn =
  | "CreatedOn"
  | "Title"
  | "MainAuthor"
  | "Status"
  | "ViewCount";

// ==========================================
// || DEFAULTS                             ||
// ==========================================

export const defaultAnnouncementFilters: AnnouncementFilters = {
  status: ["Draft", "Published"],
  dateField: "CreatedOn",
  dateFrom: "",
  dateTo: "",
};

export const defaultNewsFilters: NewsFilters = {
  status: ["Draft", "Published"],
  tags: [],
  dateField: "CreatedOn",
  dateFrom: "",
  dateTo: "",
};

export const defaultAnnouncementSort = {
  column: "CreatedOn" as AnnouncementSortColumn,
  direction: "desc" as const,
};

export const defaultNewsSort = {
  column: "CreatedOn" as NewsSortColumn,
  direction: "desc" as const,
};

export const UPDATE_STATUS_OPTIONS: { id: UpdateStatus; label: string }[] = [
  { id: "Draft", label: "Draft" },
  { id: "Published", label: "Published" },
];

// ==========================================
// || MUTATION PAYLOADS                    ||
// ==========================================

export interface AnnouncementFormValues {
  Subject: string;
  Message: string;
  Files: UpdateFile[];
}

export interface NewsFormValues {
  Title: string;
  Description: string;
  Tags: string[];
  ImageURL: string;
  URL: string;
  MainAuthor: string;
  Location: string;
}

export interface ReplyFormValues {
  Subject: string;
  Message: string;
  Files: UpdateFile[];
}

export interface MutationResult {
  success: boolean;
  message: string;
}

export interface CreateResult extends MutationResult {
  id: string;
  status: UpdateStatus;
}

// ==========================================
// || FORM STATE                           ||
// ==========================================

export interface AnnouncementFormState {
  Subject: string;
  Message: string;
}

export interface NewsFormState {
  Title: string;
  Description: string;
  Tags: string[];
  MainAuthor: string;
  Location: string;
  URL: string;
}

export type AnnouncementFieldErrors = Partial<
  Record<keyof AnnouncementFormState | "Files", string>
>;

export type NewsFieldErrors = Partial<
  Record<keyof NewsFormState | "ImageURL", string>
>;

export type ReplyFieldErrors = Partial<
  Record<"Subject" | "Message" | "Files", string>
>;

export type SetField<T> = <K extends keyof T>(name: K, value: T[K]) => void;
