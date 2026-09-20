import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Text } from "@/components/ui/Text";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { CredentialsForm } from "@/features/auth/register/schema/register-schema";

interface RegisterCredentialsProps {
  register: UseFormRegister<CredentialsForm>;
  errors: FieldErrors<CredentialsForm>;
  serverErrors: {
    Email?: string;
    captcha?: string;
    form?: string;
  };
  isProcessing: boolean;
}

const labelClassName = "text-[#002248] text-sm sm:text-base font-medium";

export default function RegisterCredentials({
  register,
  errors,
  serverErrors,
  isProcessing,
}: RegisterCredentialsProps) {
  const getError = (field: keyof CredentialsForm): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    if (field === "Email" && serverErrors.Email) return serverErrors.Email;
    return undefined;
  };

  const PasswordLabel = () => (
    <div className="flex items-center gap-1.5">
      <label htmlFor="Password" className={labelClassName}>
        Password
        <span className="ml-1 text-red-500">*</span>
      </label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="What to enter for Password"
            className="text-gray-400 transition hover:text-[#128CF1]"
          >
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[250px] border-[#011b38] bg-[#011b38] text-white"
        >
          At least 8 characters, with an uppercase letter, a lowercase letter
          and a number.
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-6 rounded-xl border border-blue-200 bg-blue-50  py-4 px-4">
        <Text font="medium" className="text-[#002248] text-xl">
          Create Your Account
        </Text>
        <Text className="text-gray-500 text-sm">
          Enter your email and password to complete registration
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-3/4 max-w-2xl mx-auto">
        <div className="md:col-span-2">
          <Input
            type="email"
            id="Email"
            label="Email Address"
            required
            error={getError("Email")}
            placeholder="Enter your email address"
            labelClassName={labelClassName}
            {...register("Email")}
            disabled={isProcessing}
          />
        </div>

        <PasswordInput
          id="Password"
          label={<PasswordLabel />}
          required
          error={getError("Password")}
          placeholder="Create a strong password"
          showToggle={true}
          labelClassName={labelClassName}
          {...register("Password")}
          disabled={isProcessing}
        />

        <PasswordInput
          id="ConfirmPassword"
          label="Confirm Password"
          required
          error={getError("ConfirmPassword")}
          placeholder="Confirm your password"
          showToggle={true}
          labelClassName={labelClassName}
          {...register("ConfirmPassword")}
          disabled={isProcessing}
        />
      </div>

      {serverErrors.captcha && (
        <Text className="text-red-600 text-xs text-center">
          {serverErrors.captcha}
        </Text>
      )}

      {serverErrors.form && (
        <Text className="text-red-600 text-xs text-center">
          {serverErrors.form}
        </Text>
      )}
    </div>
  );
}
