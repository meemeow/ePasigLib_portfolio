import { useCallback, useRef, useState } from "react";
import { usePatronLookup } from "@/features/lms/circulations/api/circulation-lookup-api";
import { useBorrowedCopies } from "@/features/lms/circulations/api/use-borrowed-copies";
import { useNfcScanner } from "@/features/lms/circulations/api/use-nfc-scanner";
import { circulationCheckin } from "@/features/lms/circulations/api/circulation-mutations";
import { checkinSchema } from "@/features/lms/circulations/schema/circulations-schema";
import type { ModalState } from "@/features/lms/circulations/types/circulation-transaction-types";

export function useCheckIn() {
  const patron = usePatronLookup();
  const selectedPatronId = patron.selected?.id || patron.selected?.UID || "";
  const copies = useBorrowedCopies(selectedPatronId);

  const [isProcessing, setIsProcessing] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const inFlightRef = useRef(false);

  const nfc = useNfcScanner({
    onScan: (uid) => patron.setQuery(uid),
  });

  const [confirming, setConfirming] = useState(false);

  const canSubmit = Boolean(
    patron.selected && copies.selected && !isProcessing,
  );

  const submit = useCallback(async () => {
    if (inFlightRef.current || !canSubmit) return;
    if (!patron.selected || !copies.selected) return;

    const loan = copies.selected;
    inFlightRef.current = true;
    setIsProcessing(true);
    try {
      const payload = checkinSchema.parse({
        patronIdOrUID: patron.selected.id || patron.selected.UID || "",
        collectionId: loan.BookID,
        accession: loan.Accession,
      });
      await circulationCheckin(payload);
      setModal({
        type: "success",
        message: `“${loan.CollectionTitle || "Copy"}” checked in.`,
      });
      patron.clear();
    } catch (error) {
      setModal({
        type: "error",
        message: error instanceof Error ? error.message : "Check in failed.",
      });
    } finally {
      setConfirming(false);
      setIsProcessing(false);
      inFlightRef.current = false;
    }
  }, [canSubmit, patron, copies]);

  const refreshAll = useCallback(() => {
    void patron.revalidate();
    copies.reload();
  }, [patron, copies]);

  return {
    patron,
    copies,
    nfc,
    isProcessing,
    canSubmit,
    submit,
    confirming,
    setConfirming,
    refreshAll,
    isRefreshing: patron.refreshing || copies.loading,
    modal,
    setModal,
  } as const;
}
