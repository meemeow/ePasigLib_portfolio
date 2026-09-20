import { CheckCheck, Info, Megaphone, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";

interface MarkAllReadModalProps {
  open: boolean;
  kind: "announcements" | "news";
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export function MarkAllReadModal({
  open,
  kind,
  count,
  onCancel,
  onConfirm,
  isProcessing = false,
}: MarkAllReadModalProps) {
  const isNews = kind === "news";

  const noun = isNews
    ? count === 1
      ? "story"
      : "stories"
    : count === 1
      ? "announcement"
      : "announcements";

  const label = isNews ? "news" : "announcements";

  return (
    <ModalShell
      open={open}
      onClose={isProcessing ? undefined : onCancel}
      title={isNews ? "Mark all news as read" : "Mark all announcements as read"}
      description={`The Updates badge will stop counting ${label}.`}
      tone="default"
      icon={
        isNews ? (
          <Newspaper className="size-5" />
        ) : (
          <Megaphone className="size-5" />
        )
      }
      actions={
        <>
          <Button
            onClick={onCancel}
            variant="cancel"
            className="w-auto md:w-[100px]"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`w-auto font-[gothamMedium] text-white transition md:min-w-[150px] ${
              isProcessing
                ? "cursor-not-allowed bg-gray-300"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isProcessing ? "Marking..." : "Mark all as read"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Text className="text-sm leading-relaxed text-gray-700">
          {count > 0 ? (
            <>
              Mark{" "}
              <span className="font-[gothamMedium] text-[#003067]">
                {count} unread {noun}
              </span>{" "}
              as read?
            </>
          ) : (
            <>
              There are no unread {label} left to mark. Confirming will make
              sure the count on{" "}
              <span className="font-[gothamMedium] text-[#003067]">Updates</span>{" "}
              agrees.
            </>
          )}
        </Text>

        <div className="flex items-start gap-2 rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-[#128CF1]" />
          <Text className="text-xs leading-relaxed text-[#003067]">
            Nothing is deleted — every {isNews ? "story" : "announcement"} stays
            on this page to read whenever you like. This only clears{" "}
            {isNews ? "news" : "announcements"} from the Updates count, and
            leaves {isNews ? "announcements" : "news"} exactly as they are.
          </Text>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
          <CheckCheck className="mt-0.5 size-4 shrink-0 text-gray-500" />
          <Text className="text-xs leading-relaxed text-gray-600">
            This applies to everything in the list, including the{" "}
            {isNews ? "stories" : "notices"} further down that you have not
            scrolled to yet. It cannot be undone.
          </Text>
        </div>
      </div>
    </ModalShell>
  );
}

export default MarkAllReadModal;
