import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  ImageOff,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";
import Modal from "@/components/ui/ValidationModal";
import type { RecordColumn } from "@/components/ui/RecordsTable";
import DeskScreen from "@/features/lms/library-desk/components/DeskScreen";
import StatusBadge from "@/features/lms/library-desk/components/StatusBadge";
import NewsFormModal from "@/features/lms/library-desk/components/NewsFormModal";
import { formatMillis } from "@/features/lms/library-desk/api/desk-helpers";
import { useNewsPage } from "@/features/lms/library-desk/pages/news/api/news-logic";
import type { NewsRow } from "@/features/lms/library-desk/types/updates-types";

function NewsCover({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
      <ImageOff className="size-5 text-gray-400" />
      {src && (
        <img
          src={src}
          alt={`Cover for ${title}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
}

export default function News() {
  const navigate = useNavigate();
  const page = useNewsPage();
  const { list } = page;

  const columns = useMemo<RecordColumn<NewsRow>[]>(
    () => [
      {
        key: "cover",
        header: "Cover",
        headClassName: "w-[8.5rem]",
        cell: (row) => <NewsCover src={row.ImageURL} title={row.Title} />,
      },
      {
        key: "title",
        header: "Title",
        headClassName: "min-w-[20rem]",
        cellClassName: "align-middle whitespace-normal",
        cell: (row) => (
          <div className="min-w-0 max-w-[34rem]">
            <Text className="line-clamp-2 font-[gothamMedium] text-[#011b38]">
              {row.Title || "Untitled"}
            </Text>
            {row.Description && (
              <Text className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                {row.Description}
              </Text>
            )}
          </div>
        ),
      },
      {
        key: "author",
        header: "Author",
        headClassName: "w-[11rem]",
        cell: (row) => {
          const byline = row.MainAuthor.trim();
          const filedBy = row.AuthorName.trim();
          return byline ? (
            <span className="block max-w-[11rem] truncate" title={byline}>
              {byline}
            </span>
          ) : (
            <span
              className="block max-w-[11rem] truncate text-gray-400"
              title={filedBy ? `Posted by ${filedBy}` : undefined}
            >
              {filedBy || "—"}
            </span>
          );
        },
      },
      {
        key: "tags",
        header: "Tags",
        cellClassName: "align-middle whitespace-normal",
        cell: (row) =>
          row.Tags.length === 0 ? (
            <span className="text-gray-400">—</span>
          ) : (
            <div className="flex max-w-[14rem] flex-wrap gap-1">
              {row.Tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-[gothamMedium] text-slate-700"
                >
                  {tag}
                </span>
              ))}
              {row.Tags.length > 3 && (
                <span
                  title={row.Tags.slice(3).join(", ")}
                  className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-[gothamMedium] text-slate-500"
                >
                  +{row.Tags.length - 3}
                </span>
              )}
            </div>
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
        key: "views",
        header: "Views",
        headClassName: "text-center",
        cellClassName: "align-middle text-center",
        cell: (row) => row.ViewCount.toLocaleString(),
      },
      {
        key: "posted",
        header: "Posted",
        cellClassName: "align-middle",
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
        headClassName: "w-[10.5rem] text-center",
        cellClassName: "align-middle",
        cell: (row) => {
          const busy = page.processingIds.has(row.id);
          const isDraft = row.Status === "Draft";
          const shared = "w-full text-xs";
          return (
            <div className="flex justify-center">
              <div className="flex w-[128px] flex-col items-stretch gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/lms/library-desk/news/view/${row.id}`)
                  }
                  className={`${shared} border-[#003067]/50 text-[#003067] hover:border-[#003067] hover:bg-[#EAF4FE] hover:text-[#003067]`}
                >
                  <Eye className="size-3.5" />
                  View Details
                </Button>
                {page.canManage && isDraft && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => page.publishRow(row)}
                    className={`${shared} border-green-700/70 text-green-700 hover:border-green-600 hover:bg-green-200/10 hover:text-green-700`}
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
                    className={`${shared} border-red-600/50 text-red-600 hover:border-red-600 hover:bg-red-200/10 hover:text-red-600`}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                )}
              </div>
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
        onCreate={page.openCreate}
        canCreate={page.canManage}
        availableTags={page.availableTags}
      >
        <NewsFormModal
          open={page.formOpen}
          onClose={page.closeForm}
          onSubmit={page.submitNews}
          submitting={page.submitting}
        />

        <ArchiveConfirmModal
          open={!!page.archiveTarget}
          entityLabel="News item"
          entityName={page.archiveTarget?.Title ?? ""}
          archiveAction="delete"
          confirmDelaySeconds={5}
          confirmChecked={page.archiveConfirmed}
          setConfirmChecked={page.setArchiveConfirmed}
          onCancel={page.cancelArchive}
          onConfirm={page.confirmArchive}
          isProcessing={page.archiveProcessing}
          deleteWarning="This removes the news item and its cover image — permanently, with no way back. It also disappears from the OPAC. Only the audit trail is kept."
        />
      </DeskScreen>
    </>
  );
}
