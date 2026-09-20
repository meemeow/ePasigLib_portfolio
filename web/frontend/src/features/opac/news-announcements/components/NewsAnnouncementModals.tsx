import { ExternalLink, Megaphone, Newspaper, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";
import { isFallbackCover } from "@/features/opac/news-announcements/api/updates-cover";
import type {
  AnnouncementItem,
  NewsItem,
  TimestampLike,
} from "@/features/opac/news-announcements/types/news-announcements-types";

type Formatter = (ts: TimestampLike | Date | number | undefined) => string;

function byline(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join(" • ");
}

function Attachments({ files }: { files: AnnouncementItem["files"] }) {
  if (!files || files.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {files.map((file) => (
        <a
          key={file.url}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-3 py-1.5 text-xs font-[gothamMedium] text-[#003067] transition hover:border-[#128CF1]/40 hover:bg-[#DCEBFB]"
        >
          <Paperclip className="size-3.5 shrink-0 text-[#128CF1]" />
          <span className="truncate">{file.name || "Attachment"}</span>
        </a>
      ))}
    </div>
  );
}

interface NewsModalProps {
  show: boolean;
  news: NewsItem | null;
  onClose: () => void;
  formatDate: Formatter;
}

export function NewsModal({ show, news, onClose, formatDate }: NewsModalProps) {
  if (!show || !news) return null;

  const seal = isFallbackCover(news.imageUrl);

  const source = news.url
    ? news.url.startsWith("http")
      ? news.url
      : `https://${news.url}`
    : "";

  return (
    <ModalShell
      open={show}
      title={news.title || "Untitled"}
      description={byline([
        news.mainAuthor,
        news.location,
        formatDate(news.createdOn),
        `${news.viewCount || 0} ${news.viewCount === 1 ? "view" : "views"}`,
      ])}
      icon={<Newspaper className="size-5" />}
      panelClassName="max-h-[80vh]"
      onClose={onClose}
      bodyClassName="p-0 sm:p-0"
      actions={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {news.imageUrl && (
        <div
          className={`relative h-56 w-full overflow-hidden border-b sm:h-72 ${
            seal
              ? "bg-[url('/assets/images/pasigLib_bg.jpg')] bg-cover bg-center"
              : "bg-[#EAF4FE]"
          }`}
        >
          {!seal && (
            <img
              src={news.imageUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 size-full scale-110 object-cover opacity-55 blur-xl"
            />
          )}
          <img
            src={news.imageUrl}
            alt=""
            aria-hidden
            className={`relative size-full object-contain ${
              seal ? "p-6 sm:p-8" : ""
            }`}
          />
        </div>
      )}

      <div className="px-6 py-5 sm:px-8">
        {news.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {news.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#128CF1]/15 bg-[#EAF4FE] px-2.5 py-0.5 text-xs text-[#003067]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Text className="whitespace-pre-line text-sm leading-relaxed text-gray-700 sm:text-[15px]">
          {news.description}
        </Text>

        {source && (
          <a
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center gap-3 rounded-xl border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-3 transition-colors hover:border-[#128CF1]/40 hover:bg-[#DCEBFB]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-[gothamMedium] uppercase tracking-wide text-[#003067]/55">
                Source
              </span>
              <span className="block truncate text-sm font-[gothamMedium] text-[#003067]">
                {news.url?.replace(/^https?:\/\//, "")}
              </span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-[#128CF1]" />
          </a>
        )}
      </div>
    </ModalShell>
  );
}

interface AnnouncementModalProps {
  show: boolean;
  announcement: AnnouncementItem | null;
  replies: AnnouncementItem[];
  onClose: () => void;
  formatDate: Formatter;
}

export function AnnouncementModal({
  show,
  announcement,
  replies,
  onClose,
  formatDate,
}: AnnouncementModalProps) {
  if (!show || !announcement) return null;

  return (
    <ModalShell
      open={show}
      title={announcement.subject || "Untitled"}
      description={byline([
        announcement.authorName || "Pasig City Library",
        formatDate(announcement.createdOn),
      ])}
      icon={<Megaphone className="size-5" />}
      panelClassName="max-h-[80vh]"
      onClose={onClose}
      actions={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <Text className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
        {announcement.message}
      </Text>

      <Attachments files={announcement.files} />

      {announcement.fileUrl && (
        <Attachments
          files={[
            {
              url: announcement.fileUrl,
              name: announcement.fileName || "Attachment",
            },
          ]}
        />
      )}

      {replies.length > 0 && (
        <div className="mt-6 space-y-4 border-l-2 border-[#EAF4FE] pl-4">
          {replies.map((reply) => (
            <div key={reply.id}>
              <Text
                as="span"
                className="block font-[gothamMedium] text-sm text-[#003067]"
              >
                {reply.subject || "Update"}
              </Text>
              <Text className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {reply.message}
              </Text>
              <Attachments files={reply.files} />
              <Text className="mt-1.5 text-xs text-gray-400">
                {byline([
                  reply.authorName || "Pasig City Library",
                  formatDate(reply.createdOn),
                ])}
              </Text>
            </div>
          ))}
        </div>
      )}

      {announcement.editedBy && announcement.editedOn && (
        <Text className="mt-6 border-t border-gray-100 pt-3 text-xs text-gray-400">
          Edited by {announcement.editedBy} on{" "}
          {formatDate(announcement.editedOn)}
        </Text>
      )}
    </ModalShell>
  );
}
