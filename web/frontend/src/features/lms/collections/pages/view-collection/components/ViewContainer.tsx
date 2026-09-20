import { BookOpen } from "lucide-react";
import { Text } from "@/components/ui/Text";
import ViewCollectionModificationLogs from "@/features/lms/collections/pages/view-collection/components/ViewCollectionModificationLogs";
import ViewCollectionCheckoutHistory from "@/features/lms/collections/pages/view-collection/components/ViewCollectionCheckoutHistory";
import ViewCollectionCheckinHistory from "@/features/lms/collections/pages/view-collection/components/ViewCollectionCheckinHistory";
import {
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "@/features/lms/collections/pages/view-collection/constants/type-scale";
import type { CollectionsViewHook } from "@/features/lms/collections/pages/view-collection/api/collections-view-logic";

interface ViewContainerProps {
  view: CollectionsViewHook;
}

const HEADINGS: Record<string, { title: string; caption: string }> = {
  modification_logs: {
    title: "Modification Logs",
    caption: "Every change recorded against this catalogue record.",
  },
  checkout_history: {
    title: "CheckOut History",
    caption: "Every time a copy of this collection went out.",
  },
  checkin_history: {
    title: "CheckIn History",
    caption: "Every time a copy of this collection came back.",
  },
};

export default function ViewContainer({ view }: ViewContainerProps) {
  const { activeTab, modificationLogs, checkoutHistory, checkinHistory } = view;
  const heading = HEADINGS[activeTab] ?? HEADINGS.modification_logs;

  return (
    <div className="flex h-full min-h-[70vh] w-full flex-col overflow-hidden rounded-xl border bg-white shadow-md">
      <div className="bg-[#003067] px-6 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white">
              <BookOpen className="size-5" />
            </div>
            <div>
              <Text className={`font-[gothamMedium] text-white ${TEXT_PRIMARY}`}>
                {heading.title}
              </Text>
              <Text className={`text-white/70 ${TEXT_SECONDARY}`}>
                {heading.caption}
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-7 pb-4 pt-6 sm:p-8 sm:pb-6 sm:pt-6 md:p-10 md:pt-8">
        {activeTab === "modification_logs" ? (
          <ViewCollectionModificationLogs
            logs={modificationLogs.items}
            total={modificationLogs.total}
            loading={modificationLogs.loading}
            onRefresh={modificationLogs.refresh}
            currentPage={modificationLogs.currentPage}
            totalPages={modificationLogs.totalPages}
            itemsPerPage={modificationLogs.itemsPerPage}
            onItemsPerPageChange={modificationLogs.setItemsPerPage}
            onGoToPage={modificationLogs.goToPage}
            onNextPage={modificationLogs.nextPage}
            onPrevPage={modificationLogs.prevPage}
          />
        ) : activeTab === "checkout_history" ? (
          <ViewCollectionCheckoutHistory
            history={checkoutHistory.items}
            loading={checkoutHistory.loading}
            onRefresh={checkoutHistory.refresh}
            currentPage={checkoutHistory.currentPage}
            totalPages={checkoutHistory.totalPages}
            itemsPerPage={checkoutHistory.itemsPerPage}
            onItemsPerPageChange={checkoutHistory.setItemsPerPage}
            onGoToPage={checkoutHistory.goToPage}
            onNextPage={checkoutHistory.nextPage}
            onPrevPage={checkoutHistory.prevPage}
          />
        ) : (
          <ViewCollectionCheckinHistory
            history={checkinHistory.items}
            loading={checkinHistory.loading}
            onRefresh={checkinHistory.refresh}
            currentPage={checkinHistory.currentPage}
            totalPages={checkinHistory.totalPages}
            itemsPerPage={checkinHistory.itemsPerPage}
            onItemsPerPageChange={checkinHistory.setItemsPerPage}
            onGoToPage={checkinHistory.goToPage}
            onNextPage={checkinHistory.nextPage}
            onPrevPage={checkinHistory.prevPage}
          />
        )}
      </div>
    </div>
  );
}
