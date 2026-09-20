import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useOtherTyping } from "@/features/lms/library-desk/api/chat-presence";
import type {
  ChatDetail,
  ChatMessage,
  ChatStatus,
  GuestInfo,
} from "@/features/lms/library-desk/types/chat-types";

const MESSAGE_WINDOW = 50;

function toMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object") {
    const candidate = value as { toDate?: () => Date; seconds?: number };
    if (typeof candidate.toDate === "function") {
      try {
        return candidate.toDate().getTime();
      } catch {
        return null;
      }
    }
    if (typeof candidate.seconds === "number") return candidate.seconds * 1000;
  }
  return null;
}

function readStatus(value: unknown): ChatStatus {
  return value === "closed" || value === "active" || value === "waiting"
    ? value
    : "waiting";
}

export interface LiveChatState {
  chat: ChatDetail | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  otherTyping: boolean;
  typingName: string;
  canLoadEarlier: boolean;
  loadEarlier: () => void;
  loadingEarlier: boolean;
}

export interface LiveChatOptions {
  transcript?: boolean;
}

export function useLiveChat(
  chatId: string | null,
  ownUid: string | null,
  options?: LiveChatOptions,
): LiveChatState {
  const transcript = options?.transcript ?? true;
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(!!chatId);
  const [loadingMessages, setLoadingMessages] = useState(!!chatId);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const [expanded, setExpanded] = useState<{ id: string | null; size: number }>(
    { id: chatId, size: MESSAGE_WINDOW },
  );
  const windowSize = expanded.id === chatId ? expanded.size : MESSAGE_WINDOW;
  const loadEarlier = useCallback(() => {
    setExpanded({ id: chatId, size: windowSize + MESSAGE_WINDOW });
  }, [chatId, windowSize]);

  useEffect(() => {
    mountedRef.current = true;
    if (!chatId) {
      setChat(null);
      setLoadingChat(false);
      return () => {
        mountedRef.current = false;
      };
    }

    setLoadingChat(true);
    setError(null);

    const stop = onSnapshot(
      doc(db, "chats", chatId),
      (snapshot) => {
        if (!mountedRef.current) return;
        if (!snapshot.exists()) {
          setError("This conversation no longer exists.");
          setChat(null);
          setLoadingChat(false);
          return;
        }
        const data = snapshot.data() as Record<string, unknown>;
        const guest = data.GuestInfo as Record<string, unknown> | undefined;

        setChat({
          id: snapshot.id,
          ChatNumber: Number(data.ChatNumber) || 0,
          StartedByName: String(data.StartedByName ?? ""),
          IsGuest: data.IsGuest === true || !!guest,
          Concern: String(data.Concern ?? ""),
          Status: readStatus(data.Status),
          TakenBy: String(data.TakenBy ?? ""),
          TakenByName: String(data.TakenByName ?? ""),
          TakenByAvatar: String(data.TakenByAvatar ?? ""),
          MessageCount: Number(data.MessageCount) || 0,
          Unread: 0,
          LastMessageText: String(data.LastMessageText ?? ""),
          LastMessageAt: toMillis(data.LastMessageAt),
          StartedOn: toMillis(data.StartedOn),
          ClosedOn: toMillis(data.ClosedOn),
          ClosedByRole: String(data.ClosedByRole ?? ""),
          Rating: Number(data.Rating) || 0,
          RatingComment: String(data.RatingComment ?? ""),
          GuestInfo: guest
            ? ({
                FullName: String(guest.FullName ?? ""),
                School: String(guest.School ?? ""),
                City: String(guest.City ?? ""),
                Barangay: String(guest.Barangay ?? ""),
                Age: String(guest.Age ?? ""),
              } as GuestInfo)
            : null,
          PatronInfo: null,
          PatronAvatar: "",
        });
        setLoadingChat(false);
      },
      (err) => {
        if (!mountedRef.current) return;
        setError(err?.message || "Lost the connection to this conversation.");
        setLoadingChat(false);
      },
    );

    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !transcript) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    if (windowSize === MESSAGE_WINDOW) setLoadingMessages(true);
    else setLoadingEarlier(true);

    const stop = onSnapshot(
      query(
        collection(db, "chats", chatId, "messages"),
        orderBy("CreatedOn", "asc"),
        limitToLast(windowSize),
      ),
      (snapshot) => {
        setMessages(
          snapshot.docs.map((entry) => {
            const data = entry.data({ serverTimestamps: "estimate" }) as Record<
              string,
              unknown
            >;
            return {
              id: entry.id,
              SenderUID: String(data.SenderUID ?? ""),
              SenderName: String(data.SenderName ?? ""),
              SenderRole: data.SenderRole === "staff" ? "staff" : "patron",
              Text: String(data.Text ?? ""),
              CreatedOn: toMillis(data.CreatedOn),
              pending: entry.metadata.hasPendingWrites,
            } satisfies ChatMessage;
          }),
        );
        setLoadingMessages(false);
        setLoadingEarlier(false);
      },
      (err) => {
        setError(err?.message || "Could not load this conversation.");
        setLoadingMessages(false);
        setLoadingEarlier(false);
      },
    );

    return stop;
  }, [chatId, transcript, windowSize]);

  const { typing, name } = useOtherTyping(transcript ? chatId : null, ownUid);

  return useMemo(
    () => ({
      chat,
      messages,
      loading: loadingChat || loadingMessages,
      error,
      otherTyping: typing,
      typingName: name,
      canLoadEarlier: transcript && !!chat && messages.length < chat.MessageCount,
      loadEarlier,
      loadingEarlier,
    }),
    [
      chat,
      messages,
      loadingChat,
      loadingMessages,
      error,
      typing,
      name,
      transcript,
      loadEarlier,
      loadingEarlier,
    ],
  );
}
