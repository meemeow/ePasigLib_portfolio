import { useState } from "react";
import { Eye, Newspaper, Bell, BellOff, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useNotificationSummary } from "@/hooks/use-notification-summary";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { isFallbackCover } from "@/features/opac/news-announcements/api/updates-cover";
import {
  SectionHeader,
  SectionHeaderButton,
} from "@/features/opac/news-announcements/components/SectionHeader";
import { NewsSubscriptionModal } from "@/features/opac/news-announcements/components/NewsSubscriptionModal";
import { MarkAllReadModal } from "@/features/opac/news-announcements/components/MarkAllReadModal";
import type {
  NewsItem,
  TimestampLike,
} from "@/features/opac/news-announcements/types/news-announcements-types";

const PAGE = 9;

type Formatter = (ts: TimestampLike | Date | undefined) => string;

function Cover({ item }: { item: NewsItem }) {
  const [broken, setBroken] = useState(false);
  const show = Boolean(item.imageUrl) && !broken;
  const seal = isFallbackCover(item.imageUrl);

  return (
    <div
      className={`aspect-[16/10] w-full overflow-hidden ${
        seal
          ? "bg-[url('/assets/images/pasigLib_bg.jpg')] bg-cover bg-center"
          : "bg-[#EAF4FE]"
      }`}
    >
      {show ? (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className={
            seal
              ? "size-full object-contain p-6 sm:p-7"
              : "size-full object-cover"
          }
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-[#128CF1]/50">
          <Newspaper className="size-7" strokeWidth={1.5} />
          <span className="text-xs text-[#003067]/40">No cover image</span>
        </div>
      )}
    </div>
  );
}

interface NewsCardProps {
  item: NewsItem;
  onOpen: (item: NewsItem) => void;
  formatDate: Formatter;
  unseen?: boolean;
}

export function NewsCard({
  item,
  onOpen,
  formatDate,
  unseen = false,
}: NewsCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group flex flex-col overflow-hidden rounded-xl border text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#128CF1]/40 ${
        unseen
          ? "border-[#128CF1]/30 bg-[#F2F8FF] hover:border-[#128CF1]/50 hover:bg-[#E4F1FE]"
          : "border-gray-200 bg-white hover:border-[#128CF1]/40"
      }`}
    >
      <Cover item={item} />

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <Text className="min-w-0 flex-1 truncate text-[11px] text-gray-500">
            {formatDate(item.createdOn)}
            {item.mainAuthor && (
              <>
                <span className="px-1.5 text-gray-300">•</span>
                {item.mainAuthor}
              </>
            )}
          </Text>
          {unseen && (
            <span className="shrink-0 rounded-full bg-[#EAF4FE] px-2 py-0.5 text-[10px] font-[gothamMedium] uppercase tracking-wide text-[#128CF1]">
              New
            </span>
          )}
        </div>

        <Text
          as="h3"
          className="mt-1.5 line-clamp-2 font-[gothamBlack] text-sm leading-snug text-[#011b38] transition-colors group-hover:text-[#0F57B5]"
        >
          {item.title || "Untitled"}
        </Text>

        <Text className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-gray-600">
          {item.description}
        </Text>

        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#128CF1]/15 bg-[#EAF4FE] px-2.5 py-0.5 text-xs text-[#003067]"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-500">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <Text as="span" className="text-xs font-[gothamMedium] text-[#128CF1]">
            Read story
          </Text>
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Eye className="size-3.5" />
            {item.viewCount || 0}
          </span>
        </div>
      </div>
    </button>
  );
}

interface NewsGridProps {
  items: NewsItem[];
  onOpen: (item: NewsItem) => void;
  formatDate: Formatter;
  unreadIds?: string[];
  onMarkAllRead?: () => void | Promise<void>;
}

export function NewsGrid({
  items,
  onOpen,
  formatDate,
  unreadIds = [],
  onMarkAllRead,
}: NewsGridProps) {
  const [visible, setVisible] = useState(PAGE);
  const { userType } = useAuth();
  const { newsMuted, setNewsMuted, unreadNews } = useNotificationSummary();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markAllOpen, setMarkAllOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const confirmMarkAll = async () => {
    setMarking(true);
    try {
      await onMarkAllRead?.();
      setMarkAllOpen(false);
    } finally {
      setMarking(false);
    }
  };

  const confirmSubscription = async () => {
    setSaving(true);
    try {
      await setNewsMuted(!newsMuted);
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <SectionHeader
        icon={<Newspaper className="size-4 sm:size-5" />}
        title="Latest news"
        subtitle="Stories from around the library"
        action={
          userType === "Patron" ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <SectionHeaderButton
                onClick={() => setMarkAllOpen(true)}
                disabled={unreadNews === 0}
                title={
                  unreadNews === 0
                    ? "No unread stories"
                    : `Mark ${unreadNews} unread ${unreadNews === 1 ? "story" : "stories"} as read`
                }
              >
                <CheckCheck className="size-3.5" />
                Mark all as read
              </SectionHeaderButton>

              <SectionHeaderButton
                onClick={() => setConfirmOpen(true)}
                aria-pressed={newsMuted}
                className={
                  newsMuted
                    ? "border-amber-300/60 bg-amber-400/20 text-amber-100 hover:border-amber-300/60 hover:bg-amber-400/30"
                    : undefined
                }
              >
                {newsMuted ? (
                  <BellOff className="size-3.5" />
                ) : (
                  <Bell className="size-3.5" />
                )}
                {newsMuted ? "News muted" : "Unsubscribe"}
              </SectionHeaderButton>
            </div>
          ) : null
        }
      />

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Text className="text-sm text-gray-500">
            No stories have been published yet.
          </Text>
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {items.slice(0, visible).map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                formatDate={formatDate}
                unseen={unreadIds.includes(item.id)}
              />
            ))}
          </div>

          {items.length > visible && (
            <div className="mt-5 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisible((n) => n + PAGE)}
                className="border-[#003067]/40 bg-white text-[#003067] hover:border-[#003067] hover:bg-[#EAF4FE]"
              >
                Show more stories
              </Button>
            </div>
          )}
        </div>
      )}

      <NewsSubscriptionModal
        open={confirmOpen}
        muting={!newsMuted}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmSubscription}
        isProcessing={saving}
      />

      <MarkAllReadModal
        open={markAllOpen}
        kind="news"
        count={unreadNews}
        onCancel={() => setMarkAllOpen(false)}
        onConfirm={confirmMarkAll}
        isProcessing={marking}
      />
    </section>
  );
}

export default NewsGrid;

export function NewsGridSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <SectionHeader
        icon={<Newspaper className="size-4 sm:size-5" />}
        title="Latest news"
        subtitle="Stories from around the library"
      />

      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-gray-200"
            >
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="space-y-2 p-3.5 sm:p-4">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
                <div className="space-y-1.5 pt-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
