import { HttpsError } from "firebase-functions/v2/https";
import { pagedFromQuery } from "../../core/pagination";
import { toMillis } from "./desk-common";
import type { PagedResponse } from "../lms/reads/fetching-types";
import type { ChatStatus, GuestInfo } from "./crud-chat-types";
import { db } from "../../core/firebase";

type DocData = Record<string, unknown>;

const CHATS = "chats";

export type ChatFilterState =
  | "waiting"
  | "mine"
  | "active"
  | "closed"
  | "expired"
  | "all";

export interface ChatListFilters {
  state?: ChatFilterState;
  concern?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface ChatListRequest {
  limit: number;
  page: number;
  searchTerm?: string;
  filters?: ChatListFilters;
  sortBy?: { column?: string; direction?: "asc" | "desc" };
  staffCode?: string;
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

function ageFrom(birthDate: unknown): string {
  const raw = String(birthDate ?? "").trim();
  if (!raw) return "";
  const born = new Date(raw);
  if (Number.isNaN(born.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const months = today.getMonth() - born.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < born.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

async function readPatronDetails(
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<{ details: PersonDetails; avatar: string } | null> {
  if (!uid) return null;
  try {
    let snap = await db.collection("patrons").doc(uid).get();
    if (!snap.exists) {
      const found = await db
        .collection("patrons")
        .where("UID", "==", uid)
        .limit(1)
        .get();
      if (found.empty) return null;
      snap = found.docs[0];
    }
    const patron = (snap.data() ?? {}) as DocData;
    return {
      details: {
        School: String(patron.SchoolWork ?? ""),
        City: String(patron.City ?? ""),
        Barangay: String(patron.Barangay ?? ""),
        Age: ageFrom(patron.BirthDate),
      },
      avatar: String(patron.Avatar ?? ""),
    };
  } catch (error) {
    console.error(`Could not read patron ${uid} for a chat detail:`, error);
    return null;
  }
}

function toChatRow(id: string, doc: DocData): ChatRow {
  const status = String(doc.Status ?? "");

  return {
    id,
    ChatNumber: Number(doc.ChatNumber) || 0,
    StartedByName: String(doc.StartedByName ?? ""),
    IsGuest: doc.IsGuest === true || !!doc.GuestInfo,
    Concern: String(doc.Concern ?? ""),
    Status:
      status === "closed" || status === "active" || status === "waiting"
        ? status
        : "waiting",
    TakenBy: String(doc.TakenBy ?? ""),
    TakenByName: String(doc.TakenByName ?? ""),
    TakenByAvatar: String(doc.TakenByAvatar ?? ""),
    MessageCount: Number(doc.MessageCount) || 0,
    Unread: Number(doc.UnreadStaff) || 0,
    LastMessageText: String(doc.LastMessageText ?? "").slice(0, 140),
    LastMessageAt: toMillis(doc.LastMessageAt ?? doc.StartedOn),
    StartedOn: toMillis(doc.StartedOn),
    ClosedOn: toMillis(doc.ClosedOn),
    ClosedByRole: String(doc.ClosedByRole ?? ""),
    Rating: Number(doc.Rating) || 0,
    RatingComment: String(doc.RatingComment ?? ""),
  };
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

export async function fetchChatsPaginated(
  request: ChatListRequest,
): Promise<PagedResponse<ChatRow>> {
  const staffCode = String(request.staffCode ?? "");
  const state = request.filters?.state ?? "active";

  let query: FirebaseFirestore.Query = db.collection(CHATS);
  if (state === "closed" || state === "expired") {
    query = query.where("Status", "==", "closed");
  } else if (state === "waiting") {
    query = query.where("Status", "==", "waiting");
  } else if (state === "active" || state === "mine") {
    query = query.where("Status", "==", "active");
  }

  const snap = await query.get();
  let rows = snap.docs.map((doc) => toChatRow(doc.id, doc.data() as DocData));

  if (state === "mine") {
    rows = rows.filter((row) => !!staffCode && row.TakenBy === staffCode);
  }

  if (state === "expired") {
    rows = rows.filter((row) => row.ClosedByRole === "system");
  } else if (state === "closed") {
    rows = rows.filter((row) => row.ClosedByRole !== "system");
  }

  const concerns = request.filters?.concern ?? [];
  if (concerns.length > 0) {
    const wanted = new Set(concerns.map((c) => c.toLowerCase()));
    rows = rows.filter((row) => wanted.has(row.Concern.toLowerCase()));
  }

  const from = startOfDay(String(request.filters?.dateFrom ?? ""));
  const to = endOfDay(String(request.filters?.dateTo ?? ""));
  if (from !== null || to !== null) {
    rows = rows.filter((row) => {
      const value = row.StartedOn;
      if (value === null) return false;
      if (from !== null && value < from) return false;
      if (to !== null && value > to) return false;
      return true;
    });
  }

  const term = String(request.searchTerm ?? "")
    .trim()
    .toLowerCase();
  if (term) {
    const digits = term.replace(/^#/, "");
    const asNumber = /^\d+$/.test(digits) ? Number(digits) : null;

    rows = rows.filter(
      (row) =>
        (asNumber !== null && row.ChatNumber === asNumber) ||
        [row.StartedByName, row.Concern, row.LastMessageText, row.TakenByName]
          .join(" ")
          .toLowerCase()
          .includes(term),
    );
  }

  const column = String(request.sortBy?.column ?? "Queue");
  const direction = request.sortBy?.direction === "asc" ? 1 : -1;

  const band = (row: ChatRow): number => {
    if (row.Status === "closed") return 3;
    if (row.Status === "active") {
      return !!staffCode && row.TakenBy === staffCode ? 0 : 2;
    }
    return 1;
  };

  const STATUS_RANK: Record<string, number> = {
    waiting: 0,
    active: 1,
    closed: 2,
  };

  const compare = (a: ChatRow, b: ChatRow): number => {
    const left = (a as unknown as DocData)[column];
    const right = (b as unknown as DocData)[column];
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * direction;
    }
    return String(left).localeCompare(String(right)) * direction;
  };

  if (column === "Status") {
    rows.sort(
      (a, b) =>
        (STATUS_RANK[a.Status] - STATUS_RANK[b.Status]) * direction ||
        (b.LastMessageAt ?? 0) - (a.LastMessageAt ?? 0),
    );
  } else if (column === "Queue") {
    rows.sort(
      (a, b) =>
        (band(a) - band(b) ||
          (b.LastMessageAt ?? 0) - (a.LastMessageAt ?? 0)) * -direction,
    );
  } else {
    rows.sort(
      (a, b) =>
        Number(a.Status === "closed") - Number(b.Status === "closed") ||
        compare(a, b),
    );
  }

  const limit = Math.max(1, request.limit);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(1, request.page), totalPages);
  const start = (page - 1) * limit;

  return pagedFromQuery(rows.slice(start, start + limit), limit, page, total);
}

export async function fetchChatById(data: DocData): Promise<ChatDetail> {
  const chatId = String(data.chatId ?? data.id ?? "").trim();
  if (!chatId) throw new HttpsError("invalid-argument", "chatId is required.");

  const snap = await db.collection(CHATS).doc(chatId).get();
  if (!snap.exists) throw new HttpsError("not-found", "Chat not found.");
  const doc = (snap.data() ?? {}) as DocData;

  const takenBy = String(doc.TakenBy ?? "");
  const caller = String(data.staffCode ?? "");
  if (doc.Status === "active" && takenBy && takenBy !== caller) {
    throw new HttpsError(
      "permission-denied",
      `${String(doc.TakenByName || "Another librarian")} is handling this conversation. It can be read here once it is closed.`,
    );
  }

  const guest = doc.GuestInfo as DocData | undefined;

  const patron = guest
    ? null
    : await readPatronDetails(db, String(doc.StartedByUID ?? ""));

  return {
    ...toChatRow(snap.id, doc),
    GuestInfo: guest
      ? {
          FullName: String(guest.FullName ?? ""),
          School: String(guest.School ?? ""),
          City: String(guest.City ?? ""),
          Barangay: String(guest.Barangay ?? ""),
          Age: String(guest.Age ?? ""),
        }
      : null,
    PatronInfo: patron?.details ?? null,
    PatronAvatar: patron?.avatar ?? "",
  };
}

export async function fetchChatsBadgeCount(
  data: DocData,
): Promise<{ count: number; waiting: number; mine: number }> {
  const staffCode = String(data.staffCode ?? "").trim();

  const snap = await db
    .collection(CHATS)
    .where("Status", "in", ["waiting", "active"])
    .get();

  let waiting = 0;
  let mine = 0;
  for (const doc of snap.docs) {
    const chat = doc.data() as DocData;
    if (chat.Status === "waiting") {
      waiting += 1;
      continue;
    }
    if (staffCode && String(chat.TakenBy ?? "") === staffCode) {
      mine += Number(chat.UnreadStaff) || 0;
    }
  }

  return { count: waiting + mine, waiting, mine };
}

