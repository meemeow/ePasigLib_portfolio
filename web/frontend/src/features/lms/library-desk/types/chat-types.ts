export interface GuestInfo {
  FullName: string;
  School: string;
  City: string;
  Barangay: string;
  Age: string;
}

export type ChatStatus = "waiting" | "active" | "closed";
export type ChatSenderRole = "patron" | "staff";

export interface ChatMessage {
  id: string;
  SenderUID: string;
  SenderName: string;
  SenderRole: ChatSenderRole;
  Text: string;
  CreatedOn: number | null;
  pending: boolean;
}

export interface ChatRow {
  id: string;
  ChatNumber: number;
  StartedByName: string;
  IsGuest: boolean;
  Concern: string;
  Status: ChatStatus;
  TakenBy: string;
  TakenByName: string;
  TakenByAvatar: string;
  MessageCount: number;
  Unread: number;
  LastMessageText: string;
  LastMessageAt: number | null;
  StartedOn: number | null;
  ClosedOn: number | null;
  ClosedByRole: string;
  Rating: number;
  RatingComment: string;
}

export interface ChatDetail extends ChatRow {
  GuestInfo: GuestInfo | null;
  PatronInfo: PersonDetails | null;
  PatronAvatar: string;
}

export interface PersonDetails {
  School: string;
  City: string;
  Barangay: string;
  Age: string;
}

export type ChatState =
  | "waiting"
  | "mine"
  | "active"
  | "closed"
  | "expired"
  | "all";

export interface ChatFilters {
  state: ChatState;
  concern: string[];
  dateFrom: string;
  dateTo: string;
}

export type ChatSortColumn = "Queue" | "StartedOn" | "Unread" | "Status";

export const defaultChatFilters: ChatFilters = {
  state: "all",
  concern: [],
  dateFrom: "",
  dateTo: "",
};

export interface ChatBadge {
  count: number;
  waiting: number;
  mine: number;
}

export const CHAT_STATE_OPTIONS: { id: ChatState; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mine", label: "Assigned to me" },
  { id: "active", label: "Active" },
  { id: "waiting", label: "Waiting" },
  { id: "closed", label: "Closed" },
  { id: "expired", label: "Expired" },
];

export interface ChatMutationResult {
  success: boolean;
  message: string;
}

export interface ChatStartResult extends ChatMutationResult {
  id: string;
}
