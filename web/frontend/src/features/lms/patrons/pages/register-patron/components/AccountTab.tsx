import { Lock, Info, IdCard } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Text } from "@/components/ui/Text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import IDUploadArea from "@/features/lms/patrons/pages/register-patron/components/IDUploadArea";
import type {
  PatronRegisterForm,
  PatronRegisterFieldErrors,
} from "@/features/lms/patrons/pages/register-patron/types/patron-register-types";

interface AccountTabProps {
  form: PatronRegisterForm;
  setField: <K extends keyof PatronRegisterForm>(
    name: K,
    value: PatronRegisterForm[K],
  ) => void;
  fieldErrors: PatronRegisterFieldErrors;
  loading: boolean;
  idFile: File | null;
  setIdFile: (f: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
}

const labelClassName = "text-[#003067] text-xs sm:text-sm font-[gothamMedium]";

function PasswordLabel() {
  return (
    <div className="flex items-center gap-1.5">
      <Text className={labelClassName}>
        Password
        <span className="text-red-600 ml-1">*</span>
      </Text>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-[#128CF1] cursor-help hover:opacity-80 transition" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-gray-800 text-white text-xs p-2 rounded">
            Password must be at least 8 characters and include uppercase and lowercase letters plus a special character.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default function AccountTab({
  form,
  setField,
  fieldErrors,
  loading,
  idFile,
  setIdFile,
  previewUrl,
  setPreviewUrl,
}: AccountTabProps) {
  return (
    <div className="flex min-h-full flex-col justify-center py-4 md:py-14">
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-start gap-3 mb-6 md:mb-8">
            <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
              <Lock className="size-4 md:size-5" />
            </div>
            <div>
              <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                Account &amp; Security
              </Text>
              <Text className="text-xs md:text-sm text-gray-500">
                Set up the login credentials for this patron.
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-5">
            <Input
              id="Email"
              name="Email"
              type="email"
              label="Email Address"
              placeholder="example@domain.com"
              value={form.Email}
              onChange={(e) => setField("Email", e.target.value)}
              disabled={loading}
              required
              error={fieldErrors.Email}
              labelClassName={labelClassName}
            />

            <PasswordInput
              id="Password"
              name="Password"
              label={<PasswordLabel />}
              placeholder="********"
              value={form.Password}
              onChange={(e) => setField("Password", e.target.value)}
              disabled={loading}
              error={fieldErrors.Password}
              labelClassName={labelClassName}
            />

            <PasswordInput
              id="ConfirmPassword"
              name="ConfirmPassword"
              label="Confirm Password"
              placeholder="********"
              value={form.ConfirmPassword}
              onChange={(e) => setField("ConfirmPassword", e.target.value)}
              disabled={loading}
              required
              error={fieldErrors.ConfirmPassword}
              labelClassName={labelClassName}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
              <IdCard className="size-4 md:size-5" />
            </div>
            <div>
              <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                Identification
              </Text>
              <Text className="text-xs md:text-sm text-gray-500">
                Upload a valid School ID or Government-issued ID.
              </Text>
            </div>
          </div>

          <IDUploadArea
            idFile={idFile}
            setIdFile={setIdFile}
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
            fieldError={fieldErrors.ID}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}