import React from "react";
import { User, ShieldCheck, Info } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { DatePicker } from "@/components/ui/DatePicker";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { StaffFormData, StaffRoleKeys } from "@/features/lms/staffs/pages/view-staff/types/staffs-view-types";
import type { StaffHomeFieldErrors } from "@/features/lms/staffs/pages/view-staff/schema/staffs-view-schema";
import { minBirthDate } from "@/lib/format/date";
import {
  STAFF_ROLE_GROUPS,
  formatPermissionLabel,
} from "@/lib/constants/staff-role-groups";

interface ViewStaffPersonalInfoProps {
  formData: Partial<StaffFormData>;
  setFormData: (value: Partial<StaffFormData>) => void;
  editable: boolean;
  errors: StaffHomeFieldErrors;
  isArchived: boolean;
  emailEditMode: boolean;
  verifyingEmail: boolean;
  emailChangedValid: boolean;
  cities: string[];
  barangays: string[];
  canEditStaff: boolean;
  initialData: Partial<StaffFormData>;
  isProcessing?: boolean;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  handleGroupToggle: (fields: StaffRoleKeys[], checked: boolean) => void;
  handleCityChange: (value: string) => void;
  handleVerifyEmail: () => Promise<void>;
  startEmailEdit: () => void;
  cancelEmailEdit: () => void;
}

const allPermissionKeys = STAFF_ROLE_GROUPS.flatMap((g) => g.permissions);

const fourYearsAgo = minBirthDate();

