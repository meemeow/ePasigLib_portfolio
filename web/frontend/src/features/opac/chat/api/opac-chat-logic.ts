import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth/use-auth";
import { useLiveChat } from "@/features/lms/library-desk/api/use-live-chat";
import {
  clearTyping,
  publishTyping,
} from "@/features/lms/library-desk/api/chat-presence";
import {
  endChat,
  markChatRead,
  rateChat,
  sendChatMessage,
  startChat,
} from "@/features/lms/library-desk/api/chat-mutations";
import { ensureChatIdentity } from "@/features/opac/chat/api/chat-session";
import { clearFaqLog } from "@/features/opac/chat/api/faq-session";
import type { GuestInfo } from "@/features/lms/library-desk/types/chat-types";

const STORAGE_KEY = "opac_active_chat";

const TYPING_IDLE_MS = 2500;

interface StoredChat {
  id: string;
  uid: string;
}

function readStoredChat(): StoredChat | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as StoredChat).id !== "string" ||
      typeof (parsed as StoredChat).uid !== "string"
    ) {
      return null;
    }
    return parsed as StoredChat;
  } catch {
    return null;
  }
}

function storeChat(chat: StoredChat | null): void {
  try {
    if (chat) localStorage.setItem(STORAGE_KEY, JSON.stringify(chat));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export interface StartFormValues {
  Concern: string;
  Description: string;
  guest: GuestInfo;
}

export function useOpacChat() {
  const { user, profile } = useAuth();
  const isSignedIn = !!user;

  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(
    () => readStoredChat()?.id ?? null,
  );
  const [ownUid, setOwnUid] = useState<string | null>(null);

  const [authUid, setAuthUid] = useState<string | null>(
    () => auth.currentUser?.uid ?? null,
  );
  useEffect(
    () => onAuthStateChanged(auth, (account) => setAuthUid(account?.uid ?? null)),
    [],
  );

  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open && !chatId) return;
    let live = true;
    void (async () => {
      try {
        const uid = await ensureChatIdentity();
        if (live) setOwnUid(uid);
      } catch (err) {
        if (!live) return;
        if (!open) return;
        setError(
          err instanceof Error && /operation-not-allowed/.test(err.message)
            ? "Chat is unavailable right now. Please try again later."
            : "Could not connect to the chat service.",
        );
      }
    })();
    return () => {
      live = false;
    };
  }, [open, chatId]);

  const {
    chat,
    messages,
    loading,
    error: liveError,
    otherTyping,
    canLoadEarlier,
    loadEarlier,
    loadingEarlier,
  } = useLiveChat(
    ownUid ? chatId : null,
    ownUid,
    { transcript: open },
  );

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);
  const readMarkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authUid) return;
    setOwnUid(authUid);
    const stored = readStoredChat();
    if (!stored || stored.uid === authUid) return;
    storeChat(null);
    setChatId(null);
    setDraft("");
    setError(null);
    readMarkedRef.current = null;
  }, [authUid]);

  useEffect(() => {
    if (!liveError || !chatId) return;
    if (!/permission|insufficient/i.test(liveError)) return;
    storeChat(null);
    setChatId(null);
    readMarkedRef.current = null;
  }, [liveError, chatId]);

  const isClosed = chat?.Status === "closed";
  const senderName = chat?.StartedByName || profile?.firstName || "You";

  useEffect(() => {
    if (isClosed) storeChat(null);
  }, [isClosed]);

  const markConversationRead = useCallback(() => {
    if (!chat || readMarkedRef.current === chat.id) return;
    readMarkedRef.current = chat.id;
    markChatRead(chat.id);
  }, [chat]);

  const start = useCallback(
    async (values: StartFormValues): Promise<void> => {
      setStarting(true);
      setError(null);
      try {
        const uid = await ensureChatIdentity();
        setOwnUid(uid);

        const result = await startChat({
          Concern: values.Concern,
          Description: values.Description,
          ...(isSignedIn ? {} : { GuestInfo: values.guest }),
        });
        setChatId(result.id);
        storeChat({ id: result.id, uid });
        clearFaqLog();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not start the chat.",
        );
      } finally {
        setStarting(false);
      }
    },
    [isSignedIn],
  );

  const onDraftChange = useCallback(
    (value: string): void => {
      setDraft(value);
      if (!chatId || !ownUid || isClosed) return;
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        void publishTyping(chatId, ownUid, "patron", senderName, true);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        typingActiveRef.current = false;
        void publishTyping(chatId, ownUid, "patron", senderName, false);
      }, TYPING_IDLE_MS);
    },
    [chatId, ownUid, isClosed, senderName],
  );

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (typingActiveRef.current && chatId && ownUid) {
        clearTyping(chatId, ownUid);
      }
    },
    [chatId, ownUid],
  );

  const send = useCallback(async (): Promise<void> => {
    const text = draft.trim();
    if (!text || !chatId || !ownUid) return;

    setDraft("");
    setSending(true);
    setError(null);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingActiveRef.current = false;
    clearTyping(chatId, ownUid);

    try {
      await sendChatMessage(chatId, text, {
        uid: ownUid,
        name: senderName,
        role: "patron",
      });
    } catch (err) {
      setDraft(text);
      setError(
        err instanceof Error ? err.message : "Could not send the message.",
      );
    } finally {
      setSending(false);
    }
  }, [draft, chatId, ownUid, senderName]);

  const [ending, setEnding] = useState(false);

  const end = useCallback(async (): Promise<void> => {
    if (!chatId) return;
    setEnding(true);
    setError(null);
    try {
      await endChat(chatId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not end the conversation.",
      );
    } finally {
      setEnding(false);
    }
  }, [chatId]);

  const [rating, setRating] = useState(false);
  const canRate = !!chat && isClosed && chat.Rating === 0;

  const rate = useCallback(
    async (stars: number, comment: string): Promise<boolean> => {
      if (!chatId) return false;
      setRating(true);
      setError(null);
      try {
        await rateChat(chatId, stars, comment);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not save your rating.",
        );
        return false;
      } finally {
        setRating(false);
      }
    },
    [chatId],
  );

  const reset = useCallback((): void => {
    setChatId(null);
    storeChat(null);
    setDraft("");
    setError(null);
    readMarkedRef.current = null;
  }, []);

  return {
    open,
    setOpen,
    isSignedIn,
    patronName: profile?.firstName ?? "",
    chatId,
    chat,
    messages,
    ownUid: ownUid ?? "",
    isClosed,
    loading,
    error: error ?? liveError,
    setError,
    otherTyping,
    canLoadEarlier,
    loadEarlier,
    loadingEarlier,
    starting,
    start,
    markConversationRead,
    draft,
    onDraftChange,
    send,
    sending,
    end,
    ending,
    canRate,
    rate,
    rating,
    reset,
  } as const;
}
