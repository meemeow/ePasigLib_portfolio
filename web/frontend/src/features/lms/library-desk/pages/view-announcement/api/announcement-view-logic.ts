import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth/use-auth";
import {
  fetchUpdateByIdApi,
  isAnnouncementRecord,
} from "@/features/lms/library-desk/api/desk-api";
import {
  deleteAnnouncement,
  createReply,
  deleteReply,
  publishAnnouncement,
  updateAnnouncement,
  updateReply,
} from "@/features/lms/library-desk/api/updates-mutations";
import { useUpdatesUploads } from "@/features/lms/library-desk/api/use-updates-uploads";
import { UPDATES_ROLE } from "@/features/lms/library-desk/api/desk-sections";
import type { AnnouncementSubmitPayload } from "@/features/lms/library-desk/components/AnnouncementFormModal";
import type { ReplySubmitPayload } from "@/features/lms/library-desk/components/ReplyFormModal";
import type {
  AnnouncementRecord,
  AnnouncementReplyRecord,
} from "@/features/lms/library-desk/types/updates-types";

export interface ModalState {
  type: "success" | "error";
  message: string;
}

export function useAnnouncementView() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { staffRoles } = useAuth();
  const { uploadFiles } = useUpdatesUploads();

  const canManage = !!staffRoles?.[UPDATES_ROLE];

  const [record, setRecord] = useState<AnnouncementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [editingReply, setEditingReply] =
    useState<AnnouncementReplyRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveConfirmed, setArchiveConfirmed] = useState(false);
  const [archiveProcessing, setArchiveProcessing] = useState(false);

  const [replyToDelete, setReplyToDelete] =
    useState<AnnouncementReplyRecord | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mountedRef = useRef(true);

  const load = useCallback(
    async (isRefresh?: boolean): Promise<void> => {
      if (!id) return;
      setLoadError(null);
      const result = await fetchUpdateByIdApi(id, isRefresh);
      if (!mountedRef.current) return;

      if (!result) {
        setLoadError("Could not load this announcement.");
        setLoading(false);
        return;
      }
      if (!isAnnouncementRecord(result)) {
        navigate(`/lms/library-desk/news/view/${id}`, { replace: true });
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
    async (payload: AnnouncementSubmitPayload): Promise<void> => {
      if (!record) return;
      setSubmitting(true);
      setModal(null);
      try {
        let files = payload.keptFiles;
        if (payload.newFiles.length > 0) {
          const uploaded = await uploadFiles(record.id, payload.newFiles);
          files = [...files, ...uploaded];
        }
        await updateAnnouncement(record.id, {
          Subject: payload.Subject,
          Message: payload.Message,
          Files: files,
        });
        if (payload.publish && record.Status === "Draft") {
          await publishAnnouncement(record.id);
        }
        setEditOpen(false);
        setModal({ type: "success", message: "Announcement updated." });
        await load(true);
      } catch (error) {
        setModal({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not update the announcement.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [record, uploadFiles, load],
  );

  const submitReply = useCallback(
    async (payload: ReplySubmitPayload): Promise<void> => {
      if (!record) return;
      setSubmitting(true);
      setModal(null);
      try {
        let files = payload.keptFiles;
        if (payload.newFiles.length > 0) {
          const uploaded = await uploadFiles(
            record.id,
            payload.newFiles,
            "reply",
          );
          files = [...files, ...uploaded];
        }

        if (editingReply) {
          await updateReply(record.id, editingReply.ReplyID, {
            Subject: payload.Subject,
            Message: payload.Message,
            Files: files,
          });
        } else {
          await createReply(record.id, {
            Subject: payload.Subject,
            Message: payload.Message,
            Files: files,
          });
        }

        setReplyOpen(false);
        setEditingReply(null);
        setModal({
          type: "success",
          message: editingReply ? "Reply updated." : "Reply posted.",
        });
        await load(true);
      } catch (error) {
        setModal({
          type: "error",
          message:
            error instanceof Error ? error.message : "Could not save the reply.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [record, editingReply, uploadFiles, load],
  );

  const publish = useCallback(async (): Promise<void> => {
    if (!record) return;
    setActionBusy(true);
    setModal(null);
    try {
      await publishAnnouncement(record.id);
      setModal({ type: "success", message: "Announcement published." });
      await load(true);
    } catch (error) {
      setModal({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not publish the announcement.",
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
      await deleteAnnouncement(record.id);
      setArchiveOpen(false);
      setArchiveConfirmed(false);
      navigate("/lms/library-desk/announcements");
    } catch (error) {
      setModal({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete the announcement.",
      });
      setArchiveProcessing(false);
    }
  }, [record, navigate]);

  const confirmDeleteReply = useCallback(async (): Promise<void> => {
    if (!record || !replyToDelete) return;
    setDeleting(true);
    setModal(null);
    try {
      await deleteReply(record.id, replyToDelete.ReplyID);
      setReplyToDelete(null);
      setDeleteConfirmed(false);
      setModal({ type: "success", message: "Reply deleted." });
      await load(true);
    } catch (error) {
      setModal({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete the reply.",
      });
    } finally {
      setDeleting(false);
    }
  }, [record, replyToDelete, load]);

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

    replyOpen,
    editingReply,
    openReply: () => {
      setEditingReply(null);
      setReplyOpen(true);
    },
    openReplyEdit: (reply: AnnouncementReplyRecord) => {
      setEditingReply(reply);
      setReplyOpen(true);
    },
    closeReply: () => {
      setReplyOpen(false);
      setEditingReply(null);
    },

    submitting,
    actionBusy,
    saveEdit,
    submitReply,
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

    replyToDelete,
    requestDeleteReply: (reply: AnnouncementReplyRecord) => {
      setDeleteConfirmed(false);
      setReplyToDelete(reply);
    },
    cancelDeleteReply: () => setReplyToDelete(null),
    deleteConfirmed,
    setDeleteConfirmed,
    deleting,
    confirmDeleteReply,
  } as const;
}
