import { Loader2, SquareCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";

interface EndChatModalProps {
  open: boolean;
  patronName: string;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function EndChatModal({
  open,
  patronName,
  isProcessing,
  onCancel,
  onConfirm,
}: EndChatModalProps) {
  return (
    <ModalShell
      open={open}
      size="sm"
      tone="danger"
      title="End this conversation?"
      description={
        patronName
          ? `${patronName} will be told it has finished.`
          : "The patron will be told it has finished."
      }
      icon={<SquareCheck className="size-5" />}
      onClose={isProcessing ? undefined : onCancel}
      actions={
        <>
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Keep it open
          </Button>
          <Button
            variant={null}
            onClick={onConfirm}
            disabled={isProcessing}
            className="gap-2 border border-red-600 bg-red-600 font-[gothamMedium] text-white transition hover:bg-red-700 hover:no-underline disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ending...
              </>
            ) : (
              "End conversation"
            )}
          </Button>
        </>
      }
    >
      <Text className="text-sm leading-relaxed text-gray-600">
        The transcript is kept and stays readable under the Closed filter, but
        neither side can send another message. If they write in again it starts
        a new conversation.
      </Text>
    </ModalShell>
  );
}
