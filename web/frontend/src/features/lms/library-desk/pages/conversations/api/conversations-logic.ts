import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { useDeskRecords } from "@/features/lms/library-desk/api/desk-list-logic";
import { useChatBadge } from "@/features/lms/library-desk/api/use-chat-badge";
import { endChat, takeChat } from "@/features/lms/library-desk/api/chat-mutations";
import { CHAT_ROLE } from "@/features/lms/library-desk/api/desk-sections";
import { CHAT_CONCERNS } from "@/lib/constants/hardcoded-constants";
import type { ChatRow } from "@/features/lms/library-desk/types/chat-types";

export interface ModalState {
  type: "success" | "error";
  message: string;
}

export function useConversationsPage() {
  const list = useDeskRecords("conversations");
  const { staffRoles, staffCode } = useAuth();

  const canManage = !!staffRoles?.[CHAT_ROLE];

  const [modal, setModal] = useState<ModalState | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [endTarget, setEndTarget] = useState<ChatRow | null>(null);
  const [ending, setEnding] = useState(false);

  const { version: queueVersion } = useChatBadge();
  const seenVersionRef = useRef<number | null>(null);
  const refreshList = list.refresh;

  useEffect(() => {
    if (seenVersionRef.current === null) {
      seenVersionRef.current = queueVersion;
      return;
    }
    if (seenVersionRef.current === queueVersion) return;
    seenVersionRef.current = queueVersion;
    void refreshList();
  }, [queueVersion, refreshList]);

  const availableConcerns = useMemo(() => [...CHAT_CONCERNS], []);

  const markBusy = useCallback((id: string, busy: boolean) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const take = useCallback(
    async (row: ChatRow): Promise<void> => {
      markBusy(row.id, true);
      setModal(null);
      try {
        await takeChat(row.id);
        setModal({ type: "success", message: "Chat assigned to you." });
        await list.refresh();
      } catch (error) {
        setModal({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not take this chat.",
        });
        await list.refresh();
      } finally {
        markBusy(row.id, false);
      }
    },
    [markBusy, list],
  );

  const requestEnd = useCallback((row: ChatRow) => {
    setEndTarget(row);
  }, []);

  const confirmEnd = useCallback(async (): Promise<void> => {
    if (!endTarget) return;
    setEnding(true);
    setModal(null);
    try {
      await endChat(endTarget.id);
      list.suppressRow(endTarget.id);
      setEndTarget(null);
      setModal({ type: "success", message: "Chat ended." });
      await list.refresh();
    } catch (error) {
      setModal({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not end this chat.",
      });
    } finally {
      setEnding(false);
    }
  }, [endTarget, list]);

  return {
    list,
    canManage,
    staffCode: staffCode ?? "",
    availableConcerns,
    modal,
    setModal,
    processingIds,
    take,
    endTarget,
    requestEnd,
    cancelEnd: () => setEndTarget(null),
    ending,
    confirmEnd,
  } as const;
}
