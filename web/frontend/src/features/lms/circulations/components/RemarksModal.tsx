import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Textarea } from "@/components/ui/Textarea";
import { Text } from "@/components/ui/Text";

interface RemarksModalProps {
  open: boolean;
  title?: string;
  description?: string;
  entityName?: string;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: (remarks: string) => void;
}

export default function RemarksModal({
  open,
  title = "Reason for rejection",
  description = "The patron is shown this note, so say what they should do next.",
  entityName,
  isProcessing = false,
  onCancel,
  onConfirm,
}: RemarksModalProps) {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) setRemarks("");
  }, [open]);

  const canConfirm = remarks.trim().length > 0 && !isProcessing;

  return (
    <ModalShell
      open={open}
      title={title}
      description={description}
      tone="danger"
      size="sm"
      icon={<AlertTriangle className="size-5" />}
      onClose={isProcessing ? undefined : onCancel}
      actions={
        <>
          <Button
            variant="cancel"
            onClick={onCancel}
            disabled={isProcessing}
            className="w-auto md:w-[100px]"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(remarks.trim())}
            disabled={!canConfirm}
            className={`w-auto md:w-[110px] ${
              canConfirm
                ? "bg-red-500 text-white hover:bg-red-600"
                : "cursor-not-allowed bg-gray-300 text-white"
            }`}
          >
            {isProcessing ? "Rejecting..." : "Reject"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {entityName && (
          <div className="rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-2">
            <Text className="text-sm font-[gothamMedium] text-[#003067]">
              {entityName}
            </Text>
          </div>
        )}

        <Textarea
          label="Remarks"
          labelClassName="text-[#003067] font-[gothamMedium]"
          required
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. This title is on hold for another patron."
          className="min-h-[110px]"
          disabled={isProcessing}
        />

        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
          <Text className="text-xs text-red-800">
            Rejecting removes the request and notifies the patron. They can
            submit a new one afterwards.
          </Text>
        </div>
      </div>
    </ModalShell>
  );
}
