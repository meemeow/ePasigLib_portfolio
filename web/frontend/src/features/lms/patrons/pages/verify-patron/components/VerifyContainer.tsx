import { User, ShieldCheck } from "lucide-react";
import { Text } from "@/components/ui/Text";
import VerifyUnverifiedPatrons from "@/features/lms/patrons/pages/verify-patron/components/VerifyUnverifiedPatrons";
import type { VerifyPatron } from "@/features/lms/patrons/pages/verify-patron/types/patrons-verify-types";

interface VerifyContainerProps {
  patrons: VerifyPatron[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onView: (patron: VerifyPatron) => void;
}

export default function VerifyContainer({
  patrons,
  loading,
  onRefresh,
  currentPage,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onGoToPage,
  onNextPage,
  onPrevPage,
  onView,
}: VerifyContainerProps) {
  return (
    <div className="flex h-full min-h-[70vh] w-full flex-col overflow-hidden rounded-xl border bg-white shadow-md">
      <div className="bg-[#003067] px-6 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white">
              <User className="size-5" />
            </div>
            <div>
              <Text className="font-[gothamMedium] text-base sm:text-lg text-white">
                Unverified Patrons
              </Text>
              <Text className="text-xs sm:text-sm text-white/70">
                Review and verify patron account requests
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-7 pb-4 pt-6 sm:p-8 sm:pb-6 sm:pt-6 md:p-10 md:pt-8">
        <VerifyUnverifiedPatrons
          patrons={patrons}
          loading={loading}
          onRefresh={onRefresh}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          onGoToPage={onGoToPage}
          onNextPage={onNextPage}
          onPrevPage={onPrevPage}
          onView={onView}
        />
      </div>

      <div className="shrink-0 flex flex-col gap-4 border-t bg-white px-8 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1]">
            <ShieldCheck className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
              Verify Accounts
            </Text>
            <Text className="text-xs md:text-sm text-gray-500">
              Review unverified patron accounts and approve or reject their verification requests.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
