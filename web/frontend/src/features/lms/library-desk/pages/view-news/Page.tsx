import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  Newspaper,
  Loader2,
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
import NewsFormModal from "@/features/lms/library-desk/components/NewsFormModal";
import { useDeskRail } from "@/features/lms/library-desk/api/desk-rail-context";
import { formatMillisDate } from "@/features/lms/library-desk/api/desk-helpers";
import { useNewsView } from "@/features/lms/library-desk/pages/view-news/api/news-view-logic";
import { asset } from "@/lib/asset";

export default function ViewNews() {
  const navigate = useNavigate();
  const view = useNewsView();
  const { collapsed } = useDeskRail();
  const { record } = view;

  const back = () => navigate("/lms/library-desk/news");

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
          {view.loadError ?? "This news item could not be found."}
        </Text>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={view.reload}>
            Try again
          </Button>
          <Button variant="cancel" size="sm" onClick={back}>
            Back to News
          </Button>
        </div>
      </div>
    );
  }

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
          title={record.Title}
          kindLabel="News"
          artwork={asset("/assets/images/newspaper.png")}
          artworkWidth="w-56"
          artworkTop="-top-8"
          onBack={back}
          facts={[
            {
              label: "Author",
              value: record.MainAuthor || "—",
              icon: FACT_ICONS.author,
            },
            {
              label: "Posted by",
              value: record.AuthorName || "—",
              icon: FACT_ICONS.postedBy,
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
                <Button
                  onClick={view.openEdit}
                  className="w-full bg-[#1668D6] text-white hover:bg-[#0F57B5]"
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
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
                <Newspaper className="size-5" />
              </div>
              <div className="min-w-0">
                <Text className="font-[gothamMedium] text-base text-white sm:text-lg">
                  News
                </Text>
                <Text className="text-xs text-white/70 sm:text-sm">
                  Filed to the patron feed and the OPAC
                </Text>
              </div>
            </div>
          </div>

          {record.ImageURL && (
            <div className="relative h-56 w-full overflow-hidden border-b bg-[#EAF4FE] sm:h-72">
              <img
                src={record.ImageURL}
                alt=""
                aria-hidden
                className="absolute inset-0 size-full scale-110 object-cover opacity-55 blur-xl"
              />
              <img
                src={record.ImageURL}
                alt=""
                aria-hidden
                className="relative size-full object-contain"
              />
            </div>
          )}

          <div className="flex-1 p-6 sm:p-8">
            {record.Status === "Draft" && (
              <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <Text className="text-sm text-gray-600">
                  This is a draft. It does not appear on the OPAC until you
                  publish it.
                </Text>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-[gothamMedium] uppercase tracking-wide">
              <span className="text-[#128CF1]">
                {record.MainAuthor || record.AuthorName || "Pasig City Library"}
              </span>
              {record.Location && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-[#003067]/55">{record.Location}</span>
                </>
              )}
              <span className="text-gray-300">•</span>
              <span className="text-[#003067]/55">
                {formatMillisDate(record.CreatedOn)}
              </span>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center gap-1 text-[#003067]/55">
                <Eye className="size-3.5" aria-hidden />
                {record.ViewCount.toLocaleString()}
                {record.ViewCount === 1 ? " view" : " views"}
              </span>
            </div>

            <Text
              as="h1"
              className="mt-2 text-2xl font-[gothamBlack] leading-snug text-[#011b38] sm:text-3xl"
            >
              {record.Title || "Untitled"}
            </Text>

            {record.Tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {record.Tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#128CF1]/15 bg-[#EAF4FE] px-2.5 py-0.5 text-xs text-[#003067]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="my-5 h-px bg-gray-100" />

            <Text className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 sm:text-[15px]">
              {record.Description}
            </Text>

            {record.URL && (
              <a
                href={record.URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex items-center gap-3 rounded-xl border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-3 transition-colors hover:border-[#128CF1]/40 hover:bg-[#DCEBFB]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-[gothamMedium] uppercase tracking-wide text-[#003067]/55">
                    Source
                  </span>
                  <span className="block truncate text-sm font-[gothamMedium] text-[#003067]">
                    {record.URL.replace(/^https?:\/\//, "")}
                  </span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-[#128CF1]" />
              </a>
            )}
          </div>
        </div>
      </div>

      <NewsFormModal
        open={view.editOpen}
        record={record}
        onClose={view.closeEdit}
        onSubmit={view.saveEdit}
        submitting={view.submitting}
      />

      <ArchiveConfirmModal
        open={view.archiveOpen}
        entityLabel="News item"
        entityName={record.Title}
        archiveAction="delete"
        confirmDelaySeconds={5}
        confirmChecked={view.archiveConfirmed}
        setConfirmChecked={view.setArchiveConfirmed}
        onCancel={view.cancelArchive}
        onConfirm={view.confirmArchive}
        isProcessing={view.archiveProcessing}
        deleteWarning="This removes the news item and its cover image — permanently, with no way back. It also disappears from the OPAC. Only the audit trail is kept."
      />
    </>
  );
}