export const ViewStaffPersonalInfo = React.memo(function ViewStaffPersonalInfo({
  formData,
  setFormData,
  editable,
  errors,
  isArchived,
  emailEditMode,
  verifyingEmail,
  emailChangedValid,
  cities,
  barangays,
  canEditStaff,
  initialData,
  isProcessing = false,
  handleChange,
  handleCityChange,
  handleVerifyEmail,
  startEmailEdit,
  cancelEmailEdit,
}: ViewStaffPersonalInfoProps) {
  const isReadOnly = !editable || isArchived || emailEditMode;
  const isAdmin = formData.JobTitle === "Admin";

  const handleJobTitleChange = (value: string) => {
    if (initialData.JobTitle === "Admin") return;

    if (value === "Admin") {
      const allRolesTrue = allPermissionKeys.reduce(
        (acc, role) => ({ ...acc, [role]: true }),
        {} as Record<StaffRoleKeys, boolean>,
      );
      setFormData({
        ...formData,
        JobTitle: value,
        ...allRolesTrue,
      });
    } else {
      setFormData({ ...formData, JobTitle: value });
    }
  };

  const handlePermissionChange = (perm: StaffRoleKeys, checked: boolean) => {
    setFormData({ ...formData, [perm]: checked });
  };

  const handleGroupToggle = (permissions: StaffRoleKeys[], checked: boolean) => {
    const updates = permissions.reduce(
      (acc, p) => ({ ...acc, [p]: checked }),
      {} as Record<StaffRoleKeys, boolean>,
    );
    setFormData({ ...formData, ...updates });
  };

  const rolesError = errors?.Roles;

  const labelClassName =
    "text-[#003067] text-xs sm:text-sm font-[gothamMedium]";

  return (
    <div className="grid grid-cols-1 2xl:gap-8 2xl:grid-cols-2 gap-6 md:gap-12">
      <div className="space-y-6 border-b border-gray-200 pb-6 md:pb-12 2xl:border-b-0 2xl:pb-0 2xl:border-r 2xl:border-gray-200 2xl:pr-8">
        <div className="flex items-start gap-3 mb-6 md:mb-8">
          <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
            <User className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
              Personal Information
            </Text>
            <Text className="text-xs md:text-sm text-gray-500">
              View and edit the librarian&apos;s personal details.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:gap-4 sm:grid-cols-2">
          <Input
            id="FirstName"
            name="FirstName"
            label="First Name"
            placeholder="Juan"
            value={formData.FirstName || ""}
            onChange={handleChange}
            readOnly={isReadOnly}
            required
            error={editable ? errors?.FirstName : undefined}
            labelClassName={labelClassName}
          />

          <Input
            id="MiddleName"
            name="MiddleName"
            label="Middle Name"
            placeholder="Batumbakal"
            value={formData.MiddleName || ""}
            onChange={handleChange}
            readOnly={isReadOnly}
            error={editable ? errors?.MiddleName : undefined}
            labelClassName={labelClassName}
          />

          <Input
            id="LastName"
            name="LastName"
            label="Last Name"
            placeholder="Dela Cruz"
            value={formData.LastName || ""}
            onChange={handleChange}
            readOnly={isReadOnly}
            required
            error={editable ? errors?.LastName : undefined}
            labelClassName={labelClassName}
          />

          <Input
            id="Suffix"
            name="Suffix"
            label="Suffix"
            placeholder="Jr., Sr., III"
            value={formData.Suffix || ""}
            onChange={handleChange}
            readOnly={isReadOnly}
            error={editable ? errors?.Suffix : undefined}
            labelClassName={labelClassName}
          />

          <DatePicker
            id="BirthDate"
            name="BirthDate"
            label="Birthdate"
            value={formData.BirthDate || ""}
            onChange={(val) => setFormData({ ...formData, BirthDate: val })}
            max={fourYearsAgo}
            min="1900-01-01"
            placeholder="Select birth date"
            disabled={isReadOnly}
            required
            error={editable ? errors?.BirthDate : undefined}
            labelClassName={labelClassName}
          />

          <Select
            value={formData.Sex || ""}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                Sex: value.charAt(0).toUpperCase() + value.slice(1),
              })
            }
            label="Sex"
            required
            error={editable ? errors?.Sex : undefined}
            triggerId="Sex"
            labelClassName={labelClassName}
            disabled={isReadOnly}
          >
            <SelectTrigger
              id="Sex"
              className="w-full"
              error={editable ? errors?.Sex : undefined}
            >
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Intersex">Intersex</SelectItem>
              <SelectItem value="Prefer not to say">
                Prefer not to say
              </SelectItem>
            </SelectContent>
          </Select>

          <SearchableSelect
            options={cities}
            value={formData.City || ""}
            onChange={handleCityChange}
            placeholder="Select city"
            label="City"
            required
            disabled={isReadOnly}
            error={editable ? errors?.City : undefined}
            labelClassName={labelClassName}
          />

          <SearchableSelect
            options={barangays}
            value={formData.Barangay || ""}
            onChange={(val) =>
              setFormData({ ...formData, Barangay: val })
            }
            placeholder="Select barangay"
            label="Barangay"
            required
            disabled={!formData.City || isReadOnly}
            error={editable ? errors?.Barangay : undefined}
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
            required
            error={editable ? errors?.PhoneNumber : undefined}
            labelClassName={labelClassName}
          />

          <Select
            value={formData.JobTitle || ""}
            onValueChange={handleJobTitleChange}
            label="Job Title"
            required
            error={editable ? errors?.JobTitle : undefined}
            triggerId="JobTitle"
            labelClassName={labelClassName}
            disabled={isReadOnly || initialData.JobTitle === "Admin"}
          >
            <SelectTrigger
              id="JobTitle"
              className="w-full h-10 px-3"
              error={editable ? errors?.JobTitle : undefined}
            >
              <SelectValue placeholder="Select Job Title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Admin Aide">Admin Aide</SelectItem>
              <SelectItem value="Librarian">Librarian</SelectItem>
            </SelectContent>
          </Select>
          {initialData.JobTitle === "Admin" && (
            <Text className="text-red-600 text-xs font-semibold sm:col-span-2">
              Admin job title cannot be changed. All permissions are granted.
            </Text>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                id="Email"
                name="Email"
                type="email"
                label="Email Address"
                placeholder="example@domain.com"
                value={formData.Email || ""}
                onChange={handleChange}
                readOnly={!emailEditMode || isArchived}
                required
                error={emailEditMode ? errors?.Email : undefined}
                labelClassName={labelClassName}
              />
            </div>
            <div className="shrink-0 pb-[2px]">
              {canEditStaff && !isArchived && (
                <>
                  {!emailEditMode ? (
                    <Button
                      onClick={startEmailEdit}
                      disabled={
                        editable || verifyingEmail || isProcessing || isArchived
                      }
                      variant="secondary"
                      size="sm"
                      className="w-auto md:w-[110px]"
                    >
                      Edit Email
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      {emailChangedValid &&
                        Object.keys(errors || {}).length === 0 && (
                          <Button
                            onClick={handleVerifyEmail}
                            disabled={verifyingEmail}
                            className={
                              verifyingEmail
                                ? "bg-green-600 hover:bg-green-700 text-white cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 text-white"
                            }
                            size="sm"
                          >
                            {verifyingEmail ? "Verifying..." : "Verify"}
                          </Button>
                        )}
                      <Button
                        onClick={cancelEmailEdit}
                        disabled={verifyingEmail}
                        variant="cancel"
                        size="sm"
                        className="w-auto md:w-[110px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {emailEditMode && errors?.Email && (
            <Text className="text-red-600 text-xs mt-1">{errors.Email}</Text>
          )}
        </div>
      </div>

      <div className="space-y-6 my-auto">
        <div className="flex items-start gap-3">
          <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
            <ShieldCheck className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
              Roles & Permissions
            </Text>
            <Text className="text-xs md:text-sm text-gray-500">
              View and assign roles and permissions for this librarian.
            </Text>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-[#EAF4FE] px-4 py-3">
          <Info className="size-3 md:size-4 shrink-0 text-[#128CF1]" />
          <Text className="text-xs md:text-sm text-[#0B2545]">
            Select the role(s) that best fit the librarian&apos;s
            responsibilities.
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-2">
          {STAFF_ROLE_GROUPS.map(({ label, icon: Icon, permissions }) => {
            const allChecked = permissions.every((perm) =>
              Boolean(formData[perm]),
            );
            const isDisabled = !editable || isArchived || isAdmin;

            return (
              <div
                key={label}
                className="space-y-4 rounded-lg border bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-[gothamMedium] text-[#003067]">
                    <Icon className="size-4 text-[#128CF1]" />
                    {label}
                  </div>
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(checked) =>
                      handleGroupToggle(permissions, Boolean(checked))
                    }
                    aria-label={`Toggle all ${label} permissions`}
                    disabled={isDisabled}
                  />
                </div>
                <div className="space-y-3">
                  {permissions.map((perm) => (
                    <Text
                      as="label"
                      key={perm}
                      className="flex items-center gap-2 text-sm font-normal text-gray-700 cursor-pointer"
                    >
                      <Checkbox
                        name={perm}
                        checked={Boolean(formData[perm])}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(perm, Boolean(checked))
                        }
                        disabled={isDisabled}
                      />
                      {formatPermissionLabel(perm)}
                    </Text>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {rolesError && (
          <Text className="text-red-600 text-xs">{rolesError}</Text>
        )}
      </div>
    </div>
  );
});

export default ViewStaffPersonalInfo;
