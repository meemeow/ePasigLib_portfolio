import React from "react";
import { User, IdCard, Info } from "lucide-react";
import { Input } from "@/components/ui/Input";
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
import { SCHOOL_WORK } from "@/lib/constants/hardcoded-constants";
import type {
  PatronFormData,
} from "@/features/lms/patrons/pages/view-patron/types/patrons-view-types";
import type { PatronFieldErrors } from "@/features/lms/patrons/pages/view-patron/schema/patrons-view-schema";
import { minBirthDate } from "@/lib/format/date";

interface ViewPatronPersonalInfoProps {
  formData: Partial<PatronFormData>;
  setFormData: (value: Partial<PatronFormData>) => void;
  editable: boolean;
  errors: PatronFieldErrors;
  isArchived: boolean;
  emailEditMode: boolean;
  verifyingEmail: boolean;
  emailChangedValid: boolean;
  cities: string[];
  barangays: string[];
  canEditPatron: boolean;
  idPreviewUrl: string | null;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCityChange: (value: string) => void;
  handleVerifyEmail: () => Promise<void>;
  startEmailEdit: () => void;
  cancelEmailEdit: () => void;
}

const fourYearsAgo = minBirthDate();

export const ViewPatronPersonalInfo = React.memo(function ViewPatronPersonalInfo({
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
  canEditPatron,
  idPreviewUrl,
  handleChange,
  handleCityChange,
  handleVerifyEmail,
  startEmailEdit,
  cancelEmailEdit,
}: ViewPatronPersonalInfoProps) {
  const isReadOnly = !editable || isArchived || emailEditMode;

  const labelClassName = "text-[#003067] text-xs sm:text-sm font-[gothamMedium]";

  const handleFieldChange = <K extends keyof PatronFormData>(
    name: K,
    value: PatronFormData[K]
  ) => {
    setFormData({ ...formData, [name]: value });
  };

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
              View and edit the patron's personal details.
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
            onChange={(val) => handleFieldChange("BirthDate", val || "")}
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
              handleFieldChange("Sex", value.charAt(0).toUpperCase() + value.slice(1))
            }
            label="Sex"
            required
            error={editable ? errors?.Sex : undefined}
            triggerId="Sex"
            labelClassName={labelClassName}
            disabled={isReadOnly}
          >
            <SelectTrigger id="Sex" className="w-full" error={editable ? errors?.Sex : undefined}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Intersex">Intersex</SelectItem>
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
            onChange={(val) => handleFieldChange("Barangay", val)}
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
            value={formData.SchoolWork || ""}
            onValueChange={(value) => handleFieldChange("SchoolWork", value)}
            label="Education/Work Status"
            required
            error={editable ? errors?.SchoolWork : undefined}
            triggerId="SchoolWork"
            labelClassName={labelClassName}
            disabled={isReadOnly}
          >
            <SelectTrigger
              id="SchoolWork"
              className="w-full h-10 px-3"
              error={editable ? errors?.SchoolWork : undefined}
            >
              <SelectValue placeholder="Select Education/Work Status" />
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
              {canEditPatron && !isArchived && (
                <>
                  {!emailEditMode ? (
                    <Button
                      onClick={startEmailEdit}
                      disabled={editable || verifyingEmail || isArchived}
                      variant="secondary"
                      size="sm"
                      className="w-auto md:w-[110px]"
                    >
                      Edit Email
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      {emailChangedValid && Object.keys(errors || {}).length === 0 && (
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
            <IdCard className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
              ID Preview
            </Text>
            <Text className="text-xs md:text-sm text-gray-500">
              View the patron's uploaded ID document.
            </Text>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-[#EAF4FE] px-4 py-3">
          <Info className="size-3 md:size-4 shrink-0 text-[#128CF1]" />
          <Text className="text-xs md:text-sm text-[#0B2545]">
            The patron's ID is displayed for verification purposes.
          </Text>
        </div>

        <div className="flex justify-center items-center p-4 border rounded-lg bg-gray-50 min-h-[200px]">
          {idPreviewUrl ? (
            <img
              src={idPreviewUrl}
              alt="Patron ID"
              className="max-h-70 rounded-md border shadow w-full max-w-[120px] sm:max-w-[180px] md:max-w-xs lg:max-w-sm object-contain"
            />
          ) : (
            <Text className="text-gray-500 text-sm">No ID uploaded</Text>
          )}
        </div>
      </div>
    </div>
  );
});

export default ViewPatronPersonalInfo;
