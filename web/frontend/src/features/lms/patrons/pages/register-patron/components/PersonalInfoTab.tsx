import React from "react";
import { User } from "lucide-react";
import { Input } from "@/components/ui/Input";
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
import { SCHOOL_WORK } from "@/lib/constants/hardcoded-constants";
import type {
  PatronRegisterForm,
  PatronRegisterFieldErrors,
} from "@/features/lms/patrons/pages/register-patron/types/patron-register-types";

interface PersonalInfoTabProps {
  form: PatronRegisterForm;
  setField: <K extends keyof PatronRegisterForm>(
    name: K,
    value: PatronRegisterForm[K],
  ) => void;
  fieldErrors: PatronRegisterFieldErrors;
  cities: string[];
  barangays: string[];
  loading: boolean;
  fourYearsAgo: string;
}

const labelClassName = "text-[#003067] text-xs sm:text-sm font-[gothamMedium]";

export const PersonalInfoTab = React.memo(function PersonalInfoTab({
  form,
  setField,
  fieldErrors,
  cities,
  barangays,
  loading,
  fourYearsAgo,
}: PersonalInfoTabProps) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-start gap-3 mb-6 md:mb-8">
        <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
          <User className="size-4 md:size-5" />
        </div>
        <div>
          <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
            Personal Information
          </Text>
          <Text className="text-xs md:text-sm text-gray-500">
            Provide the patron&apos;s personal details.
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

        <Select
          value={form.SchoolWork}
          onValueChange={(value) => setField("SchoolWork", value)}
          label="Education/Work Status"
          required
          error={fieldErrors.SchoolWork}
          triggerId="SchoolWork"
          labelClassName={labelClassName}
        >
          <SelectTrigger
            id="SchoolWork"
            className="w-full"
            error={fieldErrors.SchoolWork}
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {SCHOOL_WORK.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
      </div>
    </div>
  );
});

export default PersonalInfoTab;
