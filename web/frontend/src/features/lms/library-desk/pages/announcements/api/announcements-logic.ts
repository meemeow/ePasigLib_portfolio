import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { useDeskRecords } from "@/features/lms/library-desk/api/desk-list-logic";
import {
  deleteAnnouncement,
  createAnnouncement,
  publishAnnouncement,
  updateAnnouncement,
} from "@/features/lms/library-desk/api/updates-mutations";
import { useUpdatesUploads } from "@/features/lms/library-desk/api/use-updates-uploads";
import { UPDATES_ROLE } from "@/features/lms/library-desk/api/desk-sections";
import type { AnnouncementSubmitPayload } from "@/features/lms/library-desk/components/AnnouncementFormModal";
import type {
  AnnouncementRecord,
  AnnouncementRow,
} from "@/features/lms/library-desk/types/updates-types";

export interface ModalState {
  type: "success" | "error";
  message: string;
}

export function useAnnouncementsPage() {
  const list = useDeskRecords("announcements");
  const { staffRoles } = useAuth();
  const { uploadFiles } = useUpdatesUploads();

  const canManage = !!staffRoles?.[UPDATES_ROLE];

  const [modal, setModal] = useState<ModalState | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<AnnouncementRow | null>(
    null,
  );
  const [archiveConfirmed, setArchiveConfirmed] = useState(false);
  const [archiveProcessing, setArchiveProcessing] = useState(false);

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const markBusy = useCallback((id: string, busy: boolean) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const openCompose = useCallback(() => {
    setModal(null);
    setFormOpen(true);
  }, []);

  const submitAnnouncement = useCallback(
    async (payload: AnnouncementSubmitPayload): Promise<void> => {
      setSubmitting(true);
      setModal(null);
      try {
        const attaching = payload.newFiles.length > 0;
        const created = await createAnnouncement(
          { Subject: payload.Subject, Message: payload.Message, Files: [] },
          payload.publish && !attaching,
        );

        if (attaching) {
          const uploaded = await uploadFiles(created.id, payload.newFiles);
          await updateAnnouncement(created.id, {
            Subject: payload.Subject,
            Message: payload.Message,
            Files: [...payload.keptFiles, ...uploaded],
          });
        }

        if (payload.publish && attaching) {
          await publishAnnouncement(created.id);
        }

        setFormOpen(false);
        setModal({
          type: "success",
          message: payload.publish
            ? "Announcement published."
            : "Announcement saved as a draft.",
        });
        await list.refresh();
      } catch (error) {
        setModal({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not save the announcement.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [uploadFiles, list],
  );

  const publishRow = useCallback(
    async (row: AnnouncementRow | AnnouncementRecord): Promise<void> => {
      markBusy(row.id, true);
      setModal(null);
      try {
        await publishAnnouncement(row.id);
        setModal({ type: "success", message: "Announcement published." });
        await list.refresh();
      } catch (error) {
        setModal({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not publish the announcement.",
        });
      } finally {
        markBusy(row.id, false);
      }
    },
    [markBusy, list],
  );

  const requestArchive = useCallback((row: AnnouncementRow) => {
    setArchiveConfirmed(false);
    setArchiveTarget(row);
  }, []);

  const confirmArchive = useCallback(async (): Promise<void> => {
    if (!archiveTarget) return;
    setArchiveProcessing(true);
    setModal(null);
    try {
      await deleteAnnouncement(archiveTarget.id);
      list.suppressRow(archiveTarget.id);
      setModal({ type: "success", message: "Announcement deleted." });
      setArchiveTarget(null);
      setArchiveConfirmed(false);
      await list.refresh();
    } catch (error) {
      setModal({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete the announcement.",
      });
    } finally {
      setArchiveProcessing(false);
    }
  }, [archiveTarget, list]);

  return {
    list,
    canManage,
    modal,
    setModal,
    formOpen,
    openCompose,
    closeForm: () => setFormOpen(false),
    submitting,
    submitAnnouncement,
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
