import { User, ShieldCheck } from "lucide-react";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import ViewPatronPersonalInfo from "@/features/lms/patrons/pages/view-patron/components/ViewPatronPersonalInfo";
import ViewPatronModificationLogs from "@/features/lms/patrons/pages/view-patron/components/ViewPatronModificationLogs";
import ViewPatronCheckoutHistory from "@/features/lms/patrons/pages/view-patron/components/ViewPatronCheckoutHistory";
import ViewPatronCheckinHistory from "@/features/lms/patrons/pages/view-patron/components/ViewPatronCheckinHistory";
import type {
  PatronFormData,
  PatronLogEntry,
  PatronCheckoutEntry,
  PatronCheckinEntry,
  PatronViewResult,
  PatronViewTab,
} from "@/features/lms/patrons/pages/view-patron/types/patrons-view-types";

interface ViewContainerProps {
  activeTab: PatronViewTab;
  onTabChange: (tab: PatronViewTab) => void;
  formData: Partial<PatronFormData>;
  setFormData: (value: Partial<PatronFormData>) => void;
  editable: boolean;
  setEditable: (value: boolean) => void;
  errors: Record<string, string | undefined>;
  isArchived: boolean;
  emailEditMode: boolean;
  verifyingEmail: boolean;
  emailVerified: boolean;
  emailChangedValid: boolean;
  hasChanges: boolean;
  isProcessing: boolean;
  cities: string[];
  barangays: string[];
  canEditPatron: boolean;
  canArchivePatron: boolean;
  initialData: Partial<PatronFormData>;
  idPreviewUrl: string | null;
  modificationLogs: PatronLogEntry[];
  loadingModificationLogs: boolean;
  modificationLogsCurrentPage: number;
  modificationLogsTotalPages: number;
  modificationLogsItemsPerPage: number;
  goToModificationLogsPage: (page: number) => void;
  nextModificationLogsPage: () => void;
  prevModificationLogsPage: () => void;
  handleModificationLogsItemsPerPageChange: (value: number) => void;
  checkoutHistory: PatronCheckoutEntry[];
  loadingCheckoutHistory: boolean;
  checkoutHistoryCurrentPage: number;
  checkoutHistoryTotalPages: number;
  checkoutHistoryItemsPerPage: number;
  goToCheckoutHistoryPage: (page: number) => void;
  nextCheckoutHistoryPage: () => void;
  prevCheckoutHistoryPage: () => void;
  handleCheckoutHistoryItemsPerPageChange: (value: number) => void;
  checkinHistory: PatronCheckinEntry[];
  loadingCheckinHistory: boolean;
  checkinHistoryCurrentPage: number;
  checkinHistoryTotalPages: number;
  checkinHistoryItemsPerPage: number;
  goToCheckinHistoryPage: (page: number) => void;
  nextCheckinHistoryPage: () => void;
  prevCheckinHistoryPage: () => void;
  handleCheckinHistoryItemsPerPageChange: (value: number) => void;
  refreshModificationLogs: () => Promise<void>;
  refreshCheckoutHistory: () => Promise<void>;
  refreshCheckinHistory: () => Promise<void>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCityChange: (value: string) => void;
  handleSave: () => Promise<PatronViewResult>;
  handleVerifyEmail: () => Promise<void>;
  startEmailEdit: () => void;
  cancelEmailEdit: () => void;
  setShowArchiveModal: (value: boolean) => void;
  setArchiveAction: (value: "archive" | "unarchive") => void;
  handleArchive: () => Promise<PatronViewResult>;
  handleUnarchive: () => Promise<PatronViewResult>;
  goBack: () => void;
}

