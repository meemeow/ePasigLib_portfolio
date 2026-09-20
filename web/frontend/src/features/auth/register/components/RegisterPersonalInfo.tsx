import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Text } from "@/components/ui/Text";
import { SCHOOL_WORK } from "@/lib/constants/hardcoded-constants";
import type {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
  Control,
} from "react-hook-form";
import type { PersonalInfoForm } from "@/features/auth/register/schema/register-schema";
import RegisterImageUpload from "./RegisterImageUpload";

interface RegisterPersonalInfoProps {
  register: UseFormRegister<PersonalInfoForm>;
  setValue: UseFormSetValue<PersonalInfoForm>;
  watch: UseFormWatch<PersonalInfoForm>;
  errors: FieldErrors<PersonalInfoForm>;
  control?: Control<PersonalInfoForm>;
  isProcessing: boolean;
  cities: string[];
  barangays: string[];
  fourYearsAgo: string;
  formatPhoneNumber: (value: string) => string;
  capitalizeWords: (str: string) => string;
  idFile: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File | null) => void;
  onPreviewChange: (url: string | null) => void;
}

const labelClassName = "text-[#002248] text-sm sm:text-base font-medium";

export default function RegisterPersonalInfo({
  register,
  setValue,
  watch,
  errors,
  control,
  isProcessing,
  cities,
  barangays,
  fourYearsAgo,
  formatPhoneNumber,
  capitalizeWords,
  idFile,
  previewUrl,
  onFileSelect,
  onPreviewChange,
}: RegisterPersonalInfoProps) {
  const watchedCity = watch("City");
  const watchedBirthDate = watch("BirthDate");

  const handleBirthDateChange = (dateStr: string) => {
    setValue("BirthDate", dateStr, { shouldValidate: false });
  };

  const getError = (field: keyof PersonalInfoForm): string | undefined => {
    return errors[field]?.message;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6 rounded-xl border border-blue-200 bg-blue-50 py-4 px-4">
        <Text className="text-[#002248] font-bold text-lg sm:text-xl">
          Personal Information
        </Text>
        <Text className="text-gray-500 text-xs sm:text-sm">
          Please fill in your personal details
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="text"
          id="FirstName"
          label="First Name"
          required
          error={getError("FirstName")}
          placeholder="First Name"
          labelClassName={labelClassName}
          {...register("FirstName", {
            onChange: (e) => {
              const capitalized = capitalizeWords(e.target.value.toLowerCase());
              setValue("FirstName", capitalized, { shouldValidate: false });
            },
          })}
          disabled={isProcessing}
        />

        <Input
          type="text"
          id="MiddleName"
          label="Middle Name"
          error={getError("MiddleName")}
          placeholder="Middle Name"
          labelClassName={labelClassName}
          {...register("MiddleName", {
            onChange: (e) => {
              const capitalized = capitalizeWords(e.target.value.toLowerCase());
              setValue("MiddleName", capitalized, { shouldValidate: false });
            },
          })}
          disabled={isProcessing}
        />

        <Input
          type="text"
          id="LastName"
          label="Last Name"
          required
          error={getError("LastName")}
          placeholder="Last Name"
          labelClassName={labelClassName}
          {...register("LastName", {
            onChange: (e) => {
              const capitalized = capitalizeWords(e.target.value.toLowerCase());
              setValue("LastName", capitalized, { shouldValidate: false });
            },
          })}
          disabled={isProcessing}
        />

        <Input
          type="text"
          id="Suffix"
          label="Suffix"
          error={getError("Suffix")}
          placeholder="e.g., Jr., Sr., III"
          labelClassName={labelClassName}
          {...register("Suffix")}
          disabled={isProcessing}
        />

        <DatePicker
          id="BirthDate"
          name="BirthDate"
          label="Birth Date"
          required
          error={getError("BirthDate")}
          placeholder="Select birth date"
          max={fourYearsAgo}
          min="1900-01-01"
          value={watchedBirthDate}
          onChange={handleBirthDateChange}
          disabled={isProcessing}
          labelClassName={labelClassName}
        />

        <Controller
          name="Sex"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val)}
              disabled={isProcessing}
              label="Sex"
              required
              error={fieldState.error?.message}
              triggerId="Sex"
              labelClassName={labelClassName}
            >
              <SelectTrigger
                id="Sex"
                className="w-full bg-white text-black border-gray-300"
                error={fieldState.error?.message}
              >
                <SelectValue placeholder="Select sex" />
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
          )}
        />

        <SearchableSelect
          options={cities}
          value={watch("City") ?? ""}
          onChange={(val) => setValue("City", val, { shouldValidate: false })}
          placeholder="Select city"
          label="City"
          required
          disabled={isProcessing}
          error={getError("City")}
          labelClassName={labelClassName}
        />

        <SearchableSelect
          options={barangays}
          value={watch("Barangay") ?? ""}
          onChange={(val) =>
            setValue("Barangay", val, { shouldValidate: false })
          }
          placeholder="Select barangay"
          label="Barangay"
          required
          disabled={!watchedCity || isProcessing}
          error={getError("Barangay")}
          labelClassName={labelClassName}
        />

        <PhoneInput
          id="PhoneNumber"
          name="PhoneNumber"
          label="Phone Number"
          required
          error={getError("PhoneNumber")}
          placeholder="XXX-XXX-XXXX"
          maxLength={12}
          countryCode="+63"
          value={watch("PhoneNumber") ?? ""}
          onChange={(e) => {
            const formatted = formatPhoneNumber(e.target.value);
            setValue("PhoneNumber", formatted, { shouldValidate: false });
          }}
          disabled={isProcessing}
          labelClassName={labelClassName}
        />

        <Controller
          name="SchoolWork"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val)}
              disabled={isProcessing}
              label="Education / Work Status"
              required
              error={fieldState.error?.message}
              triggerId="SchoolWork"
              labelClassName={labelClassName}
            >
              <SelectTrigger
                id="SchoolWork"
                className="w-full bg-white text-black border-gray-300"
                error={fieldState.error?.message}
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
          )}
        />
      </div>

      <RegisterImageUpload
        idFile={idFile}
        previewUrl={previewUrl}
        onFileSelect={onFileSelect}
        onPreviewChange={onPreviewChange}
        error={getError("ID")}
        isProcessing={isProcessing}
        required
      />
    </div>
  );
}
