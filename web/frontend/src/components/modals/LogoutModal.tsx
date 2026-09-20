import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";

interface LogoutModalProps {
  open: boolean;
  accountName: string;
  accountLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export function LogoutModal({
  open,
  accountName,
  accountLabel,
  onCancel,
  onConfirm,
  isProcessing = false,
}: LogoutModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={isProcessing ? undefined : onCancel}
      title="Log Out"
      description="This action ends your session on this device."
      tone="danger"
      icon={<LogOut className="size-5" />}
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
            className={`w-auto font-[gothamMedium] text-white transition md:min-w-[110px] ${
              isProcessing
                ? "cursor-not-allowed bg-gray-300"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {isProcessing ? "Logging out..." : "Log Out"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Text className="text-sm text-gray-700">
          Are you sure you want to{" "}
          <span className="font-[gothamMedium] text-[#003067]">log out</span>?
        </Text>

        <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-2">
          <Text className="text-xs font-[gothamMedium] text-gray-500">
            {accountLabel}
          </Text>
          <Text className="text-sm font-[gothamMedium] text-[#003067]">
            {accountName}
          </Text>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-700" />
          <Text className="text-xs text-red-700">
            You will be signed out and returned to the log-in page. Anything you
            have typed but not yet saved will be lost. Signing back in restores
            everything else.
          </Text>
        </div>
      </div>
    </ModalShell>
  );
}

export default LogoutModal;
