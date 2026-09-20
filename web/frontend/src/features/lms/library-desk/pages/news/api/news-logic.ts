import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { useDeskRecords } from "@/features/lms/library-desk/api/desk-list-logic";
import {
  createNews,
  deleteNews,
  publishNews,
  updateNews,
} from "@/features/lms/library-desk/api/updates-mutations";
import { useUpdatesUploads } from "@/features/lms/library-desk/api/use-updates-uploads";
import { UPDATES_ROLE } from "@/features/lms/library-desk/api/desk-sections";
import type { NewsSubmitPayload } from "@/features/lms/library-desk/components/NewsFormModal";
import type {
  NewsRow,
} from "@/features/lms/library-desk/types/updates-types";

export interface ModalState {
  type: "success" | "error";
  message: string;
}

export function useNewsPage() {
  const list = useDeskRecords("news");
  const { staffRoles } = useAuth();
  const { uploadCover } = useUpdatesUploads();

  const canManage = !!staffRoles?.[UPDATES_ROLE];

  const [modal, setModal] = useState<ModalState | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<NewsRow | null>(null);
  const [archiveConfirmed, setArchiveConfirmed] = useState(false);
  const [archiveProcessing, setArchiveProcessing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const availableTags = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of list.paginated) {
      for (const tag of row.Tags) {
        const key = tag.toLowerCase();
        if (!seen.has(key)) seen.set(key, tag);
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [list.paginated]);

  const markBusy = useCallback((id: string, busy: boolean) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const openCreate = useCallback(() => {
    setModal(null);
    setFormOpen(true);
  }, []);

  const submitNews = useCallback(
    async (payload: NewsSubmitPayload): Promise<void> => {
      setSubmitting(true);
      setModal(null);
      try {
        const created = await createNews(
          {
            Title: payload.Title,
            Description: payload.Description,
            Tags: payload.Tags,
            ImageURL: "",
            URL: payload.URL,
            MainAuthor: payload.MainAuthor,
            Location: payload.Location,
          },
          payload.publish && !payload.newCover,
        );

        if (payload.newCover) {
          const url = await uploadCover(created.id, payload.newCover);
          await updateNews(created.id, {
            Title: payload.Title,
            Description: payload.Description,
            Tags: payload.Tags,
            ImageURL: url,
            URL: payload.URL,
            MainAuthor: payload.MainAuthor,
            Location: payload.Location,
          });
        }

        if (payload.publish && payload.newCover) {
          await publishNews(created.id);
        }

        setFormOpen(false);
        setModal({
          type: "success",
          message: payload.publish
            ? "News published."
            : "News saved as a draft.",
        });
        await list.refresh();
      } catch (error) {
        setModal({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not save the news item.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [uploadCover, list],
  );

  const publishRow = useCallback(
    async (row: NewsRow): Promise<void> => {
      markBusy(row.id, true);
      setModal(null);
      try {
        await publishNews(row.id);
        setModal({ type: "success", message: "News published." });
        await list.refresh();
      } catch (error) {
        setModal({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not publish the news item.",
        });
      } finally {
        markBusy(row.id, false);
      }
    },
    [markBusy, list],
  );

  const requestArchive = useCallback((row: NewsRow) => {
    setArchiveConfirmed(false);
    setArchiveTarget(row);
  }, []);

  const confirmArchive = useCallback(async (): Promise<void> => {
    if (!archiveTarget) return;
    setArchiveProcessing(true);
    setModal(null);
    try {
      await deleteNews(archiveTarget.id);
      list.suppressRow(archiveTarget.id);
      setModal({ type: "success", message: "News deleted." });
      setArchiveTarget(null);
      setArchiveConfirmed(false);
      await list.refresh();
    } catch (error) {
      setModal({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete the news item.",
      });
    } finally {
      setArchiveProcessing(false);
    }
  }, [archiveTarget, list]);

  return {
    list,
    canManage,
    availableTags,
    modal,
    setModal,
    formOpen,
    openCreate,
    closeForm: () => setFormOpen(false),
    submitting,
    submitNews,
    publishRow,
    processingIds,
    archiveTarget,
    requestArchive,
    cancelArchive: () => setArchiveTarget(null),
    archiveConfirmed,
    setArchiveConfirmed,
    archiveProcessing,
    confirmArchive,
  } as const;
}
