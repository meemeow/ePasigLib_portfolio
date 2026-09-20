export type BookRequestStatus = "Under Review" | "Approved" | "Declined";

export const BOOK_REQUEST_STATUSES: readonly BookRequestStatus[] = [
  "Under Review",
  "Approved",
  "Declined",
];

export function isBookRequestStatus(
  value: unknown,
): value is BookRequestStatus {
  return BOOK_REQUEST_STATUSES.includes(value as BookRequestStatus);
}

export type BookRequestSource = "GoogleBooks" | "Manual";

export interface BookRequestDoc {
  Title: string;
  Author: string;
  Publisher: string | null;
  Description: string | null;
  RequestedBy: string;
  RequestedByName: string;
  ISBN10: string | null;
  ISBN13: string | null;
  ISBNs: string[];
  IdentityKey: string;
  Source: BookRequestSource;
  GoogleBookId: string | null;
  GoogleBookInfoLink: string | null;
  GoogleBookImage: string | null;
  Status: BookRequestStatus;
  ReviewedBy: string | null;
  ReviewedOn: FirebaseFirestore.Timestamp | null;
  CreatedOn: FirebaseFirestore.Timestamp;
}

export interface AddBookRequestPayload {
  title?: unknown;
  author?: unknown;
  publisher?: unknown;
  description?: unknown;
  isbn10?: unknown;
  isbn13?: unknown;
  source?: unknown;
  googleBookId?: unknown;
  googleBookInfoLink?: unknown;
  googleBookImage?: unknown;
}

export interface AddBookRequestResult {
  success: true;
  id: string;
  limit: number;
  used: number;
  remaining: number;
}

export interface BookRequestGroup {
  id: string;
  Title: string;
  Author: string;
  RequestIDs: string[];
  Count: number;
  Requesters: number;
  FirstRequestedOn: number | null;
  LastRequestedOn: number | null;
  Statuses: Record<BookRequestStatus, number>;
  Status: BookRequestStatus;
  Image: string | null;
  InfoLink: string | null;
  ISBN13: string | null;
}

export interface BookRequestGroupActionPayload {
  id?: unknown;
  Title?: unknown;
  Author?: unknown;
}

export interface SetBookRequestStatusPayload
  extends BookRequestGroupActionPayload {
  status?: unknown;
}

export interface BookRequestActionResult {
  success: true;
  id: string;
  affected: number;
  requestIds: string[];
}

export interface SetBookRequestStatusResult extends BookRequestActionResult {
  status: BookRequestStatus;
}
