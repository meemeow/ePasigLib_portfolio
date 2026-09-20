import { useMemo } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import Modal from "@/components/ui/ValidationModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import RecordsScreen from "@/features/lms/circulations/components/RecordsScreen";
import PersonCell from "@/features/lms/circulations/components/PersonCell";
import RemarksModal from "@/features/lms/circulations/components/RemarksModal";
import ConfirmTransactionModal from "@/features/lms/circulations/components/ConfirmTransactionModal";
import BooksList from "@/features/lms/circulations/components/BooksList";
import {
  formatMillisTime,
  formatTimeLeft,
} from "@/features/lms/circulations/api/circulation-records-helpers";
import { useReservationApproval } from "@/features/lms/circulations/pages/reservation-approval/api/reservation-approval-logic";
import { useNow } from "@/hooks/use-now";
import type { RecordColumn } from "@/components/ui/RecordsTable";
import type { ReservationApprovalRow } from "@/features/lms/circulations/types/circulation-records-types";

function hasLapsed(row: ReservationApprovalRow, now: number): boolean {
  return typeof row.ExpiresAt === "number" && row.ExpiresAt <= now;
}

const LAPSED_HINT =
  "This request expired — the library did not answer in time. The copy returns to the shelf automatically within the hour.";

export default function ReservationApproval() {
  const page = useReservationApproval();
  const {
    processingIds,
    approve,
    confirmApprove,
    approveTarget,
    setApproveTarget,
    rejectTarget,
    setRejectTarget,
    reject,
    modal,
    setModal,
  } = page;

  const now = useNow(30_000);

  const columns = useMemo<RecordColumn<ReservationApprovalRow>[]>(
    () => [
      {
        key: "patron",
        header: "Patron",
        headClassName: "w-[180px]",
        cell: (row) => (
          <PersonCell
            name={row.PatronName}
            uid={row.PatronPublicUID || row.PatronUID}
          />
        ),
      },
      {
        key: "book",
        header: "Book",
        headClassName: "min-w-[260px]",
        cell: (row) => <BooksList books={row.Books} />,
      },
      {
        key: "purpose",
        header: "Purpose",
        headClassName: "min-w-[200px]",
        cell: (row) => (
          <p
            className="line-clamp-3 whitespace-normal text-gray-700"
            title={row.Purpose || undefined}
          >
            {row.Purpose || "—"}
          </p>
        ),
      },
      {
        key: "requestedOn",
        header: "Requested",
        headClassName: "w-[165px]",
        cell: (row) => {
          const lapsed = hasLapsed(row, now);
          return (
            <div>
              <div>{formatMillisTime(row.RequestedOn)}</div>
              {lapsed ? (
                <>
                  <Badge
                    variant="outline"
                    className="mt-1 border-transparent bg-red-100 font-[gothamMedium] text-red-700"
                  >
                    <AlertTriangle className="size-3" />
                    Expired
                  </Badge>
                  <div
                    className="mt-0.5 text-[11px] text-gray-500"
                    title="Nobody answered within the deadline, so this can no longer be approved or rejected. The copy is still off the shelf, and an automatic sweep returns it within the hour."
                  >
                    Clears within the hour
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">
                  {formatTimeLeft(row.ExpiresAt, now)}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        headClassName: "w-[140px] text-center",
        cellClassName: "align-middle",
        cell: (row) => {
          const busy = processingIds.has(row.id);
          const lapsed = hasLapsed(row, now);
          const stop = busy || lapsed;
          return (
            <div
              className="flex w-[124px] flex-col items-stretch gap-2"
              title={lapsed ? LAPSED_HINT : undefined}
            >
              <Button
                size="sm"
                variant="outline"
                disabled={stop}
                onClick={() => approve(row)}
                className="w-full border-green-700/70 text-xs text-green-700 hover:border-green-600 hover:bg-green-200/10 hover:text-green-700"
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={stop}
                onClick={() => setRejectTarget(row)}
                className="w-full border-red-600/50 text-xs text-red-600 hover:border-red-600 hover:bg-red-200/10 hover:text-red-600"
              >
                <X className="size-3.5" />
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [processingIds, approve, setRejectTarget, now],
  );

  return (
    <RecordsScreen list={page} columns={columns}>
      <ConfirmTransactionModal
        open={!!approveTarget}
        title="Approve this reservation?"
        description="The copy is set aside for this patron and they are notified it is waiting."
        icon={<Check className="size-5" />}
        confirmLabel="Approve"
        busyLabel="Approving..."
        busy={!!approveTarget && processingIds.has(approveTarget.id)}
        onConfirm={confirmApprove}
        onCancel={() => setApproveTarget(null)}
      >
        <span className="font-[gothamMedium] text-[#003067]">
          {approveTarget?.Books[0]?.CollectionTitle || "This title"}
        </span>
        {approveTarget?.Books[0]?.Accession
          ? ` (${approveTarget.Books[0].Accession})`
          : ""}{" "}
        goes on the hold shelf for{" "}
        <span className="font-[gothamMedium] text-[#003067]">
          {approveTarget?.PatronName || "this patron"}
        </span>
        .
        {approveTarget?.Purpose && (
          <span className="mt-2 block border-l-2 border-gray-200 pl-3 break-words whitespace-pre-wrap text-gray-500 italic">
            {approveTarget.Purpose}
          </span>
        )}
      </ConfirmTransactionModal>

      <RemarksModal
        open={!!rejectTarget}
        description="Rejecting turns down this reservation, notifies the patron, and returns the copy to the shelf."
        entityName={
          rejectTarget
            ? `${rejectTarget.PatronName} — ${
                rejectTarget.Books[0]?.CollectionTitle || "Untitled"
              }`
            : undefined
        }
        isProcessing={!!rejectTarget && processingIds.has(rejectTarget.id)}
        onCancel={() => setRejectTarget(null)}
        onConfirm={(remarks) => {
          if (rejectTarget) reject(rejectTarget, remarks);
        }}
      />

      {modal?.message && (
        <Modal
          message={modal.message}
          type={modal.type}
          onClose={() => setModal(null)}
        />
      )}
    </RecordsScreen>
  );
}
