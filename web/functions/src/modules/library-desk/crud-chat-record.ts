import * as admin from "firebase-admin";
import { notifyPatronByUid } from "../circulation/circulation-policy";
import { HttpsError } from "firebase-functions/v2/https";
import { requireStaffActor } from "../../core/guards";
import { requireString } from "./desk-common";
import type {
  ChatMutationResponse,
  ChatStartResponse,
  GuestInfo,
} from "./crud-chat-types";
import { db, serverTimestamp } from "../../core/firebase";

const CHATS = "chats";
const MESSAGES = "messages";
const METADATA = "metadata";
const CHAT_COUNTER_DOC = "chat_number_counter";
const MESSAGE_LIMIT = 2000;
const CONCERN_LIMIT = 120;
const RATING_COMMENT_LIMIT = 50;

type Payload = Record<string, unknown>;

export const CHAT_PERMISSION = "LiveChat";

async function requireChatStaff(authUid: string | null) {
  const actor = await requireStaffActor(authUid ?? undefined, CHAT_PERMISSION);
  return {
    authUid: actor.authUid,
    staffCode: actor.staffCode || actor.publicUID || actor.authUid,
    staffName: actor.fullName || actor.staffCode || actor.authUid,
    staffAvatar: actor.avatar,
  };
}

function readGuestInfo(value: unknown): GuestInfo | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const FullName = String(raw.FullName ?? "").trim();
  if (!FullName) return undefined;
  return {
    FullName,
    School: String(raw.School ?? "").trim(),
    City: String(raw.City ?? "").trim(),
    Barangay: String(raw.Barangay ?? "").trim(),
    Age: String(raw.Age ?? "").trim(),
  };
}

async function resolvePatronName(
  db: FirebaseFirestore.Firestore,
  authUid: string,
): Promise<string> {
  const snap = await db.collection("patrons").doc(authUid).get();
  if (!snap.exists) return "";
  const patron = snap.data() as Record<string, unknown>;
  return [patron.FirstName, patron.LastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export async function addChatStart(
  data: Payload,
  authUid: string | null,
): Promise<ChatStartResponse> {
  if (!authUid) {
    throw new HttpsError(
      "unauthenticated",
      "Could not start the chat. Reload the page and try again.",
    );
  }


  const Concern = requireString(data, "Concern");
  const Description = requireString(data, "Description");
  if (Concern.length > CONCERN_LIMIT) {
    throw new HttpsError(
      "invalid-argument",
      `Concern must be ${CONCERN_LIMIT} characters or fewer.`,
    );
  }
  if (Description.length > MESSAGE_LIMIT) {
    throw new HttpsError(
      "invalid-argument",
      `Message must be ${MESSAGE_LIMIT} characters or fewer.`,
    );
  }

  const patronName = await resolvePatronName(db, authUid);
  const isGuest = !patronName;
  const guestInfo = isGuest ? readGuestInfo(data.GuestInfo) : undefined;
  const startedByName = patronName || guestInfo?.FullName || "Guest";

  const chatRef = db.collection(CHATS).doc();

  const counterRef = db.collection(METADATA).doc(CHAT_COUNTER_DOC);

  const existingQuery = db
    .collection(CHATS)
    .where("Participants", "array-contains", authUid)
    .where("Status", "in", ["waiting", "active"])
    .limit(1);

  const existing = await db.runTransaction(async (tx) => {
    const open = await tx.get(existingQuery);
    if (!open.empty) {
      const doc = open.docs[0];
      return { id: doc.id, chatNumber: Number(doc.get("ChatNumber")) || 0 };
    }

    const counter = await tx.get(counterRef);
    const chatNumber = counter.exists
      ? Number((counter.data() as Payload)?.nextUID) || 1
      : 1;
    tx.set(counterRef, { nextUID: chatNumber + 1 }, { merge: true });

    tx.set(chatRef, {
      Status: "waiting",
      ChatNumber: chatNumber,
      StartedByUID: authUid,
      StartedByName: startedByName,
      IsGuest: isGuest,
      StartedOn: serverTimestamp(),
      Concern,
      ...(guestInfo ? { GuestInfo: guestInfo } : {}),
      Participants: [authUid],
      TakenBy: "",
      TakenByAuthUID: "",
      TakenByName: "",
      TakenOn: null,
      LastMessageAt: null,
      LastMessageText: "",
      LastMessageBy: "",
      MessageCount: 0,
      Rating: 0,
      RatingComment: "",
      LastPatronActivityAt: serverTimestamp(),
      UnreadPatron: 0,
      UnreadStaff: 0,
    });

    tx.set(chatRef.collection(MESSAGES).doc(), {
      SenderUID: authUid,
      SenderName: startedByName,
      SenderRole: "patron",
      Text: Description,
      CreatedOn: serverTimestamp(),
    });

    return null;
  });

  if (existing) {
    return {
      success: true,
      id: existing.id,
      message: "You already have a conversation open.",
    };
  }

  return { success: true, id: chatRef.id, message: "Chat started." };
}

export async function chatTake(
  data: Payload,
  authUid: string | null,
): Promise<ChatMutationResponse> {
  const actor = await requireChatStaff(authUid);
  const chatId = requireString(data, "chatId");
  const ref = db.collection(CHATS).doc(chatId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Chat not found.");
    const chat = (snap.data() ?? {}) as Record<string, unknown>;
    if (chat.Status === "closed") {
      throw new HttpsError("failed-precondition", "This chat has been closed.");
    }
    const takenBy = String(chat.TakenBy ?? "");
    if (takenBy && takenBy !== actor.staffCode) {
      throw new HttpsError(
        "failed-precondition",
        "Another librarian is already handling this chat.",
      );
    }

    tx.update(ref, {
      Status: "active",
      TakenBy: actor.staffCode,
      TakenByAuthUID: actor.authUid,
      TakenByName: actor.staffName,
      TakenByAvatar: actor.staffAvatar,
      TakenOn: serverTimestamp(),
      Participants: admin.firestore.FieldValue.arrayUnion(actor.authUid),
    });
  });

  return { success: true, message: "Chat assigned to you." };
}

export async function chatEnd(
  data: Payload,
  authUid: string | null,
): Promise<ChatMutationResponse> {
  if (!authUid) {
    throw new HttpsError("unauthenticated", "You must be signed in to do this.");
  }

  const chatId = requireString(data, "chatId");
  const ref = db.collection(CHATS).doc(chatId);

  const staffSnap = await db.collection("staffs").doc(authUid).get();
  const staff = staffSnap.exists
    ? (staffSnap.data() as Record<string, unknown>)
    : null;
  const isStaff =
    !!staff && staff.Status !== "Archived" && staff.LiveChat === true;

  let notifyTargets: string[] = [];

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Chat not found.");
    const chat = (snap.data() ?? {}) as Record<string, unknown>;
    if (chat.Status === "closed") {
      throw new HttpsError("failed-precondition", "This chat is already closed.");
    }
    notifyTargets = [];

    let closedBy: string;
    let closedByName: string;
    let closedByRole: "staff" | "patron";

    if (isStaff) {
      closedBy = String(staff?.StaffCode || staff?.UID || authUid);
      closedByName =
        `${String(staff?.FirstName ?? "")} ${String(staff?.LastName ?? "")}`.trim() ||
        closedBy;
      closedByRole = "staff";
    } else {
      const participants = Array.isArray(chat.Participants)
        ? (chat.Participants as string[])
        : [];
      if (!participants.includes(authUid)) {
        throw new HttpsError(
          "permission-denied",
          "This is not your conversation.",
        );
      }
      closedBy = authUid;
      closedByName = String(chat.StartedByName || "The patron");
      closedByRole = "patron";
    }

    tx.update(ref, {
      Status: "closed",
      ClosedBy: closedBy,
      ClosedByName: closedByName,
      ClosedByRole: closedByRole,
      ClosedOn: serverTimestamp(),
    });

    if (closedByRole === "staff") {
      notifyTargets = (
        Array.isArray(chat.Participants) ? (chat.Participants as string[]) : []
      ).filter((participant) => participant && participant !== authUid);
    }
  });

  await Promise.all(
    notifyTargets.map((uid) =>
      notifyPatronByUid(db, uid, {
        title: "Conversation Closed",
        content:
          "A librarian has closed your conversation at the reference desk. If you still need help, start a new one and the desk will pick it up.",
        type: "chat",
      }),
    ),
  );

  return { success: true, message: "Chat ended." };
}

export async function chatRate(
  data: Payload,
  authUid: string | null,
): Promise<ChatMutationResponse> {
  if (!authUid) {
    throw new HttpsError("unauthenticated", "You must be signed in to do this.");
  }

  const chatId = requireString(data, "chatId");

  const rating = Math.round(Number(data.Rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new HttpsError(
      "invalid-argument",
      "Choose a rating from 1 to 5 stars.",
    );
  }
  const comment = String(data.Comment ?? "")
    .trim()
    .slice(0, RATING_COMMENT_LIMIT);

  const ref = db.collection(CHATS).doc(chatId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Chat not found.");
    const chat = (snap.data() ?? {}) as Payload;

    if (String(chat.StartedByUID ?? "") !== authUid) {
      throw new HttpsError(
        "permission-denied",
        "Only the person who started this conversation can rate it.",
      );
    }
    if (chat.Status !== "closed") {
      throw new HttpsError(
        "failed-precondition",
        "You can rate the conversation once it has ended.",
      );
    }
    if (Number(chat.Rating) > 0) {
      throw new HttpsError(
        "failed-precondition",
        "This conversation has already been rated.",
      );
    }

    tx.update(ref, {
      Rating: rating,
      RatingComment: comment,
      RatedOn: serverTimestamp(),
    });
  });

  return { success: true, message: "Thanks for the feedback." };
}

export async function chatMarkRead(
  data: Payload,
  authUid: string | null,
): Promise<ChatMutationResponse> {
  if (!authUid) throw new HttpsError("unauthenticated", "Sign in first.");

  const chatId = requireString(data, "chatId");
  const ref = db.collection(CHATS).doc(chatId);

  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Chat not found.");
  const chat = snap.data() as Record<string, unknown>;

  const staffSnap = await db.collection("staffs").doc(authUid).get();
  const isStaff =
    staffSnap.exists &&
    (staffSnap.data() as Record<string, unknown>).LiveChat === true;

  if (!isStaff) {
    const participants = Array.isArray(chat.Participants)
      ? (chat.Participants as string[])
      : [];
    if (!participants.includes(authUid)) {
      throw new HttpsError("permission-denied", "This is not your conversation.");
    }
  }

  await ref.update({ [isStaff ? "UnreadStaff" : "UnreadPatron"]: 0 });
  return { success: true, message: "Marked as read." };
}
