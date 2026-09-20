import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Text } from "./Text";

type ModalTone = "default" | "danger" | "warning";

const TONE_ICON_CLASSES: Record<ModalTone, string> = {
  default: "bg-[#EAF4FE] text-[#128CF1]",
  danger: "bg-red-50 text-red-600",
  warning: "bg-yellow-50 text-yellow-600",
};

const SIZE_CLASSES = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
} as const;

interface ModalShellProps {
  open: boolean;
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: ModalTone;
  size?: keyof typeof SIZE_CLASSES;
  footerLeft?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  bodyClassName?: string;
  panelClassName?: string;
  children: ReactNode;
}

export function ModalShell({
  open,
  title,
  description,
  icon,
  tone = "default",
  size = "md",
  footerLeft,
  actions,
  onClose,
  bodyClassName,
  panelClassName,
  children,
}: ModalShellProps) {
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open || !onClose) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl",
          SIZE_CLASSES[size],
          panelClassName,
        )}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-gray-200 px-6 py-5 sm:px-8">
          {icon && (
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full sm:size-11",
                TONE_ICON_CLASSES[tone],
              )}
            >
              {icon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <Text
              as="h2"
              id={headingId}
              className="font-[gothamMedium] text-base text-[#003067] sm:text-lg"
            >
              {title}
            </Text>
            {description && (
              <Text
                id={descriptionId}
                className="text-xs text-gray-500 sm:text-sm"
              >
                {description}
              </Text>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 shrink-0 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div
          className={cn(
            "flex-1 overflow-y-auto px-6 py-5 sm:px-8",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {(footerLeft || actions) && (
          <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="min-w-0">{footerLeft}</div>
            {actions && (
              <div className="flex flex-wrap justify-end gap-3">{actions}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModalShell;
