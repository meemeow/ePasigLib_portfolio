import useOpacUpdates from "@/features/opac/news-announcements/api/opac-updates";
import { UpdatesHero } from "@/features/opac/news-announcements/components/UpdatesHero";
import {
  AnnouncementList,
  AnnouncementListSkeleton,
} from "@/features/opac/news-announcements/components/AnnouncementList";
import {
  NewsGrid,
  NewsGridSkeleton,
} from "@/features/opac/news-announcements/components/NewsGrid";
import {
  NewsModal,
  AnnouncementModal,
} from "@/features/opac/news-announcements/components/NewsAnnouncementModals";
import UnifiedSearchModal from "@/features/opac/news-announcements/components/UnifiedSearchModal";
import type { TimestampLike } from "@/features/opac/news-announcements/types/news-announcements-types";
import { Seo } from "@/lib/seo/Seo";
import { breadcrumbNode, graph } from "@/lib/seo/structured-data";

export function formatDate(ts: TimestampLike | Date | number | undefined) {
  if (!ts) return "";
  const date =
    ts && typeof (ts as TimestampLike).toDate === "function"
      ? (ts as TimestampLike).toDate()
      : new Date(ts as number);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NewsAnnouncementsPage() {
  const {
    loading,
    refreshing,
    refresh,
    news,
    topLevelAnnouncements,
    repliesByParent,
    unreadIds,
    markAllAnnouncementsRead,
    markAllNewsRead,
    openAnnouncement,
    handleViewNews,
    showNewsModal,
    selectedNews,
    setShowNewsModal,
    setSelectedNews,
    showAnnModal,
    selectedAnn,
    setShowAnnModal,
    setSelectedAnn,
    searchModalOpen,
    setSearchModalOpen,
  } = useOpacUpdates();

  return (
    <div className="flex w-full flex-1 flex-col font-[gothamLight]">
      <Seo
        description="Programs, closures, new arrivals and service updates from the Pasig Knowledge Center."
        canonical="/opac/news_announcements"
        type="article"
        structuredData={graph(
          breadcrumbNode([
            { name: "Home", path: "/opac/home" },
            { name: "News & Announcements", path: "/opac/news_announcements" },
          ]),
        )}
      />
      <UpdatesHero
        announcementCount={topLevelAnnouncements.length}
        newsCount={news.length}
        onSearch={() => setSearchModalOpen(true)}
        onRefresh={refresh}
        refreshing={refreshing}
      />

      <div className="mx-auto w-full max-w-[1920px] px-5 py-8 sm:px-8 sm:py-10 2xl:px-10">
        {loading ? (
          <div className="flex flex-col gap-8 sm:gap-10 xl:flex-row xl:items-start xl:gap-8">
            <div className="w-full xl:order-2 xl:min-w-0 xl:basis-0 xl:grow-[36]">
              <AnnouncementListSkeleton />
            </div>
            <div className="min-w-0 xl:order-1 xl:basis-0 xl:grow-[64]">
              <NewsGridSkeleton />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 sm:gap-10 xl:flex-row xl:items-start xl:gap-8">
            <aside className="w-full xl:order-2 xl:min-w-0 xl:basis-0 xl:grow-[36]">
              <AnnouncementList
                items={topLevelAnnouncements}
                repliesByParent={repliesByParent}
                unreadIds={unreadIds}
                formatDate={formatDate}
                onOpen={openAnnouncement}
                onMarkAllRead={markAllAnnouncementsRead}
              />
            </aside>

            <div className="min-w-0 xl:order-1 xl:basis-0 xl:grow-[64]">
              <NewsGrid
                items={news}
                onOpen={handleViewNews}
                formatDate={formatDate}
                unreadIds={unreadIds}
                onMarkAllRead={markAllNewsRead}
              />
            </div>
          </div>
        )}
      </div>

      <UnifiedSearchModal
        open={searchModalOpen}
        onClose={() => {
          if (showAnnModal || showNewsModal) return;
          setSearchModalOpen(false);
        }}
        announcements={topLevelAnnouncements}
        news={news}
        formatDate={formatDate}
        onOpenNews={handleViewNews}
        onOpenAnnouncement={openAnnouncement}
        unreadIds={unreadIds}
      />

      {showNewsModal && selectedNews && (
        <NewsModal
          show={showNewsModal}
          news={selectedNews}
          onClose={() => {
            setShowNewsModal(false);
            setSelectedNews(null);
          }}
          formatDate={formatDate}
        />
      )}

      {showAnnModal && selectedAnn && (
        <AnnouncementModal
          show={showAnnModal}
          announcement={selectedAnn}
          replies={repliesByParent[selectedAnn.id] || []}
          onClose={() => {
            setShowAnnModal(false);
            setSelectedAnn(null);
          }}
          formatDate={formatDate}
        />
      )}

    </div>
  );
}
