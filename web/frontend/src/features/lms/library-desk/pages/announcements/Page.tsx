import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarX2, Eye, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";
import Modal from "@/components/ui/ValidationModal";
import type { RecordColumn } from "@/components/ui/RecordsTable";
import DeskScreen from "@/features/lms/library-desk/components/DeskScreen";
import StatusBadge from "@/features/lms/library-desk/components/StatusBadge";
import AnnouncementFormModal from "@/features/lms/library-desk/components/AnnouncementFormModal";
import CloseLibraryModal from "@/features/lms/library-desk/components/CloseLibraryModal";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { declareLibraryClosure } from "@/features/lms/library-desk/api/closure-mutations";
import {
  formatMillis,
  truncate,
} from "@/features/lms/library-desk/api/desk-helpers";
import { useAnnouncementsPage } from "@/features/lms/library-desk/pages/announcements/api/announcements-logic";
import type { AnnouncementRow } from "@/features/lms/library-desk/types/updates-types";

export default function Announcements() {
  const navigate = useNavigate();
  const page = useAnnouncementsPage();
  const { list } = page;

  const [closureOpen, setClosureOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const confirmClosure = async (reason: string): Promise<void> => {
    setClosing(true);
    try {
      const result = await declareLibraryClosure(reason);
      setClosureOpen(false);
      page.setModal({
        type: "success",
        message: result.alreadyClosed
          ? `The library was already closed today — "${result.reason}". Nothing was changed.`
          : `The library is closed today. ${
              result.loansExtended === 0
                ? "No loans were due today, so no due dates moved."
                : `${result.loansExtended} due date${
                    result.loansExtended === 1 ? "" : "s"
                  } moved and ${result.patronsNotified} patron${
                    result.patronsNotified === 1 ? " was" : "s were"
                  } notified.`
            }`,
      });
    } catch (error) {
      setClosureOpen(false);
      page.setModal({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not close the library.",
      });
    } finally {
      setClosing(false);
    }
  };

  const columns = useMemo<RecordColumn<AnnouncementRow>[]>(
    () => [
      {
        key: "subject",
        header: "Subject",
        headClassName: "min-w-[16rem]",
        cell: (row) => (
          <div className="min-w-0">
            <Text className="truncate font-[gothamMedium] text-[#011b38]">
              {row.Subject || "Untitled"}
            </Text>
            <Text className="truncate text-xs text-gray-500">
              {truncate(row.Message, 80)}
            </Text>
          </div>
        ),
      },
      {
        key: "author",
        header: "Author",
        cell: (row) => (
          <span className="whitespace-nowrap">{row.AuthorName || "—"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        headClassName: "text-center",
        cellClassName: "align-middle text-center",
        cell: (row) => <StatusBadge status={row.Status} />,
      },
      {
        key: "replies",
        header: "Replies",
        headClassName: "text-center",
        cellClassName: "align-middle text-center",
        cell: (row) => row.ReplyCount,
      },
      {
        key: "files",
        header: "Files",
        headClassName: "text-center",
        cellClassName: "align-middle text-center",
        cell: (row) => row.FileCount,
      },
      {
        key: "posted",
        header: "Posted",
        cell: (row) => (
          <span className="whitespace-nowrap">
            {row.Status === "Draft"
              ? `Drafted ${formatMillis(row.CreatedOn)}`
              : formatMillis(row.CreatedOn)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        headClassName: "w-[19rem] text-center",
        cellClassName: "align-middle text-right",
        cell: (row) => {
          const busy = page.processingIds.has(row.id);
          const isDraft = row.Status === "Draft";
          return (
            <div className="flex w-full justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/lms/library-desk/announcements/view/${row.id}`)
                }
                className={`border-[#003067]/50 text-xs text-[#003067] hover:border-[#003067] hover:bg-[#EAF4FE] hover:text-[#003067] ${
                  isDraft ? "" : "basis-0 grow-[56]"
                }`}
              >
                <Eye className="size-3.5" />
                {isDraft ? "View" : "View Details"}
              </Button>
              {page.canManage && isDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => page.publishRow(row)}
                  className="border-green-700/70 text-xs text-green-700 hover:border-green-600 hover:bg-green-200/10 hover:text-green-700"
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Publish
                </Button>
              )}
              {page.canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => page.requestArchive(row)}
                  className={`text-xs ${
                    isDraft ? "" : "basis-0 grow-[43]"
                  } border-red-600/50 text-red-600 hover:border-red-600 hover:bg-red-200/10 hover:text-red-600`}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [navigate, page],
  );

  return (
    <>
      {page.modal && (
        <Modal
          message={page.modal.message}
          type={page.modal.type}
          onClose={() => page.setModal(null)}
        />
      )}

      <DeskScreen
        list={list}
        columns={columns}
        onCreate={page.openCompose}
        canCreate={page.canManage}
        extraAction={
          page.canManage ? (
            <Button
              onClick={() => setClosureOpen(true)}
              variant="outline"
              className={`w-full gap-1.5 border-red-600 text-red-700 hover:border-red-700 hover:bg-red-600 hover:text-white md:w-auto ${COMPACT_CONTROL}`}
            >
              <CalendarX2 className="size-4" />
              Close Library Today
            </Button>
          ) : null
        }
      >
        <CloseLibraryModal
          open={closureOpen}
          processing={closing}
          onCancel={() => setClosureOpen(false)}
          onConfirm={confirmClosure}
        />

        <AnnouncementFormModal
          open={page.formOpen}
          onClose={page.closeForm}
          onSubmit={page.submitAnnouncement}
          submitting={page.submitting}
        />

        <ArchiveConfirmModal
          open={!!page.archiveTarget}
          entityLabel="Announcement"
          entityName={page.archiveTarget?.Subject ?? ""}
          archiveAction="delete"
          confirmDelaySeconds={5}
          confirmChecked={page.archiveConfirmed}
          setConfirmChecked={page.setArchiveConfirmed}
          onCancel={page.cancelArchive}
          onConfirm={page.confirmArchive}
          isProcessing={page.archiveProcessing}
          deleteWarning="This removes the announcement, its attachments, its replies and every file attached to a reply — permanently, with no way back. Only the audit trail is kept."
        />
      </DeskScreen>
    </>
  );
}
