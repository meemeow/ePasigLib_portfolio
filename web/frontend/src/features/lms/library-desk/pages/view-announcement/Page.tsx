import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Loader2,
  Megaphone,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";
import RecordSkeleton from "@/components/ui/RecordSkeleton";
import Modal from "@/components/ui/ValidationModal";
import DetailSidebar, {
  dateFact,
  FACT_ICONS,
} from "@/features/lms/library-desk/components/DetailSidebar";
import AttachmentList from "@/features/lms/library-desk/components/AttachmentList";
import AnnouncementFormModal from "@/features/lms/library-desk/components/AnnouncementFormModal";
import ReplyFormModal from "@/features/lms/library-desk/components/ReplyFormModal";
import ReplyThread from "@/features/lms/library-desk/pages/view-announcement/components/ReplyThread";
import { useAnnouncementView } from "@/features/lms/library-desk/pages/view-announcement/api/announcement-view-logic";
import { useDeskRail } from "@/features/lms/library-desk/api/desk-rail-context";

export default function ViewAnnouncement() {
  const navigate = useNavigate();
  const view = useAnnouncementView();
  const { record } = view;
  const { collapsed } = useDeskRail();

  const back = () => navigate("/lms/library-desk/announcements");

  if (view.loading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <RecordSkeleton fields={8} />
      </div>
    );
  }

  if (view.loadError || !record) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border bg-white p-10 text-center shadow-sm">
        <AlertTriangle className="size-7 text-red-500" />
        <Text className="text-sm text-gray-600">
          {view.loadError ?? "This announcement could not be found."}
        </Text>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={view.reload}>
            Try again
          </Button>
          <Button variant="cancel" size="sm" onClick={back}>
            Back to Announcements
          </Button>
        </div>
      </div>
    );
  }

  const isArchived = record.Status === "Archived";

  return (
    <>
      {view.modal && (
        <Modal
          message={view.modal.message}
          type={view.modal.type}
          onClose={() => view.setModal(null)}
        />
      )}

      <div
        className={`mx-auto flex w-full flex-col gap-6 ${
          collapsed ? "lg:flex-row" : "xl:flex-row"
        }`}
      >
        <DetailSidebar
          sideBySideAt={collapsed ? "lg" : "xl"}
          status={record.Status}
          title={record.Subject}
          kindLabel="Announcement"
          artwork="/assets/images/megaphone.png"
          onBack={back}
          facts={[
            {
              label: "Author",
              value: record.AuthorName || "—",
              icon: FACT_ICONS.author,
            },
            dateFact("Created", record.CreatedOn, FACT_ICONS.created),
            ...(record.ModifiedOn
              ? [
                  {
                    label: "Last Modified By",
                    value: record.ModifiedBy || "—",
                    icon: FACT_ICONS.modifiedBy,
                  },
                  dateFact(
                    "Last Modified",
                    record.ModifiedOn,
                    FACT_ICONS.modified,
                  ),
                ]
              : []),
          ]}
          actions={
            view.canManage ? (
              <>
                {!isArchived && (
                  <Button
                    onClick={view.openEdit}
                    className="w-full bg-[#1668D6] text-white hover:bg-[#0F57B5]"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                )}
                {record.Status === "Draft" && (
                  <Button
                    onClick={view.publish}
                    disabled={view.actionBusy}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {view.actionBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Publish
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={view.openArchive}
                  className="w-full border-red-600/50 bg-white text-red-600 hover:border-red-600 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </>
            ) : null
          }
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-md">
          <div className="bg-[#003067] px-6 py-4 sm:px-8 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white">
                <Megaphone className="size-5" />
              </div>
              <div className="min-w-0">
                <Text className="font-[gothamMedium] text-base text-white sm:text-lg">
                  Announcement
                </Text>
                <Text className="text-xs text-white/70 sm:text-sm">
                  Posted to the patron feed and the OPAC
                </Text>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 sm:p-8">
            {record.Status === "Draft" && (
              <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <Text className="text-sm text-gray-600">
                  This is a draft. No patron has been notified, and it does not
                  appear on the OPAC until you publish it.
                </Text>
              </div>
            )}
            {isArchived && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">
                  This announcement is archived and no longer visible to
                  patrons.
                </Text>
              </div>
            )}

            <article>
              <Text
                as="h1"
                className="text-2xl font-[gothamBlack] leading-snug text-[#011b38]"
              >
                {record.Subject || "Untitled"}
              </Text>
              <Text className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {record.Message}
              </Text>
              <AttachmentList files={record.Files} />
            </article>

            <ReplyThread
              replies={record.Replies}
              canManage={view.canManage}
              disabled={isArchived}
              onAdd={view.openReply}
              onEdit={view.openReplyEdit}
              onDelete={view.requestDeleteReply}
            />
          </div>
        </div>
      </div>

      <AnnouncementFormModal
        open={view.editOpen}
        record={record}
        onClose={view.closeEdit}
        onSubmit={view.saveEdit}
        submitting={view.submitting}
      />

      <ReplyFormModal
        open={view.replyOpen}
        reply={view.editingReply}
        parentSubject={record.Subject}
        onClose={view.closeReply}
        onSubmit={view.submitReply}
        submitting={view.submitting}
      />

      <ArchiveConfirmModal
        open={view.archiveOpen}
        entityLabel="Announcement"
        entityName={record.Subject}
        archiveAction="delete"
        confirmDelaySeconds={5}
        confirmChecked={view.archiveConfirmed}
        setConfirmChecked={view.setArchiveConfirmed}
        onCancel={view.cancelArchive}
        onConfirm={view.confirmArchive}
        isProcessing={view.archiveProcessing}
        deleteWarning="This removes the announcement, its attachments, its replies and every file attached to a reply — permanently, with no way back. Only the audit trail is kept."
      />

      <ArchiveConfirmModal
        open={!!view.replyToDelete}
        entityLabel="Reply"
        entityName={view.replyToDelete?.Subject ?? ""}
        archiveAction="delete"
        confirmChecked={view.deleteConfirmed}
        setConfirmChecked={view.setDeleteConfirmed}
        onCancel={view.cancelDeleteReply}
        onConfirm={view.confirmDeleteReply}
        isProcessing={view.deleting}
        deleteWarning="This removes the reply and its attachments for good. Only the audit trail is kept."
      />
    </>
  );
}
