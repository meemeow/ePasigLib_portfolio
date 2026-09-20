import { Bell, BellOff, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";

interface NewsSubscriptionModalProps {
  open: boolean;
  muting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export function NewsSubscriptionModal({
  open,
  muting,
  onCancel,
  onConfirm,
  isProcessing = false,
}: NewsSubscriptionModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={isProcessing ? undefined : onCancel}
      title={muting ? "Unsubscribe from news" : "Notify me about news"}
      description={
        muting
          ? "The Updates badge will stop counting news stories."
          : "The Updates badge will count news stories again."
      }
      tone={muting ? "warning" : "default"}
      icon={
        muting ? <BellOff className="size-5" /> : <Bell className="size-5" />
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
            className={`w-auto font-[gothamMedium] text-white transition md:min-w-[130px] ${
              isProcessing
                ? "cursor-not-allowed bg-gray-300"
                : muting
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isProcessing
              ? "Saving..."
              : muting
                ? "Unsubscribe"
                : "Notify me"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Text className="text-sm leading-relaxed text-gray-700">
          {muting ? (
            <>
              Turn off the count on{" "}
              <span className="font-[gothamMedium] text-[#003067]">Updates</span>{" "}
              for news stories?
            </>
          ) : (
            <>
              Count news stories on{" "}
              <span className="font-[gothamMedium] text-[#003067]">Updates</span>{" "}
              again?
            </>
          )}
        </Text>

        <div className="flex items-start gap-2 rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-[#128CF1]" />
          <Text className="text-xs leading-relaxed text-[#003067]">
            Announcements and their replies keep counting either way, and news
            stories are still published here for you to read. This only changes
            the number on the Updates link.
          </Text>
        </div>

        {muting ? (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5">
            <BellOff className="mt-0.5 size-4 shrink-0 text-yellow-700" />
            <Text className="text-xs leading-relaxed text-yellow-700">
              You will not be nudged when a new story is posted. You can turn
              this back on from the same button whenever you like.
            </Text>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

export default NewsSubscriptionModal;