export default function ViewContainer({
  activeTab,
  formData,
  setFormData,
  editable,
  setEditable,
  errors,
  isArchived,
  emailEditMode,
  verifyingEmail,
  emailVerified,
  emailChangedValid,
  hasChanges,
  isProcessing,
  cities,
  barangays,
  canEditPatron,
  canArchivePatron,
  initialData,
  idPreviewUrl,
  modificationLogs,
  loadingModificationLogs,
  modificationLogsCurrentPage,
  modificationLogsTotalPages,
  modificationLogsItemsPerPage,
  goToModificationLogsPage,
  nextModificationLogsPage,
  prevModificationLogsPage,
  handleModificationLogsItemsPerPageChange,
  checkoutHistory,
  loadingCheckoutHistory,
  checkoutHistoryCurrentPage,
  checkoutHistoryTotalPages,
  checkoutHistoryItemsPerPage,
  goToCheckoutHistoryPage,
  nextCheckoutHistoryPage,
  prevCheckoutHistoryPage,
  handleCheckoutHistoryItemsPerPageChange,
  checkinHistory,
  loadingCheckinHistory,
  checkinHistoryCurrentPage,
  checkinHistoryTotalPages,
  checkinHistoryItemsPerPage,
  goToCheckinHistoryPage,
  nextCheckinHistoryPage,
  prevCheckinHistoryPage,
  handleCheckinHistoryItemsPerPageChange,
  refreshModificationLogs,
  refreshCheckoutHistory,
  refreshCheckinHistory,
  handleChange,
  handleCityChange,
  handleSave,
  handleVerifyEmail,
  startEmailEdit,
  cancelEmailEdit,
  setShowArchiveModal,
  setArchiveAction,
}: ViewContainerProps) {
  const isHomeTab = activeTab === "home";

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
                Patron Profile
              </Text>
              <Text className="text-xs sm:text-sm text-white/70">
                View and manage patron details
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-7 pb-4 pt-6 sm:p-8 sm:pb-6 sm:pt-6 md:p-10 md:pt-8">
        {isHomeTab ? (
          <ViewPatronPersonalInfo
            formData={formData}
            setFormData={setFormData}
            editable={editable}
            errors={errors}
            isArchived={isArchived}
            emailEditMode={emailEditMode}
            verifyingEmail={verifyingEmail}
            emailChangedValid={emailChangedValid}
            cities={cities}
            barangays={barangays}
            canEditPatron={canEditPatron}
            idPreviewUrl={idPreviewUrl}
            handleChange={handleChange}
            handleCityChange={handleCityChange}
            handleVerifyEmail={handleVerifyEmail}
            startEmailEdit={startEmailEdit}
            cancelEmailEdit={cancelEmailEdit}
          />
        ) : activeTab === "modification_logs" ? (
          <ViewPatronModificationLogs
            logs={modificationLogs}
            loading={loadingModificationLogs}
            onRefresh={refreshModificationLogs}
            currentPage={modificationLogsCurrentPage}
            totalPages={modificationLogsTotalPages}
            itemsPerPage={modificationLogsItemsPerPage}
            onItemsPerPageChange={handleModificationLogsItemsPerPageChange}
            onGoToPage={goToModificationLogsPage}
            onNextPage={nextModificationLogsPage}
            onPrevPage={prevModificationLogsPage}
          />
        ) : activeTab === "checkout_history" ? (
          <ViewPatronCheckoutHistory
            history={checkoutHistory}
            loading={loadingCheckoutHistory}
            onRefresh={refreshCheckoutHistory}
            currentPage={checkoutHistoryCurrentPage}
            totalPages={checkoutHistoryTotalPages}
            itemsPerPage={checkoutHistoryItemsPerPage}
            onItemsPerPageChange={handleCheckoutHistoryItemsPerPageChange}
            onGoToPage={goToCheckoutHistoryPage}
            onNextPage={nextCheckoutHistoryPage}
            onPrevPage={prevCheckoutHistoryPage}
          />
        ) : (
          <ViewPatronCheckinHistory
            history={checkinHistory}
            loading={loadingCheckinHistory}
            onRefresh={refreshCheckinHistory}
            currentPage={checkinHistoryCurrentPage}
            totalPages={checkinHistoryTotalPages}
            itemsPerPage={checkinHistoryItemsPerPage}
            onItemsPerPageChange={handleCheckinHistoryItemsPerPageChange}
            onGoToPage={goToCheckinHistoryPage}
            onNextPage={nextCheckinHistoryPage}
            onPrevPage={prevCheckinHistoryPage}
          />
        )}
      </div>

      <div className="shrink-0 flex flex-col gap-4 border-t bg-white px-8 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1]">
            <ShieldCheck className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
              {!isHomeTab
                ? "View History"
                : editable
                  ? "Review & Confirm"
                  : emailEditMode
                    ? "Verify Email Change"
                    : "View Profile"}
            </Text>
            <Text className="text-xs md:text-sm text-gray-500">
              {!isHomeTab
                ? `View ${activeTab.replace("_", " ")} for this patron.`
                : editable
                  ? "Review patron details before saving changes."
                  : emailEditMode
                    ? "Verify the new email address for this patron."
                    : "View patron details and manage account settings."}
            </Text>
          </div>
        </div>

        <div className="flex justify-end gap-3 flex-wrap">
          {isHomeTab && (
            <>
              {canEditPatron && (
                <>
                  {!editable ? (
                    <Button
                      onClick={() => setEditable(true)}
                      className={`bg-blue-500 text-white hover:bg-blue-600 w-auto md:w-[120px] ${COMPACT_CONTROL}`}
                      variant="default"
                      disabled={isProcessing || emailEditMode || verifyingEmail || isArchived}
                    >
                      Edit
                    </Button>
                  ) : (
                    <>
                      {hasChanges && (
                        <Button
                          onClick={handleSave}
                          disabled={!emailVerified || isProcessing || emailEditMode || verifyingEmail || isArchived}
                          className={`${!emailVerified || isProcessing || emailEditMode || verifyingEmail
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-500 hover:bg-blue-600 text-white"} ${COMPACT_CONTROL}`}
                        >
                          Save Changes
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setEditable(false);
                          setFormData(initialData);
                        }}
                        variant="cancel"
                        className={`w-auto md:w-[120px] ${COMPACT_CONTROL}`}
                        disabled={isProcessing || emailEditMode || verifyingEmail || isArchived}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              )}

              {canArchivePatron &&
                (isArchived ? (
                  <Button
                    onClick={() => {
                      setArchiveAction("unarchive");
                      setShowArchiveModal(true);
                    }}
                    className={`bg-yellow-600 text-white hover:bg-yellow-700 w-auto md:w-[100px] ${COMPACT_CONTROL}`}
                    disabled={isProcessing || emailEditMode || verifyingEmail}
                  >
                    Unarchive
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setArchiveAction("archive");
                      setShowArchiveModal(true);
                    }}
                    className={`bg-red-500 text-white hover:bg-red-600 w-auto md:w-[120px] ${COMPACT_CONTROL}`}
                    disabled={editable || isProcessing || emailEditMode || verifyingEmail}
                  >
                    Archive
                  </Button>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
