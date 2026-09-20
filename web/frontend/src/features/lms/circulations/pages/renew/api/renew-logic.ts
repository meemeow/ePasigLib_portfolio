import { useCallback, useState } from "react";
import { usePatronLookup } from "@/features/lms/circulations/api/circulation-lookup-api";
import { useBorrowedCopies } from "@/features/lms/circulations/api/use-borrowed-copies";
import { approveRenewal } from "@/features/lms/circulations/api/circulation-mutations";
import { renewalSchema } from "@/features/lms/circulations/schema/circulations-schema";
import type { ModalState } from "@/features/lms/circulations/types/circulation-transaction-types";

export const RENEW_DAYS = 7;

export function useRenew() {
  const patron = usePatronLookup();
  const selectedId = patron.selected?.id || patron.selected?.UID || "";
  const copies = useBorrowedCopies(selectedId);

  const [isProcessing, setIsProcessing] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [confirming, setConfirming] = useState(false);

  const renew = useCallback(async () => {
    const loan = copies.selected;
    if (!selectedId || !loan || loan.IneligibleReason || isProcessing) return;
    setIsProcessing(true);
    try {
      const payload = renewalSchema.parse({
        patronIdOrUID: selectedId,
        borrowKey: loan.BorrowID,
        days: RENEW_DAYS,
      });
      await approveRenewal(payload);
      setModal({
        type: "success",
        message: `“${loan.CollectionTitle}” renewed for ${payload.days} days.`,
      });
      copies.reload();
    } catch (error) {
      setModal({
        type: "error",
        message: error instanceof Error ? error.message : "Renewal failed.",
      });
    } finally {
      setConfirming(false);
      setIsProcessing(false);
    }
  }, [selectedId, copies, isProcessing]);

  const refreshAll = useCallback(() => {
    void patron.revalidate();
    copies.reload();
  }, [patron, copies]);

  return {
    patron,
    copies,
    isProcessing,
    canSubmit: Boolean(
      copies.selected && !copies.selected.IneligibleReason && !isProcessing,
    ),
    renew,
    confirming,
    setConfirming,
    refreshAll,
    isRefreshing: patron.refreshing || copies.loading,
    modal,
    setModal,
  } as const;
}
