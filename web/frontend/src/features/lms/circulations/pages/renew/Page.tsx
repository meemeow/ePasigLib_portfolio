import { Loader2, RotateCw } from "lucide-react";
import Modal from "@/components/ui/ValidationModal";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import PatronPanel from "@/features/lms/circulations/components/PatronPanel";
import ConfirmTransactionModal from "@/features/lms/circulations/components/ConfirmTransactionModal";
import { formatFullName } from "@/lib/format/name";
import { formatMillis } from "@/features/lms/circulations/api/circulation-records-helpers";
import BorrowedCopiesPanel from "@/features/lms/circulations/components/BorrowedCopiesPanel";
import TransactionHeader from "@/features/lms/circulations/components/TransactionHeader";
import {
  RENEW_DAYS,
  useRenew,
} from "@/features/lms/circulations/pages/renew/api/renew-logic";

export default function Renew() {
  const {
    patron,
    copies,
    isProcessing,
    canSubmit,
    renew,
    confirming,
    setConfirming,
    refreshAll,
    isRefreshing,
    modal,
    setModal,
  } = useRenew();

  const selected = copies.selected;
  const renewable = copies.books.filter((row) => !row.IneligibleReason);

  const footerNote = !patron.selected
    ? "Select a patron to see what they have out."
    : copies.books.length === 0 && !copies.loading && !copies.error
      ? "This patron has no copies out."
      : renewable.length === 0 && !copies.loading && !copies.error
        ?
          "None of this patron's copies can be renewed. Each row says why."
        : !selected
          ? "Select a borrowed copy to continue."
          : `Ready to renew for ${RENEW_DAYS} days.`;

  return (
    <div className="w-full">
      <TransactionHeader
        title="Renew"
        description="Extend a loan for a patron at the desk. The same rules apply as when they renew it themselves — one renewal per loan, and not once it is overdue."
        onRefresh={refreshAll}
        refreshing={isRefreshing}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PatronPanel lookup={patron} disabled={isProcessing} />
        <BorrowedCopiesPanel
          patron={patron.selected}
          copies={copies}
          disabled={isProcessing}
          blockIneligible
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <Text className="text-sm text-gray-600">{footerNote}</Text>

        <div className="flex items-center gap-2">
          <Select value={String(RENEW_DAYS)} disabled>
            <SelectTrigger
              className="h-9 w-[104px] text-sm"
              title="Renewals run the full period"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(RENEW_DAYS)}>
                {RENEW_DAYS} days
              </SelectItem>
            </SelectContent>
          </Select>

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
              <RotateCw className="size-4" />
            )}
            {isProcessing ? "Renewing..." : "Renew"}
          </Button>
        </div>
      </div>

      <ConfirmTransactionModal
        open={confirming}
        title={`Renew for ${RENEW_DAYS} days?`}
        description="The due date moves and the loan’s renewal is spent."
        icon={<RotateCw className="size-5" />}
        highlight={
          selected?.RenewsTo != null
            ? { label: "New due date", value: formatMillis(selected.RenewsTo) }
            : null
        }
        confirmLabel="Renew"
        busyLabel="Renewing..."
        busy={isProcessing}
        onConfirm={renew}
        onCancel={() => setConfirming(false)}
      >
        <span className="font-[gothamMedium] text-[#003067]">
          {selected?.CollectionTitle || "This title"}
        </span>
        {selected?.Accession ? ` (${selected.Accession})` : ""}, on loan to{" "}
        <span className="font-[gothamMedium] text-[#003067]">
          {patron.selected ? formatFullName(patron.selected) : "this patron"}
        </span>
        , is due back {selected ? formatMillis(selected.DueDate) : ""}.
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
