import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";

interface FieldLabelProps {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  hint?: ReactNode;
}

const LABEL_CLASS =
  "block text-xs font-[gothamMedium] text-[#003067] sm:text-sm";

export default function FieldLabel({
  htmlFor,
  children,
  required = false,
  hint,
}: FieldLabelProps) {
  return (
    <div className="flex items-end justify-between gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={LABEL_CLASS}>
          {children}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      ) : (
        <span className={LABEL_CLASS}>
          {children}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
      )}
      {hint}
    </div>
  );
}

export function CharCount({ value, limit }: { value: string; limit: number }) {
  return (
    <span
      className={`text-xs tabular-nums ${
        value.length > limit ? "text-red-600" : "text-gray-400"
      }`}
    >
      {value.length}/{limit}
    </span>
  );
}

export function RequiredLegend() {
  return (
    <Text className="text-xs text-gray-500">
      <span className="text-red-500">*</span> Required field
    </Text>
  );
}
