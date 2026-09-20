import { useState } from "react";
import { CheckCheck, ChevronRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/use-auth";
import { useNotificationSummary } from "@/hooks/use-notification-summary";
import {
  SectionHeader,
  SectionHeaderButton,
} from "@/features/opac/news-announcements/components/SectionHeader";
import { MarkAllReadModal } from "@/features/opac/news-announcements/components/MarkAllReadModal";
import type {
  AnnouncementItem,
  TimestampLike,
} from "@/features/opac/news-announcements/types/news-announcements-types";

const PAGE = 5;

interface AnnouncementListProps {
  items: AnnouncementItem[];
  repliesByParent: Record<string, AnnouncementItem[]>;
  unreadIds: string[];
  formatDate: (ts: TimestampLike | undefined) => string;
  onOpen: (item: AnnouncementItem) => void;
  onMarkAllRead?: () => void | Promise<void>;
}

export function AnnouncementList({
  items,
  repliesByParent,
  unreadIds,
  formatDate,
  onOpen,
  onMarkAllRead,
}: AnnouncementListProps) {
  const [visible, setVisible] = useState(PAGE);
  const { userType } = useAuth();
  const { unreadAnnouncements } = useNotificationSummary();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const confirmMarkAll = async () => {
    setMarking(true);
    try {
      await onMarkAllRead?.();
      setConfirmOpen(false);
    } finally {
      setMarking(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <SectionHeader
        icon={<Megaphone className="size-4 sm:size-5" />}
        title="Announcements"
        subtitle="Notices from the library desk"
        action={
          userType === "Patron" ? (
            <SectionHeaderButton
              onClick={() => setConfirmOpen(true)}
              disabled={unreadAnnouncements === 0}
              title={
                unreadAnnouncements === 0
                  ? "No unread announcements"
                  : `Mark ${unreadAnnouncements} unread ${unreadAnnouncements === 1 ? "notice" : "notices"} as read`
              }
            >
              <CheckCheck className="size-3.5" />
              Mark all as read
            </SectionHeaderButton>
          ) : null
        }
      />

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <Text className="text-sm text-gray-500">
            No announcements yet. Anything the library needs you to know will
            appear here.
          </Text>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {items.slice(0, visible).map((item) => {
              const unseen = unreadIds.includes(item.id);
              const replies = repliesByParent[item.id] ?? [];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpen(item)}
                  className={`flex w-full items-start px-5 py-4 text-left transition-colors sm:px-6 ${
                    unseen
                      ? "bg-[#F2F8FF] hover:bg-[#E4F1FE]"
                      : "hover:bg-[#F6FAFF]"
                  }`}
                >
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1]"
                  >
                    <Megaphone className="size-5" />
                  </span>

                  <span className="ml-3 min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Text
                        as="span"
                        className="font-[gothamMedium] text-sm text-[#011b38] sm:text-base"
                      >
                        {item.subject || "Untitled"}
                      </Text>
                      {unseen && (
                        <span className="rounded-full bg-[#EAF4FE] px-2 py-0.5 text-[10px] font-[gothamMedium] uppercase tracking-wide text-[#128CF1]">
                          New
                        </span>
                      )}
                    </span>

                    <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                      <span>{item.authorName || "Pasig City Library"}</span>
                      <span className="text-gray-300">•</span>
                      <span>{formatDate(item.createdOn)}</span>
                      {replies.length > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>
                            {replies.length}{" "}
                            {replies.length === 1 ? "update" : "updates"}
                          </span>
                        </>
                      )}
                    </span>

                    <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-gray-600">
                      {item.message}
                    </span>
                  </span>

                  <ChevronRight className="ml-2 mt-2 size-4 shrink-0 text-gray-400" />
                </button>
              );
            })}
          </div>

          {items.length > visible && (
            <div className="border-t border-gray-100 p-4">
              <Button
                variant="outline"
                onClick={() => setVisible((n) => n + PAGE)}
                className="w-full border-[#003067]/40 bg-white text-[#003067] hover:border-[#003067] hover:bg-[#EAF4FE]"
              >
                Show more announcements
              </Button>
            </div>
          )}
        </>
      )}

      <MarkAllReadModal
        open={confirmOpen}
        kind="announcements"
        count={unreadAnnouncements}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmMarkAll}
        isProcessing={marking}
      />
    </section>
  );
}

export default AnnouncementList;

export function AnnouncementListSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <SectionHeader
        icon={<Megaphone className="size-4 sm:size-5" />}
        title="Announcements"
        subtitle="Notices from the library desk"
      />

      <div className="divide-y divide-gray-100">
        {Array.from({ length: PAGE }).map((_, index) => (
          <div key={index} className="flex items-start px-5 py-4 sm:px-6">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="ml-3 min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
