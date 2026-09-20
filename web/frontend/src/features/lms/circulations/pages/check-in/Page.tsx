import { BookDown, Loader2 } from "lucide-react";
import ConfirmTransactionModal from "@/features/lms/circulations/components/ConfirmTransactionModal";
import { formatFullName } from "@/lib/format/name";
import { formatMillis } from "@/features/lms/circulations/api/circulation-records-helpers";
import Modal from "@/components/ui/ValidationModal";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import PatronPanel from "@/features/lms/circulations/components/PatronPanel";
import BorrowedCopiesPanel from "@/features/lms/circulations/components/BorrowedCopiesPanel";
import TransactionHeader from "@/features/lms/circulations/components/TransactionHeader";
import { useCheckIn } from "@/features/lms/circulations/pages/check-in/api/check-in-logic";

export default function CheckIn() {
  const {
    patron,
    copies,
    nfc,
    isProcessing,
    canSubmit,
    submit,
    confirming,
    setConfirming,
    refreshAll,
    isRefreshing,
    modal,
    setModal,
  } = useCheckIn();

  const selected = copies.selected;

  const footerNote = !patron.selected
    ? "Select a patron to see what they have out."
    : copies.books.length === 0 && !copies.loading && !copies.error
      ? "This patron has no copies out."
      : !selected
        ? "Select the copy being returned."
        : selected.IsOverdue
          ? "This copy is overdue. Checking it in will step the patron's standing."
          : "Ready to check in.";

  return (
    <div className="w-full">
      <TransactionHeader
        title="Check In"
        description="Scan the patron's card, then pick the copy they are returning."
        onRefresh={refreshAll}
        refreshing={isRefreshing}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PatronPanel lookup={patron} nfc={nfc} disabled={isProcessing} />
        <BorrowedCopiesPanel
          patron={patron.selected}
          copies={copies}
          disabled={isProcessing}
        />
      </div>

      {nfc.error && (
        <Text className="mt-3 text-sm text-red-600">{nfc.error}</Text>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <Text
          className={`text-sm ${
            selected?.IsOverdue ? "text-amber-700" : "text-gray-600"
          }`}
        >
          {footerNote}
        </Text>
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
            <BookDown className="size-4" />
          )}
          {isProcessing ? "Checking in..." : "Check In"}
        </Button>
      </div>

      <ConfirmTransactionModal
        open={confirming}
        title="Record this return?"
        description="The copy goes back on the shelf and the loan is closed."
        icon={<BookDown className="size-5" />}
        highlight={
          selected
            ? { label: "Was due", value: formatMillis(selected.DueDate) }
            : null
        }
        warning={
          selected?.IsOverdue
            ? "This copy is overdue. Checking it in steps the patron’s standing down one level, which cannot be undone from this screen."
            : null
        }
        danger={selected?.IsOverdue}
        confirmLabel="Check In"
        busyLabel="Checking in..."
        busy={isProcessing}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      >
        <span className="font-[gothamMedium] text-[#003067]">
          {selected?.CollectionTitle || "This title"}
        </span>
        {selected?.Accession ? ` (${selected.Accession})` : ""} comes back from{" "}
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
