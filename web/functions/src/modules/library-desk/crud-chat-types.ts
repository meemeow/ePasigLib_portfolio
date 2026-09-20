import type { Timestamp, FieldValue } from "firebase-admin/firestore";

export type WrittenTimestamp = Timestamp | FieldValue | null;

export type ChatStatus = "waiting" | "active" | "closed";

export interface GuestInfo {
  FullName: string;
  School: string;
  City: string;
  Barangay: string;
  Age: string;
}

export type ChatSenderRole = "patron" | "staff";

export interface ChatMessageRecord {
  SenderUID: string;
  SenderName: string;
  SenderRole: ChatSenderRole;
  Text: string;
  CreatedOn: WrittenTimestamp;
}

export interface ChatDocument {
  Status: ChatStatus;

  ChatNumber: number;

  StartedByUID: string;
  StartedByName: string;
  IsGuest: boolean;
  StartedOn: WrittenTimestamp;

  Concern: string;
  GuestInfo?: GuestInfo;

  Participants: string[];

  TakenBy: string;
  TakenByAuthUID: string;
  TakenByName: string;
  TakenByAvatar: string;
  TakenOn: WrittenTimestamp;

  Rating: number;
  RatingComment: string;
  RatedOn?: WrittenTimestamp;

  ClosedBy?: string;
  ClosedByName?: string;
  ClosedByRole?: ChatSenderRole;
  ClosedOn?: WrittenTimestamp;

  LastMessageAt: WrittenTimestamp;
  LastMessageText: string;
  LastMessageBy: ChatSenderRole | "";
  MessageCount: number;

  LastPatronActivityAt: WrittenTimestamp;

  UnreadPatron: number;
  UnreadStaff: number;
}

export interface ChatMutationResponse {
  success: boolean;
  message: string;
}

export interface ChatStartResponse extends ChatMutationResponse {
  id: string;
}
