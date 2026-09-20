import { Lock, Info } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Text } from "@/components/ui/Text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import type {
  StaffRegisterForm,
  StaffRegisterFieldErrors,
} from "@/features/lms/staffs/pages/register-staff/types/staff-register-types";

interface AccountSecurityTabProps {
  form: StaffRegisterForm;
  setField: <K extends keyof StaffRegisterForm>(
    name: K,
    value: StaffRegisterForm[K]
  ) => void;
  fieldErrors: StaffRegisterFieldErrors;
  loading: boolean;
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
            Password must be at least 8 characters and include uppercase and lowercase letters plus a number.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default function AccountSecurityTab({
  form,
  setField,
  fieldErrors,
  loading,
}: AccountSecurityTabProps) {
  return (
    <div className="flex min-h-full flex-col justify-center py-4 md:py-14">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-start gap-3 mb-6 md:mb-8">
          <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
            <Lock className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
              Account &amp; Security
            </Text>
            <Text className="text-xs md:text-sm text-gray-500">
              Set up the login credentials for this librarian.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
          </div>

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
    </div>
  );
}
