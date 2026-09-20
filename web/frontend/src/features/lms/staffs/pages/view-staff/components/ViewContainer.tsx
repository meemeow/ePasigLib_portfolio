import { User, ShieldCheck } from "lucide-react";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import ViewStaffPersonalInfo from "./ViewStaffPersonalInfo";
import ViewStaffModificationLogs from "./ViewStaffModificationLogs";
import type { StaffFormData, StaffLogEntry, StaffRoleKeys, StaffViewResult } from "@/features/lms/staffs/pages/view-staff/types/staffs-view-types";

interface ViewContainerProps {
  activeTab: "home" | "modification_logs";
  onTabChange: (tab: "home" | "modification_logs") => void;
  formData: Partial<StaffFormData>;
  setFormData: (value: Partial<StaffFormData>) => void;
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
  canEditStaff: boolean;
  canArchiveStaff: boolean;
  initialData: Partial<StaffFormData>;
  modificationLogs: StaffLogEntry[];
  loadingModificationLogs: boolean;
  modificationLogsCurrentPage: number;
  modificationLogsTotalPages: number;
  modificationLogsItemsPerPage: number;
  goToModificationLogsPage: (page: number) => void;
  nextModificationLogsPage: () => void;
  prevModificationLogsPage: () => void;
  handleModificationLogsItemsPerPageChange: (value: number) => void;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  handleGroupToggle: (fields: StaffRoleKeys[], checked: boolean) => void;
  handleCityChange: (value: string) => void;
  handleSave: () => Promise<StaffViewResult>;
  handleVerifyEmail: () => Promise<void>;
  startEmailEdit: () => void;
  cancelEmailEdit: () => void;
  handleArchive: () => Promise<StaffViewResult>;
  handleUnarchive: () => Promise<StaffViewResult>;
  setShowArchiveModal: (value: boolean) => void;
  setArchiveAction: (value: "archive" | "unarchive") => void;
  refreshModificationLogs: () => Promise<void>;
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
  canEditStaff,
  canArchiveStaff,
  initialData,
  modificationLogs,
  loadingModificationLogs,
  modificationLogsCurrentPage,
  modificationLogsTotalPages,
  modificationLogsItemsPerPage,
  goToModificationLogsPage,
  nextModificationLogsPage,
  prevModificationLogsPage,
  handleModificationLogsItemsPerPageChange,
  handleChange,
  handleGroupToggle,
  handleCityChange,
  handleSave,
  handleVerifyEmail,
  startEmailEdit,
  cancelEmailEdit,
  setShowArchiveModal,
  setArchiveAction,
  refreshModificationLogs,
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
                Librarian Profile
              </Text>
              <Text className="text-xs sm:text-sm text-white/70">
                View and manage librarian details and permissions
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-7 pb-4 pt-6 sm:p-8 sm:pb-6 sm:pt-6 md:p-10 md:pt-8">
        {isHomeTab ? (
          <ViewStaffPersonalInfo
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
            canEditStaff={canEditStaff}
            initialData={initialData}
            isProcessing={isProcessing}
            handleChange={handleChange}
            handleGroupToggle={handleGroupToggle}
            handleCityChange={handleCityChange}
            handleVerifyEmail={handleVerifyEmail}
            startEmailEdit={startEmailEdit}
            cancelEmailEdit={cancelEmailEdit}
          />
        ) : (
          <ViewStaffModificationLogs
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
                ? "View all modification logs for this librarian."
                : editable
                  ? "Review staff details before saving changes."
                  : emailEditMode
                    ? "Verify the new email address for this librarian."
                    : "View librarian details and manage account settings."}
            </Text>
          </div>
        </div>

        <div className="flex justify-end gap-3 flex-wrap">
          {isHomeTab && (
            <>
              {canEditStaff && (
                <>
                  {!editable ? (
                    <Button
                      onClick={() => setEditable(true)}
                      className={`bg-blue-500 text-white hover:bg-blue-600 w-auto md:w-[120px] ${COMPACT_CONTROL}`}
                      variant="default"
                      disabled={
                        isProcessing ||
                        emailEditMode ||
                        verifyingEmail ||
                        isArchived
                      }
                    >
                      Edit
                    </Button>
                  ) : (
                    <>
                      {hasChanges && (
                        <Button
                          onClick={handleSave}
                          disabled={
                            !emailVerified ||
                            isProcessing ||
                            emailEditMode ||
                            verifyingEmail ||
                            isArchived
                          }
                          className={`${!emailVerified ||
                            isProcessing ||
                            emailEditMode ||
                            verifyingEmail
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
                        disabled={
                          isProcessing ||
                          emailEditMode ||
                          verifyingEmail ||
                          isArchived
                        }
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              )}

              {canArchiveStaff &&
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
                    disabled={
                      editable ||
                      isProcessing ||
                      emailEditMode ||
                      verifyingEmail
                    }
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
