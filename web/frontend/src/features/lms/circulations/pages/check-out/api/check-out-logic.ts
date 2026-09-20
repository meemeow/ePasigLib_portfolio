import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useCopyLookup,
  usePatronLookup,
} from "@/features/lms/circulations/api/circulation-lookup-api";
import { useNfcScanner } from "@/features/lms/circulations/api/use-nfc-scanner";
import { fetchPatronSlotUsageApi } from "@/features/lms/circulations/api/circulation-records-api";
import { circulationCheckout } from "@/features/lms/circulations/api/circulation-mutations";
import { checkoutSchema } from "@/features/lms/circulations/schema/circulations-schema";
import type {
  ModalState,
  Patron,
  PatronSlotUsage,
} from "@/features/lms/circulations/types/circulation-transaction-types";

const ELIGIBLE_STATES = ["Verified", "Watchlisted", "Warning"];

export function describeSlots(slots: PatronSlotUsage): string {
  const parts = [
    slots.loans ? `${slots.loans} on loan` : null,
    slots.holds ? `${slots.holds} waiting to collect` : null,
    slots.pending ? `${slots.pending} awaiting approval` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "nothing out";
}

export function evaluateCheckoutEligibility(
  patron: Patron | null,
  slots?: PatronSlotUsage,
  collectingHold = false,
): string | null {
  if (!patron) return null;
  const state = String(patron.State || "");
  if (!ELIGIBLE_STATES.includes(state)) {
    return `This patron's account is "${state || "Unknown"}" and cannot borrow.`;
  }
  if (String(patron.City || "") !== "City of Pasig") {
    return "Only patrons residing in the City of Pasig may borrow.";
  }
  if (!collectingHold && slots && slots.max > 0 && slots.total >= slots.max) {
    return (
      `This patron is at the ${slots.max}-item limit — ${describeSlots(slots)}. ` +
      `A reservation counts against the limit from the moment it is made, ` +
      `whether or not it has been approved.`
    );
  }
  return null;
}

export function useCheckOut() {
  const patron = usePatronLookup();
  const copy = useCopyLookup();
  const [isProcessing, setIsProcessing] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [slots, setSlots] = useState<PatronSlotUsage | undefined>();
  const [slotsNonce, setSlotsNonce] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const inFlightRef = useRef(false);

  const nfc = useNfcScanner({ onScan: (uid) => patron.setQuery(uid) });

  const selectedPatronId = patron.selected?.id || patron.selected?.UID || "";
  useEffect(() => {
    if (!selectedPatronId) {
      setSlots(undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await fetchPatronSlotUsageApi(selectedPatronId);
      if (!cancelled) setSlots(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPatronId, slotsNonce]);

  const collectingHold = String(copy.copy?.Availability || "") === "Reserved";

  const patronNotice = useMemo(
    () => evaluateCheckoutEligibility(patron.selected, slots, collectingHold),
    [patron.selected, slots, collectingHold],
  );

  const copyNotice = useMemo(() => {
    if (!copy.copy) return null;
    if (copy.copy.ForLibraryUse) {
      return "This copy is for library use only and cannot leave the building.";
    }
    const availability = String(copy.copy.Availability || "");
    if (availability === "Borrowed") return "This copy is already checked out.";
    if (availability === "Pending") {
      return "This copy is on a reservation awaiting approval. Approve the request first, then check it out.";
    }
    if (availability === "Reserved") {
      return "This copy is held on a reservation. Check out will only succeed for the patron who reserved it.";
    }
    return null;
  }, [copy.copy]);

  const canSubmit = Boolean(
    patron.selected &&
    copy.book &&
    copy.copy &&
    !patronNotice &&
    !["Borrowed", "Pending"].includes(String(copy.copy.Availability || "")) &&
    !copy.copy.ForLibraryUse &&
    !isProcessing,
  );

  const submit = useCallback(async () => {
    if (inFlightRef.current || !canSubmit) return;
    if (!patron.selected || !copy.book || !copy.copy) return;

    inFlightRef.current = true;
    setIsProcessing(true);
    try {
      const payload = checkoutSchema.parse({
        patronIdOrUID: patron.selected.id || patron.selected.UID || "",
        collectionId: copy.book.id,
        accession: copy.copy.Accession,
      });
      await circulationCheckout(payload);
      setModal({
        type: "success",
        message: `“${copy.book.CollectionTitle || "Copy"}” checked out to ${
          patron.selected.FirstName || "the patron"
        }.`,
      });
      patron.clear();
      copy.clear();
    } catch (error) {
      setModal({
        type: "error",
        message: error instanceof Error ? error.message : "Checkout failed.",
      });
    } finally {
      setConfirming(false);
      setIsProcessing(false);
      inFlightRef.current = false;
    }
  }, [canSubmit, patron, copy]);

  const refreshAll = useCallback(() => {
    void patron.revalidate();
    void copy.revalidate();
    setSlotsNonce((n) => n + 1);
  }, [patron, copy]);

  return {
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
    isRefreshing: patron.refreshing || copy.refreshing,
    modal,
    setModal,
  } as const;
}
