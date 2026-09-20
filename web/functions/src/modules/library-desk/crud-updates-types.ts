import type { Timestamp, FieldValue } from "firebase-admin/firestore";

export type WrittenTimestamp = Timestamp | FieldValue | null;

export type UpdateStatus = "Draft" | "Published" | "Archived";

export const UPDATE_STATUSES: readonly UpdateStatus[] = [
  "Draft",
  "Published",
] as const;

export type UpdateType = "Announcement" | "News";

export interface UpdateFile {
  URL: string;
  Name: string;
}

export interface AnnouncementReply {
  ReplyID: string;
  Subject: string;
  Message: string;
  Files: UpdateFile[];
  CreatedOn: WrittenTimestamp;
  AuthorName: string;
  AuthorUID: string;
  ModifiedBy?: string;
  ModifiedOn?: WrittenTimestamp;
}

interface UpdateDocumentBase {
  Type: UpdateType;
  Status: UpdateStatus;
  CreatedOn: WrittenTimestamp;
  AuthorName: string;
  AuthorUID: string;
  SearchText: string;
  ModifiedBy?: string;
  ModifiedOn?: WrittenTimestamp;
}

export interface AnnouncementDocument extends UpdateDocumentBase {
  Type: "Announcement";
  Subject: string;
  Message: string;
  Files: UpdateFile[];
  Replies: AnnouncementReply[];
}

export interface NewsDocument extends UpdateDocumentBase {
  Type: "News";
  Title: string;
  Description: string;
  Tags: string[];
  ImageURL: string;
  URL: string;
  MainAuthor: string;
  Location: string;
  ViewCount: number;
}

export type UpdateDocument = AnnouncementDocument | NewsDocument;

export const ANNOUNCEMENT_EDITABLE_FIELDS = [
  "Subject",
  "Message",
  "Files",
] as const;

export const NEWS_EDITABLE_FIELDS = [
  "Title",
  "Description",
  "Tags",
  "ImageURL",
  "URL",
  "MainAuthor",
  "Location",
] as const;

export const REPLY_EDITABLE_FIELDS = ["Subject", "Message", "Files"] as const;

// ==========================================
// || PAYLOADS AND RESPONSES               ||
// ==========================================

export interface AnnouncementCreatePayload {
  Subject: string;
  Message: string;
  Files?: UpdateFile[];
  Publish?: boolean;
}

export interface AnnouncementEditPayload {
  id: string;
  Subject: string;
  Message: string;
  Files?: UpdateFile[];
}

export interface NewsCreatePayload {
  Title: string;
  Description: string;
  Tags?: string[];
  ImageURL?: string;
  URL?: string;
  MainAuthor?: string;
  Location?: string;
  Publish?: boolean;
}

export interface NewsEditPayload {
  id: string;
  Title: string;
  Description: string;
  Tags?: string[];
  ImageURL?: string;
  URL?: string;
  MainAuthor?: string;
  Location?: string;
}

export interface ReplyCreatePayload {
  ParentID: string;
  Subject: string;
  Message: string;
  Files?: UpdateFile[];
}

export interface ReplyEditPayload {
  ParentID: string;
  ReplyID: string;
  Subject: string;
  Message: string;
  Files?: UpdateFile[];
}

export interface ReplyDeletePayload {
  ParentID: string;
  ReplyID: string;
}

export interface UpdatePublishPayload {
  id: string;
}

export interface UpdateArchivePayload {
  id: string;
  action: "archive" | "unarchive";
}

export interface ViewCountPayload {
  id: string;
}

export interface CreateResponse {
  success: boolean;
  id: string;
  status: UpdateStatus;
  message: string;
}

export interface MutationResponse {
  success: boolean;
  message: string;
}

export interface PublishResponse {
  success: boolean;
  message: string;
  data: { id: string; previousStatus: UpdateStatus; newStatus: UpdateStatus };
}

export interface ReplyCreateResponse {
  success: boolean;
  replyId: string;
  message: string;
}
