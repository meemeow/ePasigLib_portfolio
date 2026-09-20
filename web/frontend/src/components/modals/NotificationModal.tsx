import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";

export interface NotificationDetail {
  id: string;
  title: string;
  content: string;
  read: boolean;
  date: string;
}

interface NotificationModalProps {
  open: boolean;
  notification: NotificationDetail | null;
  onClose: () => void;
  onMarkRead?: () => void;
  isProcessing?: boolean;
}

export function NotificationModal({
  open,
  notification,
  onClose,
  onMarkRead,
  isProcessing = false,
}: NotificationModalProps) {
  if (!notification) return null;

  return (
    <ModalShell
      open={open}
      onClose={isProcessing ? undefined : onClose}
      title={notification.title || "Notification"}
      description={notification.date || "From the library"}
      tone="default"
      icon={<Bell className="size-5" />}
      actions={
        <>
          <Button
            onClick={onClose}
            variant="cancel"
            className="w-auto md:w-[100px]"
            disabled={isProcessing}
          >
            Close
          </Button>
          {onMarkRead ? (
            <Button
              onClick={onMarkRead}
              disabled={isProcessing}
              className={`w-auto font-[gothamMedium] text-white transition md:min-w-[140px] ${
                isProcessing
                  ? "cursor-not-allowed bg-gray-300"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isProcessing ? "Marking…" : "Mark as read"}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <Text className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
          {notification.content}
        </Text>

        {notification.read ? (
          <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-gray-500" />
            <Text className="text-xs leading-relaxed text-gray-600">
              You have already read this one. It stays here so you can come
              back to it.
            </Text>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

export default NotificationModal;
