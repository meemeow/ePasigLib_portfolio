export type BookRequestStatus = "Under Review" | "Approved" | "Declined";

export const BOOK_REQUEST_STATUSES: readonly BookRequestStatus[] = [
  "Under Review",
  "Approved",
  "Declined",
];

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

export interface BookRequestActionResult {
  success: true;
  id: string;
  affected: number;
  requestIds: string[];
}

export interface SetBookRequestStatusResult extends BookRequestActionResult {
  status: BookRequestStatus;
}
