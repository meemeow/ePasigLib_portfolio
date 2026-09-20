import React from "react";
import {
  User,
  ShieldCheck,
  Info,
  FileText,
  RefreshCw,
  Users,
  Megaphone,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { DatePicker } from "@/components/ui/DatePicker";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Text } from "@/components/ui/Text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type {
  StaffRegisterForm,
  StaffRegisterFieldErrors,
} from "@/features/lms/staffs/pages/register-staff/types/staff-register-types";

interface PersonalRolesTabProps {
  form: StaffRegisterForm;
  setField: <K extends keyof StaffRegisterForm>(
    name: K,
    value: StaffRegisterForm[K],
  ) => void;
  setMany: (patch: Partial<StaffRegisterForm>) => void;
  fieldErrors: StaffRegisterFieldErrors;
  cities: string[];
  barangays: string[];
  loading: boolean;
  fourYearsAgo: string;
}

const roleGroups = [
  {
    label: "Cataloging",
    icon: FileText,
    permissions: [
      "CatalogingAdd",
      "CatalogingEdit",
      "CatalogingArchive",
    ] as const,
  },
  {
    label: "Circulation",
    icon: RefreshCw,
    permissions: ["Checkout", "Checkin", "ApproveRenewals"] as const,
  },
  {
    label: "Patron Management",
    icon: Users,
    permissions: [
      "PatronAdd",
      "PatronEdit",
      "PatronArchive",
      "VerifyIDs",
    ] as const,
  },
  {
    label: "Help & Updates",
    icon: Megaphone,
    permissions: [
      "AnnouncementCreation",
      "ReportGeneration",
      "LiveChat",
    ] as const,
  },
];

type PermissionKey = (typeof roleGroups)[number]["permissions"][number];
const allPermissionKeys = roleGroups.flatMap((g) => g.permissions);

const formatPermissionLabel = (perm: string) =>
  perm.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

export const PersonalRolesTab = React.memo(function PersonalRolesTab({
  form,
  setField,
  setMany,
  fieldErrors,
  cities,
  barangays,
  loading,
  fourYearsAgo,
}: PersonalRolesTabProps) {
  const isAdmin = form.JobTitle === "Admin";

  const handleJobTitleChange = (value: string) => {
    const previousJobTitle = form.JobTitle;

    if (value === "Admin") {
      const allRolesTrue = allPermissionKeys.reduce(
        (acc, role) => ({ ...acc, [role]: true }),
        {} as Record<PermissionKey, boolean>,
      );
      setMany({ JobTitle: value, ...allRolesTrue });
    } else if (previousJobTitle === "Admin") {
      const allRolesFalse = allPermissionKeys.reduce(
        (acc, role) => ({ ...acc, [role]: false }),
        {} as Record<PermissionKey, boolean>,
      );
      setMany({ JobTitle: value, ...allRolesFalse });
    } else {
      setField("JobTitle", value);
    }
  };

  const rolesError = fieldErrors._roles;

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
              Provide the librarian&apos;s personal details.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:gap-4 sm:grid-cols-2">
          <Input
            id="FirstName"
            name="FirstName"
            label="First Name"
            placeholder="Juan"
            value={form.FirstName}
            onChange={(e) => setField("FirstName", e.target.value)}
            disabled={loading}
            required
            error={fieldErrors.FirstName}
            labelClassName={labelClassName}
          />

          <Input
            id="MiddleName"
            name="MiddleName"
            label="Middle Name"
            placeholder="Batumbakal"
            value={form.MiddleName}
            onChange={(e) => setField("MiddleName", e.target.value)}
            disabled={loading}
            error={fieldErrors.MiddleName}
            labelClassName={labelClassName}
          />

          <Input
            id="LastName"
            name="LastName"
            label="Last Name"
            placeholder="Dela Cruz"
            value={form.LastName}
            onChange={(e) => setField("LastName", e.target.value)}
            disabled={loading}
            required
            error={fieldErrors.LastName}
            labelClassName={labelClassName}
          />

          <Input
            id="Suffix"
            name="Suffix"
            label="Suffix"
            placeholder="Jr., Sr., III"
            value={form.Suffix}
            onChange={(e) => setField("Suffix", e.target.value)}
            disabled={loading}
            error={fieldErrors.Suffix}
            labelClassName={labelClassName}
          />

          <DatePicker
            id="BirthDate"
            name="BirthDate"
            label="Birthdate"
            value={form.BirthDate}
            onChange={(val) => setField("BirthDate", val)}
            max={fourYearsAgo}
            min="1900-01-01"
            placeholder="Select birth date"
            disabled={loading}
            required
            error={fieldErrors.BirthDate}
            labelClassName={labelClassName}
          />

          <Select
            value={form.Sex}
            onValueChange={(value) => setField("Sex", value)}
            label="Sex"
            required
            error={fieldErrors.Sex}
            triggerId="Sex"
            labelClassName={labelClassName}
          >
            <SelectTrigger id="Sex" className="w-full" error={fieldErrors.Sex}>
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
            value={form.City ?? ""}
            onChange={(val) => {
              if (val !== form.City) {
                setField("City", val);
                setField("Barangay", "");
              }
            }}
            placeholder="Select city"
            label="City"
            required
            disabled={loading}
            error={fieldErrors.City}
            labelClassName={labelClassName}
          />

          <SearchableSelect
            options={barangays}
            value={form.Barangay ?? ""}
            onChange={(val) => setField("Barangay", val)}
            placeholder="Select barangay"
            label="Barangay"
            required
            disabled={!form.City || loading}
            error={fieldErrors.Barangay}
            labelClassName={labelClassName}
          />

          <PhoneInput
            id="PhoneNumber"
            name="PhoneNumber"
            label="Phone Number"
            placeholder="XXX-XXX-XXXX"
            value={form.PhoneNumber}
            onChange={(e) => setField("PhoneNumber", e.target.value)}
            maxLength={12}
            disabled={loading}
            required
            error={fieldErrors.PhoneNumber}
            labelClassName={labelClassName}
          />

          <Select
            value={form.JobTitle}
            onValueChange={handleJobTitleChange}
            label="Job Title"
            required
            error={fieldErrors.JobTitle}
            triggerId="JobTitle"
            labelClassName={labelClassName}
          >
            <SelectTrigger
              id="JobTitle"
              className="w-full h-10 px-3"
              error={fieldErrors.JobTitle}
            >
              <SelectValue placeholder="Select Job Title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Admin Aide">Admin Aide</SelectItem>
              <SelectItem value="Librarian">Librarian</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Text className="text-red-600 text-xs font-semibold sm:col-span-2">
              Warning: The Admin job title cannot be changed after registering
              the librarian. All permissions will be granted and the Roles
              section will be locked.
            </Text>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
            <ShieldCheck className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
              Roles & Permissions
            </Text>
            <Text className="text-xs md:text-sm text-gray-500">
              Assign roles and permissions for this librarian.
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
          {roleGroups.map(({ label, icon: Icon, permissions }) => {
            const allChecked = permissions.every((perm) => Boolean(form[perm]));
            const isDisabled = isAdmin || loading;
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
                      setMany(
                        Object.fromEntries(
                          permissions.map((key) => [key, Boolean(checked)]),
                        ) as Partial<StaffRegisterForm>,
                      )
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
                        checked={Boolean(form[perm])}
                        onCheckedChange={(checked) =>
                          setField(perm, Boolean(checked))
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

export default PersonalRolesTab;
