import type { RefObject } from "react";
import { BadgeCheck, Info, Lock, User } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import { formatFullDate } from "@/lib/format/date";
import { formatFullName } from "@/lib/format/name";
import { SCHOOL_WORK } from "@/lib/constants/hardcoded-constants";
import ProfileAvatar from "@/features/opac/profile/components/ProfileAvatar";
import type {
  ProfileData,
  ProfileFieldErrors,
} from "@/features/opac/profile/types/opac-profile-types";

interface ProfilePersonalInfoProps {
  formData: ProfileData;
  fieldErrors: ProfileFieldErrors;
  isEditing: boolean;
  isProcessing: boolean;
  cities: string[];
  barangays: string[];
  avatarPreview: string | null;
  avatarEditing: boolean;
  selectedFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onStartAvatarEditing: () => void;
  onSelectAvatar: (file: File) => void;
  onUploadAvatar: () => void;
  onCancelAvatar: () => void;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  handleCityChange: (value: string) => void;
  setBarangay: (value: string) => void;
  setSchoolWork: (value: string) => void;
}

const STATE_BADGE_CLASSES: Record<string, string> = {
  Verified: "bg-green-100 text-green-700",
  Active: "bg-green-100 text-green-700",
  Unverified: "bg-yellow-100 text-yellow-700",
  Rejected: "bg-red-100 text-red-700",
  Archived: "bg-red-100 text-red-700",
};

const labelClassName = "text-[#003067] text-xs sm:text-sm font-[gothamMedium]";

const NOT_AVAILABLE = "N/A";

function AccountRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-b-0">
      <Text className={labelClassName}>{label}</Text>
      <Text className="text-xs sm:text-sm font-[gothamLight] text-gray-700 text-right">
        {value || NOT_AVAILABLE}
      </Text>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value?: string }) {
  const badgeClass =
    STATE_BADGE_CLASSES[value || ""] || "bg-gray-100 text-gray-700";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-b-0">
      <Text className={labelClassName}>{label}</Text>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-[gothamMedium] ${badgeClass}`}
      >
        {value || NOT_AVAILABLE}
      </span>
    </div>
  );
}

export default function ProfilePersonalInfo({
  formData,
  fieldErrors,
  isEditing,
  isProcessing,
  cities,
  barangays,
  avatarPreview,
  avatarEditing,
  selectedFile,
  fileInputRef,
  onStartAvatarEditing,
  onSelectAvatar,
  onUploadAvatar,
  onCancelAvatar,
  handleChange,
  handleCityChange,
  setBarangay,
  setSchoolWork,
}: ProfilePersonalInfoProps) {
  const isReadOnly = !isEditing;

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-12 2xl:grid-cols-2 2xl:gap-8">
      <div className="order-2 space-y-6 2xl:order-1 2xl:border-r 2xl:border-gray-200 2xl:pr-8">
        <div className="mb-6 flex items-start gap-3 md:mb-8">
          <div className="my-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:h-10 md:w-10">
            <User className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base text-[#003067] md:text-lg">
              Personal Information
            </Text>
            <Text className="text-xs text-gray-500 md:text-sm">
              View and edit your own personal details.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
          <div className="sm:col-span-2">
            <Input
              id="FullName"
              label="Full Name"
              value={formatFullName(formData) || NOT_AVAILABLE}
              disabled
              labelClassName={labelClassName}
            />
          </div>

          <Input
            id="BirthDate"
            label="Birthdate"
            value={formatFullDate(formData.BirthDate) || NOT_AVAILABLE}
            disabled
            labelClassName={labelClassName}
          />

          <Input
            id="Sex"
            label="Sex"
            value={formData.Sex || NOT_AVAILABLE}
            disabled
            labelClassName={labelClassName}
          />

          <SearchableSelect
            options={cities}
            value={formData.City || ""}
            onChange={handleCityChange}
            placeholder={isEditing ? "Select city" : NOT_AVAILABLE}
            label="City"
            required={isEditing}
            disabled={isReadOnly}
            error={isEditing ? fieldErrors.City : undefined}
            labelClassName={labelClassName}
          />

          <SearchableSelect
            options={barangays}
            value={formData.Barangay || ""}
            onChange={setBarangay}
            placeholder={isEditing ? "Select barangay" : NOT_AVAILABLE}
            label="Barangay"
            required={isEditing}
            disabled={isReadOnly || !formData.City}
            error={isEditing ? fieldErrors.Barangay : undefined}
            labelClassName={labelClassName}
          />

          <PhoneInput
            id="PhoneNumber"
            name="PhoneNumber"
            label="Phone Number"
            placeholder="XXX-XXX-XXXX"
            value={formData.PhoneNumber || ""}
            onChange={handleChange}
            disabled={isReadOnly}
            required={isEditing}
            error={isEditing ? fieldErrors.PhoneNumber : undefined}
            labelClassName={labelClassName}
          />

          <Select
            value={formData.SchoolWork || ""}
            onValueChange={setSchoolWork}
            label="Education/Work Status"
            required={isEditing}
            error={isEditing ? fieldErrors.SchoolWork : undefined}
            triggerId="SchoolWork"
            labelClassName={labelClassName}
            disabled={isReadOnly}
          >
            <SelectTrigger
              id="SchoolWork"
              className="h-10 w-full px-3"
              error={isEditing ? fieldErrors.SchoolWork : undefined}
            >
              <SelectValue
                placeholder={isEditing ? "Select status" : NOT_AVAILABLE}
              />
            </SelectTrigger>
            <SelectContent>
              {SCHOOL_WORK.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
          <Input
            id="Email"
            type="email"
            label="Email Address"
            value={formData.Email || NOT_AVAILABLE}
            disabled
            labelClassName={labelClassName}
          />
          <div className="flex items-center gap-2 rounded-lg bg-[#EAF4FE] px-4 py-3">
            <Lock className="size-3 shrink-0 text-[#128CF1] md:size-4" />
            <Text className="text-xs text-[#0B2545] md:text-sm">
              Only your city, barangay, phone number and education/work status
              are editable here. Any other change has to be made by a librarian.
            </Text>
          </div>
        </div>
      </div>

      <div className="order-1 space-y-6 border-b border-gray-200 pb-6 md:pb-12 2xl:order-2 2xl:my-auto 2xl:border-b-0 2xl:pb-0">
        <div className="flex items-start gap-3">
          <div className="my-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:h-10 md:w-10">
            <BadgeCheck className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base text-[#003067] md:text-lg">
              Account Details
            </Text>
            <Text className="text-xs text-gray-500 md:text-sm">
              Your profile photo and library account identifiers.
            </Text>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-[#EAF4FE] px-4 py-3">
          <Info className="size-3 shrink-0 text-[#128CF1] md:size-4" />
          <Text className="text-xs text-[#0B2545] md:text-sm">
            A square photo of at least 200x200 pixels works best.
          </Text>
        </div>

        <div className="flex flex-col items-center gap-6 rounded-lg border bg-white p-4 sm:flex-row sm:items-start sm:gap-8 sm:p-6">
          <ProfileAvatar
            avatarPreview={avatarPreview}
            avatarEditing={avatarEditing}
            selectedFile={selectedFile}
            isProcessing={isProcessing}
            disabled={isEditing}
            fileInputRef={fileInputRef}
            onStartEditing={onStartAvatarEditing}
            onSelectFile={onSelectAvatar}
            onUpload={onUploadAvatar}
            onCancel={onCancelAvatar}
          />

          <div className="w-full flex-1">
            <AccountRow label="Library ID" value={formData.PublicUID} />
            <AccountRow label="Patron ID" value={formData.UID} />
            <AccountRow label="Account Type" value={formData.Role} />
            <StatusRow label="Account Status" value={formData.Status} />
            <StatusRow label="ID Verification" value={formData.State} />
          </div>
        </div>
      </div>
    </div>
  );
}
