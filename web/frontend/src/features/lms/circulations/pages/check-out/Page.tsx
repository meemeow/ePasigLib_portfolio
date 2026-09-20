import { AlertTriangle, BookUp, Info, Loader2 } from "lucide-react";
import Modal from "@/components/ui/ValidationModal";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import PatronPanel from "@/features/lms/circulations/components/PatronPanel";
import CopyPanel from "@/features/lms/circulations/components/CopyPanel";
import TransactionHeader from "@/features/lms/circulations/components/TransactionHeader";
import SlotCounter from "@/features/lms/circulations/components/SlotCounter";
import ConfirmTransactionModal from "@/features/lms/circulations/components/ConfirmTransactionModal";
import { formatFullName } from "@/lib/format/name";
import { formatMillis } from "@/features/lms/circulations/api/circulation-records-helpers";
import { useCheckOut } from "@/features/lms/circulations/pages/check-out/api/check-out-logic";

function Notice({
  tone,
  children,
}: {
  tone: "info" | "warning" | "danger";
  children: string;
}) {
  const classes =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "warning"
        ? "border-yellow-200 bg-yellow-50 text-yellow-800"
        : "border-[#128CF1]/20 bg-[#EAF4FE] text-[#003067]";
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${classes}`}
    >
      {tone === "info" ? (
        <Info className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      )}
      <Text className="text-xs">{children}</Text>
    </div>
  );
}

function footerNoteFor(
  hasPatron: boolean,
  hasCopy: boolean,
  atCap: boolean,
  canSubmit: boolean,
): string {
  if (atCap) {
    return "This patron is at their borrowing limit. A copy has to come back, or a reservation be cancelled, before another can go out.";
  }
  if (canSubmit) return "Ready to check out.";
  if (!hasPatron) return "Select an eligible patron and an available copy.";
  if (!hasCopy) return "Select an available copy.";
  return "This copy cannot go out to this patron.";
}

export default function CheckOut() {
  const {
    patron,
    copy,
    nfc,
    patronNotice,
    copyNotice,
    slots,
    isProcessing,
    canSubmit,
    submit,
    confirming,
    setConfirming,
    refreshAll,
    isRefreshing,
    modal,
    setModal,
  } = useCheckOut();

  const collectingHold = String(copy.copy?.Availability || "") === "Reserved";

  const atCap = Boolean(
    slots && slots.max > 0 && slots.total >= slots.max && !collectingHold,
  );

  const footerNote = footerNoteFor(
    Boolean(patron.selected),
    Boolean(copy.copy),
    atCap,
    canSubmit,
  );

  return (
    <div className="w-full">
      <TransactionHeader
        title="Check Out"
        description="Scan the patron's card and the copy's barcode to record a loan."
        onRefresh={refreshAll}
        refreshing={isRefreshing}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PatronPanel
          lookup={patron}
          nfc={nfc}
          disabled={isProcessing}
          notice={
            patronNotice ? <Notice tone="danger">{patronNotice}</Notice> : null
          }
        />
        <CopyPanel
          lookup={copy}
          disabled={isProcessing}
          notice={
            copyNotice ? (
              <Notice
                tone={
                  String(copy.copy?.Availability || "") === "Reserved"
                    ? "warning"
                    : "danger"
                }
              >
                {copyNotice}
              </Notice>
            ) : null
          }
        />
      </div>

      {nfc.error && (
        <Text className="mt-3 text-sm text-red-600">{nfc.error}</Text>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <Text className="text-sm text-gray-600">{footerNote}</Text>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {patron.selected && slots && slots.max > 0 && (
            <SlotCounter slots={slots} />
          )}
          <Button
            onClick={() => setConfirming(true)}
            disabled={!canSubmit}
            className={`w-full sm:w-[180px] ${
              canSubmit
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-300 text-white"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BookUp className="size-4" />
            )}
            {isProcessing ? "Checking out..." : "Check Out"}
          </Button>
        </div>
      </div>

      <ConfirmTransactionModal
        open={confirming}
        title="Check out this copy?"
        description={
          slots?.loanPeriodDays
            ? `The loan runs ${slots.loanPeriodDays} days.`
            : "The copy leaves the shelf and the loan is opened."
        }
        icon={<BookUp className="size-5" />}
        highlight={
          slots?.dueDatePreview
            ? { label: "Due back", value: formatMillis(slots.dueDatePreview) }
            : null
        }
        warning={
          collectingHold
            ? "This copy is on the hold shelf. The checkout will be refused unless the reservation belongs to this patron."
            : null
        }
        confirmLabel="Check Out"
        busyLabel="Checking out..."
        busy={isProcessing}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      >
        <span className="font-[gothamMedium] text-[#003067]">
          {copy.book?.CollectionTitle || "This title"}
        </span>
        {copy.copy?.Accession ? ` (${copy.copy.Accession})` : ""} goes out to{" "}
        <span className="font-[gothamMedium] text-[#003067]">
          {patron.selected ? formatFullName(patron.selected) : "this patron"}
        </span>
        .
      </ConfirmTransactionModal>

      {modal?.message && (
        <Modal
          message={modal.message}
          type={modal.type}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
