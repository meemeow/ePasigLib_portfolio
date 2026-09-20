import type { RefObject } from "react";
import { ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import ProfilePersonalInfo from "@/features/lms/profile/components/ProfilePersonalInfo";
import ProfileRoles from "@/features/lms/profile/components/ProfileRoles";
import ProfileModificationLogs from "@/features/lms/profile/components/ProfileModificationLogs";
import type { StaffRoles } from "@/lib/auth/auth-types";
import type {
  ModificationLog,
  ProfileData,
  ProfileFieldErrors,
  ProfileResult,
  ProfileTab,
} from "@/features/lms/profile/types/profile-types";

interface ProfileContainerProps {
  activeTab: ProfileTab;
  editableData: ProfileData;
  fieldErrors: ProfileFieldErrors;
  staffRoles: StaffRoles | null;
  isEditing: boolean;
  isProcessing: boolean;
  hasChanges: boolean;
  cities: string[];
  barangays: string[];
  avatarPreview: string | null;
  avatarEditing: boolean;
  selectedAvatar: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  logs: ModificationLog[];
  loadingLogs: boolean;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onRefreshLogs: () => void;
  onItemsPerPageChange: (value: number) => void;
  onGoToPage: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onStartEditing: () => void;
  onSave: () => Promise<ProfileResult>;
  onCancel: () => void;
  onStartAvatarEditing: () => void;
  onSelectAvatar: (file: File) => void;
  onUploadAvatar: () => Promise<ProfileResult>;
  onCancelAvatar: () => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCityChange: (value: string) => void;
  setBarangay: (value: string) => void;
}

const TAB_FOOTER: Record<ProfileTab, { title: string; caption: string }> = {
  home: {
    title: "My Details",
    caption: "Keep your contact details up to date.",
  },
  roles: {
    title: "My Permissions",
    caption: "Permissions are managed by an administrator.",
  },
  modification_logs: {
    title: "View History",
    caption: "View every modification made to your account.",
  },
};

export default function ProfileContainer({
  activeTab,
  editableData,
  fieldErrors,
  staffRoles,
  isEditing,
  isProcessing,
  hasChanges,
  cities,
  barangays,
  avatarPreview,
  avatarEditing,
  selectedAvatar,
  fileInputRef,
  logs,
  loadingLogs,
  currentPage,
  totalPages,
  itemsPerPage,
  onRefreshLogs,
  onItemsPerPageChange,
  onGoToPage,
  onPrevPage,
  onNextPage,
  onStartEditing,
  onSave,
  onCancel,
  onStartAvatarEditing,
  onSelectAvatar,
  onUploadAvatar,
  onCancelAvatar,
  handleChange,
  handleCityChange,
  setBarangay,
}: ProfileContainerProps) {
  const footer = isEditing
    ? {
        title: "Review & Confirm",
        caption: "Review your details before saving changes.",
      }
    : TAB_FOOTER[activeTab];

  return (
    <div className="flex h-full min-h-[70vh] w-full flex-col overflow-hidden rounded-xl border bg-white shadow-md">
      <div className="bg-[#003067] px-6 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white">
              <User className="size-5" />
            </div>
            <div>
              <Text className="font-[gothamMedium] text-base text-white sm:text-lg">
                My Profile
              </Text>
              <Text className="text-xs text-white/70 sm:text-sm">
                View and manage your own account details and permissions
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-7 pt-6 pb-4 sm:p-8 sm:pt-6 sm:pb-6 md:p-10 md:pt-8">
        {activeTab === "home" && (
          <ProfilePersonalInfo
            editableData={editableData}
            fieldErrors={fieldErrors}
            isEditing={isEditing}
            isProcessing={isProcessing}
            cities={cities}
            barangays={barangays}
            avatarPreview={avatarPreview}
            avatarEditing={avatarEditing}
            selectedAvatar={selectedAvatar}
            fileInputRef={fileInputRef}
            onStartAvatarEditing={onStartAvatarEditing}
            onSelectAvatar={onSelectAvatar}
            onUploadAvatar={onUploadAvatar}
            onCancelAvatar={onCancelAvatar}
            handleChange={handleChange}
            handleCityChange={handleCityChange}
            setBarangay={setBarangay}
          />
        )}

        {activeTab === "roles" && (
          <ProfileRoles
            staffRoles={staffRoles}
            jobTitle={editableData.JobTitle}
          />
        )}

        {activeTab === "modification_logs" && (
          <ProfileModificationLogs
            logs={logs}
            loading={loadingLogs}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onRefresh={onRefreshLogs}
            onItemsPerPageChange={onItemsPerPageChange}
            onGoToPage={onGoToPage}
            onPrevPage={onPrevPage}
            onNextPage={onNextPage}
          />
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-4 border-t bg-white px-8 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:h-10 md:w-10">
            <ShieldCheck className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base text-[#003067] md:text-lg">
              {footer.title}
            </Text>
            <Text className="text-xs text-gray-500 md:text-sm">
              {footer.caption}
            </Text>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          {activeTab === "home" &&
            (!isEditing ? (
              <Button
                onClick={onStartEditing}
                variant="default"
                className="w-auto bg-blue-500 text-white hover:bg-blue-600 md:w-[140px]"
                disabled={isProcessing || avatarEditing}
              >
                Edit Profile
              </Button>
            ) : (
              <>
                {hasChanges && (
                  <Button
                    onClick={onSave}
                    disabled={isProcessing}
                    className={
                      isProcessing
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }
                  >
                    {isProcessing ? "Saving..." : "Save Changes"}
                  </Button>
                )}
                <Button
                  onClick={onCancel}
                  variant="cancel"
                  className="w-auto md:w-[120px]"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
