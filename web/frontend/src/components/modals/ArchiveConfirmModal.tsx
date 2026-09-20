import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";

interface ArchiveConfirmModalProps {
  open: boolean;
  entityLabel: string;
  entityName: string;
  archiveAction: "archive" | "unarchive" | "delete";
  confirmChecked: boolean;
  setConfirmChecked: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
  archiveWarning?: string;
  unarchiveWarning?: string;
  deleteWarning?: string;
  confirmDelaySeconds?: number;
}

export function ArchiveConfirmModal({
  open,
  entityLabel,
  entityName,
  archiveAction,
  confirmChecked,
  setConfirmChecked,
  onCancel,
  onConfirm,
  isProcessing = false,
  archiveWarning,
  unarchiveWarning,
  deleteWarning,
  confirmDelaySeconds = 0,
}: ArchiveConfirmModalProps) {
  const isDelete = archiveAction === "delete";
  const isArchive = archiveAction === "archive" || isDelete;
  const verb = isDelete ? "Delete" : isArchive ? "Archive" : "Unarchive";
  const lowerLabel = entityLabel.toLowerCase();

  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!open || confirmDelaySeconds <= 0 || !confirmChecked) {
      setSecondsLeft(0);
      return;
    }
    setSecondsLeft(confirmDelaySeconds);
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, confirmChecked, confirmDelaySeconds]);

  const waiting = secondsLeft > 0;

  const warning = isDelete
    ? deleteWarning ||
      `Deleting this ${lowerLabel} is permanent. It cannot be restored.`
    : isArchive
      ? archiveWarning ||
        `Archiving this ${lowerLabel} removes it from everyday use. This action can be reversed by unarchiving.`
      : unarchiveWarning ||
        `Unarchiving restores this ${lowerLabel} to active use.`;

  return (
    <ModalShell
      open={open}
      title={`${verb} ${entityLabel}`}
      description={
        isDelete
          ? `This action permanently deletes the ${lowerLabel}.`
          : isArchive
            ? `This action will archive the ${lowerLabel}.`
            : `This action will restore the ${lowerLabel}.`
      }
      tone={isArchive ? "danger" : "warning"}
      icon={
        isArchive ? (
          <AlertTriangle className="size-5" />
        ) : (
          <ShieldCheck className="size-5" />
        )
      }
      footerLeft={
        <label className="inline-flex cursor-pointer items-center gap-2.5">
          <Checkbox
            checked={confirmChecked}
            onCheckedChange={(checked) => setConfirmChecked(Boolean(checked))}
            disabled={isProcessing}
          />
          <Text className="text-sm font-[gothamMedium] text-gray-700">
            Yes — {verb} this {lowerLabel}
          </Text>
        </label>
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
            disabled={!confirmChecked || isProcessing || waiting}
            className={`w-auto font-[gothamMedium] text-white transition md:min-w-[110px] ${
              !confirmChecked || isProcessing || waiting
                ? "cursor-not-allowed bg-gray-300"
                : isArchive
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            {isProcessing
              ? `${verb.replace(/e$/, "")}ing...`
              : waiting
                ? `${verb} in ${secondsLeft}s`
                : verb}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Text className="text-sm text-gray-700">
          Are you sure you want to{" "}
          <span className="font-[gothamMedium] text-[#003067]">
            {verb.toLowerCase()}
          </span>{" "}
          this {lowerLabel}?
        </Text>

        <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-2">
          <Text className="text-xs font-[gothamMedium] text-gray-500">
            {entityLabel}
          </Text>
          <Text className="text-sm font-[gothamMedium] text-[#003067]">
            {entityName}
          </Text>
        </div>

        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-2.5 ${
            isArchive
              ? "border-red-200 bg-red-50"
              : "border-yellow-200 bg-yellow-50"
          }`}
        >
          <AlertTriangle
            className={`mt-0.5 size-4 shrink-0 ${
              isArchive ? "text-red-700" : "text-yellow-700"
            }`}
          />
          <Text
            className={`text-xs ${isArchive ? "text-red-700" : "text-yellow-700"}`}
          >
            {warning}
          </Text>
        </div>
      </div>
    </ModalShell>
  );
}

export default ArchiveConfirmModal;
