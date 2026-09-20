import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDashboardSummaryApi } from "@/features/lms/circulations/api/circulation-records-api";
import { onCirculationDataChanged } from "@/features/lms/circulations/circulations-cache";

const POLL_MS = 60_000;

export function useCirculationBadges() {
  const [reservations, setReservations] = useState(0);
  const mountedRef = useRef(true);
  const seqRef = useRef(0);

  const load = useCallback(async (force = false) => {
    const seq = ++seqRef.current;
    const summary = await fetchDashboardSummaryApi(force);
    if (seq !== seqRef.current || !mountedRef.current || !summary) return;
    setReservations(summary.pendingApprovals.reservations.requests);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();

    const unsubscribe = onCirculationDataChanged(load);

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };

    const timer = setInterval(refreshIfVisible, POLL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);

    return () => {
      mountedRef.current = false;
      unsubscribe();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [load]);

  return { reservations, refresh: load } as const;
}
