import * as React from "react";
import { cn } from "@/lib/utils";
import { Text } from "./Text";

interface InputProps extends React.ComponentProps<"input"> {
  label?: string | React.ReactNode;
  error?: string;
  required?: boolean;
  labelClassName?: string;
}

function Input({ className, type, label, error, id, required, labelClassName, ...props }: InputProps) {
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
      <input
        type={type}
        id={id}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-white px-3 py-1 text-base text-black shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "text-sm sm:text-base font-[gothamLight]", error && "border-red-500", 
          className
        )}
        {...props}
      />
      {error && <Text className="text-red-600 text-xs">{error}</Text>}
    </div>
  );
}

export { Input };