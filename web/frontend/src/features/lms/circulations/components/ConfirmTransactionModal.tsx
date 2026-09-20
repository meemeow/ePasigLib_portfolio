import type { ReactNode } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import ModalShell from "@/components/ui/ModalShell";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

interface ConfirmTransactionModalProps {
  open: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  highlight?: { label: string; value: string } | null;
  warning?: string | null;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmTransactionModal({
  open,
  title,
  description,
  icon,
  children,
  highlight,
  warning,
  confirmLabel,
  busyLabel,
  busy,
  danger,
  onConfirm,
  onCancel,
}: ConfirmTransactionModalProps) {
  return (
    <ModalShell
      open={open}
      title={title}
      description={description}
      tone={danger ? "warning" : "default"}
      size="sm"
      icon={icon}
      onClose={busy ? undefined : onCancel}
      actions={
        <>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            className={
              danger
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <Text className="text-sm text-gray-600">{children}</Text>

      {highlight && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-3">
          <CalendarClock className="size-4 shrink-0 text-[#128CF1]" />
          <Text className="text-sm text-[#003067]">
            {highlight.label}{" "}
            <span className="font-[gothamMedium]">{highlight.value}</span>
          </Text>
        </div>
      )}

      {warning && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <Text className="text-sm text-amber-800">{warning}</Text>
        </div>
      )}
    </ModalShell>
  );
}
