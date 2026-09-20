import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth/use-auth";
import { useLiveChat } from "@/features/lms/library-desk/api/use-live-chat";
import {
  clearTyping,
  publishTyping,
} from "@/features/lms/library-desk/api/chat-presence";
import {
  endChat,
  markChatRead,
  sendChatMessage,
  takeChat,
} from "@/features/lms/library-desk/api/chat-mutations";
import { CHAT_ROLE } from "@/features/lms/library-desk/api/desk-sections";
import { fetchChatByIdApi } from "@/features/lms/library-desk/api/desk-api";
import type { PersonDetails } from "@/features/lms/library-desk/types/chat-types";

export interface ModalState {
  type: "success" | "error";
  message: string;
}

const TYPING_IDLE_MS = 2500;

export function useConversationView() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user, staffRoles, staffCode, profile } = useAuth();

  const ownUid = user?.uid ?? null;
  const canManage = !!staffRoles?.[CHAT_ROLE];
  const {
    chat,
    messages,
    loading,
    error,
    otherTyping,
    canLoadEarlier,
    loadEarlier,
    loadingEarlier,
  } = useLiveChat(
    id || null,
    ownUid,
  );

  const [patronInfo, setPatronInfo] = useState<PersonDetails | null>(null);
  const [patronAvatar, setPatronAvatar] = useState("");
  const isGuestChat = chat?.IsGuest;
  useEffect(() => {
    if (!id || !staffCode || isGuestChat !== false) {
      setPatronInfo(null);
      setPatronAvatar("");
      return;
    }
    let live = true;
    void (async () => {
      const detail = await fetchChatByIdApi(id, staffCode);
      if (!live) return;
      setPatronInfo(detail?.PatronInfo ?? null);
      setPatronAvatar(detail?.PatronAvatar ?? "");
    })();
    return () => {
      live = false;
    };
  }, [id, staffCode, isGuestChat]);

  const detail = useMemo(
    () =>
      chat ? { ...chat, PatronInfo: patronInfo, PatronAvatar: patronAvatar } : null,
    [chat, patronInfo, patronAvatar],
  );

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);
  const readMarkedRef = useRef<string | null>(null);

  const isMine = !!staffCode && chat?.TakenBy === staffCode;
  const isClosed = chat?.Status === "closed";

  const heldByOther =
    chat?.Status === "active" && !!chat.TakenBy && !isMine;
  const senderName = profile?.firstName || staffCode || "The librarian";

  useEffect(() => {
    if (!chat || heldByOther || readMarkedRef.current === chat.id) return;
    readMarkedRef.current = chat.id;
    markChatRead(chat.id);
  }, [chat, heldByOther]);

  const onDraftChange = useCallback(
    (value: string): void => {
      setDraft(value);
      if (!id || !isMine || !ownUid) return;

      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        void publishTyping(id, ownUid, "staff", senderName, true);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        typingActiveRef.current = false;
        void publishTyping(id, ownUid, "staff", senderName, false);
      }, TYPING_IDLE_MS);
    },
    [id, isMine, ownUid, senderName],
  );

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (typingActiveRef.current && id && ownUid) clearTyping(id, ownUid);
    },
    [id, ownUid],
  );

  const send = useCallback(async (): Promise<void> => {
    const text = draft.trim();
    if (!text || !id || !ownUid) return;

    setDraft("");
    setSending(true);
    setModal(null);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingActiveRef.current = false;
    clearTyping(id, ownUid);

    try {
      await sendChatMessage(id, text, {
        uid: ownUid,
        name: senderName,
        role: "staff",
      });
    } catch (err) {
      setDraft(text);
      setModal({
        type: "error",
        message:
          err instanceof Error ? err.message : "Could not send the message.",
      });
    } finally {
      setSending(false);
    }
  }, [draft, id, ownUid, senderName]);

  const take = useCallback(async (): Promise<void> => {
    if (!id) return;
    setActionBusy(true);
    setModal(null);
    try {
      await takeChat(id);
      setModal({ type: "success", message: "Chat assigned to you." });
    } catch (err) {
      setModal({
        type: "error",
        message: err instanceof Error ? err.message : "Could not take this chat.",
      });
    } finally {
      setActionBusy(false);
    }
  }, [id]);

  const confirmEnd = useCallback(async (): Promise<void> => {
    if (!id) return;
    setEnding(true);
    setModal(null);
    try {
      await endChat(id);
      setEndOpen(false);
      navigate("/lms/library-desk/conversations");
    } catch (err) {
      setModal({
        type: "error",
        message: err instanceof Error ? err.message : "Could not end this chat.",
      });
    } finally {
      setEnding(false);
    }
  }, [id, navigate]);

  return {
    chat: detail,
    messages,
    loading,
    error,
    otherTyping,
    canLoadEarlier,
    loadEarlier,
    loadingEarlier,
    canManage,
    staffCode: staffCode ?? "",
    ownUid: ownUid ?? "",
    isMine,
    isClosed,
    heldByOther,
    draft,
    onDraftChange,
    send,
    sending,
    actionBusy,
    take,
    modal,
    setModal,
    endOpen,
    openEnd: () => {
      setEndOpen(true);
    },
    cancelEnd: () => setEndOpen(false),
    ending,
    confirmEnd,
  } as const;
}
