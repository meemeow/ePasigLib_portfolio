import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Text } from "./Text";

interface ModalProps {
  message: string;
  onClose: () => void;
  type: "success" | "error";
}

/** How long the toast sits on screen before it dismisses itself. */
const VISIBLE_MS = 10000;

/** Long enough for the leave transition to finish before the node is dropped. */
const LEAVE_MS = 300;

const TONE = {
  success: {
    title: "Success",
    icon: CheckCircle2,
    accent: "border-l-green-500",
    iconColor: "text-green-600",
  },
  error: {
    title: "Error",
    icon: XCircle,
    accent: "border-l-red-500",
    iconColor: "text-red-600",
  },
} as const;

function ValidationModal({ message, onClose, type }: ModalProps) {
  const [visible, setVisible] = useState(false);
  const { title, icon: Icon, accent, iconColor } = TONE[type];

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, LEAVE_MS);
  }, [onClose]);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex justify-center px-4">
      <div
        role={type === "error" ? "alert" : "status"}
        aria-live={type === "error" ? "assertive" : "polite"}
        className={cn(
          "pointer-events-auto mt-5 flex w-auto items-center gap-6",
          // sized to the message, capped so it never runs past the viewport
          "max-w-[min(42rem,100%)] sm:min-w-[20rem]",
          "rounded-xl border border-gray-100 border-l-4 bg-white px-5 py-4 shadow-lg",
          accent,
          "transition-all duration-300 ease-in-out",
          visible ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0",
        )}
      >
        <Icon className={cn("size-7 shrink-0", iconColor)} />

        <div className="min-w-0 flex-1">
          <Text className="font-[gothamMedium] text-base text-[#003067] sm:text-lg">
            {title}
          </Text>
          {/* Kept to one line; the full text stays in the DOM for screen
              readers and shows on hover when it is too long to fit. */}
          <Text
            title={message}
            className="truncate text-sm text-gray-600 sm:text-base"
          >
            {message}
          </Text>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="-mr-1 shrink-0 self-center rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}

export default ValidationModal;
