import * as React from "react";
import { cn } from "@/lib/utils";
import { Text } from "./Text";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  label?: string | React.ReactNode;
  error?: string;
  required?: boolean;
  labelClassName?: string;
}

function Textarea({
  className,
  label,
  error,
  id,
  required,
  labelClassName,
  ...props
}: TextareaProps) {
  return (
    <div className="space-y-1">
      {label &&
        (typeof label === "string" ? (
          <label
            htmlFor={id}
            className={cn(
              "block text-sm sm:text-base",
              labelClassName || "text-white",
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        ) : (
          label
        ))}
      <textarea
        id={id}
        data-slot="textarea"
        className={cn(
          "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex min-h-16 w-full min-w-0 resize-y rounded-md border bg-white px-3 py-2 text-base text-black shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "text-sm sm:text-base font-[gothamLight]",
          error && "border-red-500",
          className,
        )}
        {...props}
      />
      {error && <Text className="text-red-600 text-xs">{error}</Text>}
    </div>
  );
}

export { Textarea };
