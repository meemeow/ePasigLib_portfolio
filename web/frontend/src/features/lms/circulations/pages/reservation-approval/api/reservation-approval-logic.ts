import { useCallback, useState } from "react";
import { reservationAction } from "@/features/lms/circulations/api/circulation-mutations";
import { useCirculationRecords } from "@/features/lms/circulations/api/circulation-records-logic";
import { formatMillis } from "@/features/lms/circulations/api/circulation-records-helpers";
import type { ModalState } from "@/features/lms/circulations/types/circulation-transaction-types";
import type { ReservationApprovalRow } from "@/features/lms/circulations/types/circulation-records-types";

function approvedMessage(
  from: number | null | undefined,
  until: number | null | undefined,
): string {
  if (typeof from !== "number" || typeof until !== "number") {
    return "Reservation approved.";
  }
  return `Reservation approved — collectable ${formatMillis(from)} to ${formatMillis(until)}.`;
}

export function useReservationApproval() {
  const list = useCirculationRecords("reservationApproval");

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] =
    useState<ReservationApprovalRow | null>(null);
  const [approveTarget, setApproveTarget] =
    useState<ReservationApprovalRow | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const { suppressRow, refresh } = list;

  const markBusy = useCallback((id: string, busy: boolean) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const act = useCallback(
    async (
      row: ReservationApprovalRow,
      action: "approve" | "reject",
      remarks = "",
    ) => {
      markBusy(row.id, true);
      try {
        const result = await reservationAction(row.id, action, remarks);
        suppressRow(row.id);
        if (action === "reject") setRejectTarget(null);
        else setApproveTarget(null);
        setModal({
          type: "success",
          message:
            action === "approve"
              ? approvedMessage(result.pickupFrom, result.shelfExpiresOn)
              : "Reservation rejected.",
        });
      } catch (error) {
        setModal({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : `Failed to ${action} reservation.`,
        });
      } finally {
        markBusy(row.id, false);
        setApproveTarget(null);
        await refresh();
      }
    },
    [markBusy, suppressRow, refresh],
  );

  const approve = useCallback(
    (row: ReservationApprovalRow) => setApproveTarget(row),
    [],
  );
  const confirmApprove = useCallback(() => {
    if (approveTarget) void act(approveTarget, "approve");
  }, [approveTarget, act]);

  const reject = useCallback(
    (row: ReservationApprovalRow, remarks: string) =>
      act(row, "reject", remarks),
    [act],
  );

  return {
    ...list,
    processingIds,
    approve,
    confirmApprove,
    approveTarget,
    setApproveTarget,
    reject,
    rejectTarget,
    setRejectTarget,
    modal,
    setModal,
  } as const;
}
