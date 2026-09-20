import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth/use-auth";
import {
  fetchUpdateByIdApi,
  isAnnouncementRecord,
} from "@/features/lms/library-desk/api/desk-api";
import {
  deleteNews,
  publishNews,
  updateNews,
} from "@/features/lms/library-desk/api/updates-mutations";
import { useUpdatesUploads } from "@/features/lms/library-desk/api/use-updates-uploads";
import { UPDATES_ROLE } from "@/features/lms/library-desk/api/desk-sections";
import type { NewsSubmitPayload } from "@/features/lms/library-desk/components/NewsFormModal";
import type {
  NewsRecord,
} from "@/features/lms/library-desk/types/updates-types";

export interface ModalState {
  type: "success" | "error";
  message: string;
}

export function useNewsView() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { staffRoles } = useAuth();
  const { uploadCover } = useUpdatesUploads();

  const canManage = !!staffRoles?.[UPDATES_ROLE];

  const [record, setRecord] = useState<NewsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveConfirmed, setArchiveConfirmed] = useState(false);
  const [archiveProcessing, setArchiveProcessing] = useState(false);

  const mountedRef = useRef(true);

  const load = useCallback(
    async (isRefresh?: boolean): Promise<void> => {
      if (!id) return;
      setLoadError(null);
      const result = await fetchUpdateByIdApi(id, isRefresh);
      if (!mountedRef.current) return;

      if (!result) {
        setLoadError("Could not load this news item.");
        setLoading(false);
        return;
      }
      if (isAnnouncementRecord(result)) {
        navigate(`/lms/library-desk/announcements/view/${id}`, { replace: true });
        return;
      }
      setRecord(result);
      setLoading(false);
    },
    [id, navigate],
  );

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const saveEdit = useCallback(
    async (payload: NewsSubmitPayload): Promise<void> => {
      if (!record) return;
      setSubmitting(true);
      setModal(null);
      try {
        let imageUrl = payload.currentImageUrl;
        if (payload.newCover) {
          imageUrl = await uploadCover(record.id, payload.newCover);
        }

        await updateNews(record.id, {
          Title: payload.Title,
          Description: payload.Description,
          Tags: payload.Tags,
          ImageURL: imageUrl,
          URL: payload.URL,
          MainAuthor: payload.MainAuthor,
          Location: payload.Location,
        });

        if (payload.publish && record.Status === "Draft") {
          await publishNews(record.id);
        }

        setEditOpen(false);
        setModal({ type: "success", message: "News updated." });
        await load(true);
      } catch (error) {
        setModal({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not update the news item.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [record, uploadCover, load],
  );

  const publish = useCallback(async (): Promise<void> => {
    if (!record) return;
    setActionBusy(true);
    setModal(null);
    try {
      await publishNews(record.id);
      setModal({ type: "success", message: "News published." });
      await load(true);
    } catch (error) {
      setModal({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not publish the news item.",
      });
    } finally {
      setActionBusy(false);
    }
  }, [record, load]);

  const confirmArchive = useCallback(async (): Promise<void> => {
    if (!record) return;
    setArchiveProcessing(true);
    setModal(null);
    try {
      await deleteNews(record.id);
      setArchiveOpen(false);
      setArchiveConfirmed(false);
      navigate("/lms/library-desk/news");
    } catch (error) {
      setModal({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete the news item.",
      });
      setArchiveProcessing(false);
    }
  }, [record, navigate]);

  return {
    record,
    loading,
    loadError,
    reload: () => load(true),
    canManage,
    modal,
    setModal,
    editOpen,
    openEdit: () => setEditOpen(true),
    closeEdit: () => setEditOpen(false),
    submitting,
    actionBusy,
    saveEdit,
    publish,
    archiveOpen,
    openArchive: () => {
      setArchiveConfirmed(false);
      setArchiveOpen(true);
    },
    cancelArchive: () => setArchiveOpen(false),
    archiveConfirmed,
    setArchiveConfirmed,
    archiveProcessing,
    confirmArchive,
  } as const;
}
