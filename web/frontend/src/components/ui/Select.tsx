import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDown } from "lucide-react";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";

interface SelectWithLabelProps extends React.ComponentProps<typeof SelectPrimitive.Root> {
  label?: string | React.ReactNode;
  error?: string;
  readOnly?: boolean;
  triggerId?: string;
  required?: boolean;
  labelClassName?: string;
}

export const Select = React.memo(function Select({
  label,
  error,
  children,
  readOnly,
  triggerId,
  required,
  labelClassName,
  ...props
}: SelectWithLabelProps) {
  const selectElement = (
    <SelectPrimitive.Root
      data-slot="select"
      data-readonly={readOnly ? true : undefined}
      {...(readOnly ? { open: false, onOpenChange: () => {} } : {})}
      {...props}
    >
      {children}
    </SelectPrimitive.Root>
  );

  if (!label) return selectElement;

  return (
    <div className="space-y-1">
      {typeof label === "string" ? (
        <label htmlFor={triggerId} className={cn("block text-sm sm:text-base", labelClassName || "text-white")}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      ) : (
        label
      )}
      {selectElement}
      {error && <Text className="text-red-600 text-xs">{error}</Text>}
    </div>
  );
});

export function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

export function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" className="text-black" {...props} />;
}

export const SelectTrigger = React.memo(function SelectTrigger({
  className = "bg-white font-[gothamLight]",
  size = "default",
  children,
  error,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
  error?: string;
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input bg-white font-[gothamLight] w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8",
        "data-[placeholder]:text-muted-foreground",
        "data-[state=open]:ring-[3px] data-[state=open]:ring-ring/50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "dark:bg-input/30 dark:hover:bg-input/50",
        "cursor-pointer",
        "group",
        (error || props["aria-invalid"]) && "border-red-500",
        className
      )}
      {...props}
    >
      <span className="flex-1 text-left truncate">{children}</span>
      <ChevronDown
        className={cn(
          "size-4 opacity-50 transition-transform duration-200 shrink-0",
          "group-data-[state=open]:rotate-180"
        )}
      />
    </SelectPrimitive.Trigger>
  );
});

export function SelectContent({ className, children, position = "popper", style, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover font-[gothamLight] text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 fixed z-[99999] max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        style={{ zIndex: 99999, ...style }}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)} {...props} />;
}

export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)} {...props} />;
}