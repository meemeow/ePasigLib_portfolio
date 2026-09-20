import { forwardRef } from "react";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | React.ReactNode;
  error?: string;
  countryCode?: string;
  required?: boolean;
  labelClassName?: string;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, countryCode = "+63", className, disabled, required, value, onChange, labelClassName, ...props }, ref) => {
    const formatPhoneNumber = (input: string): string => {
      const digits = input.replace(/\D/g, "");
      
      const limited = digits.slice(0, 10);
      
      if (limited.length <= 3) {
        return limited;
      } else if (limited.length <= 6) {
        return `${limited.slice(0, 3)}-${limited.slice(3)}`;
      } else {
        return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6, 10)}`;
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);

      e.target.value = formatted;

      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="space-y-1">
        {label && (
          typeof label === "string" ? (
            <label htmlFor={props.id} className={cn("block text-sm sm:text-base", labelClassName || "text-white")}>
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          ) : (
            label
          )
        )}
        <div
          className={cn(
            "flex border border-gray-300 rounded-md bg-white overflow-hidden", "focus-within:ring-[3px] focus-within:ring-ring/50",
            error && "border-red-500",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="w-16 flex items-center justify-center text-sm text-gray-700 bg-white border-r border-gray-300 h-9">
            {countryCode}
          </span>
          <input
            type="tel"
            ref={ref}
            value={value}
            onChange={handleChange}
            className={cn(
              "flex-1 px-3 py-2 text-sm text-gray-800 bg-white outline-none h-9",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className
            )}
            disabled={disabled}
            placeholder="XXX-XXX-XXXX"
            maxLength={12}
            {...props}
          />
        </div>
        {error && <Text className="text-red-600 text-xs">{error}</Text>}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };