import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./Button";
import { Text } from "./Text";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, "type"> {
  showToggle?: boolean;
}

export function PasswordInput({
  className,
  showToggle = true,
  disabled,
  label,
  error,
  id,
  required,
  labelClassName,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1">
      {label && (
        typeof label === "string" ? (
          <label htmlFor={id} className={cn("block text-sm sm:text-base", labelClassName || "text-white")}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        ) : (
          label
        )
      )}

      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          id={id}
          className={cn("pr-10", error && "border-red-500", className)}
          disabled={disabled}
          {...props}
        />
        {showToggle && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 h-7 w-7 p-0"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </Button>
        )}
      </div>

      {error && <Text className="text-red-600 text-xs">{error}</Text>}
    </div>
  );
}
