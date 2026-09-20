import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { fetchDashboardSummaryApi } from "@/features/lms/home/api/home-api";
import {
  greetingEmojiFor,
  greetingFor,
} from "@/features/lms/home/api/home-helpers";
import type { DashboardSummary } from "@/features/lms/home/types/home-types";

export function useHomePage() {
  const { profile, staffRoles } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  const mountedRef = useRef(true);
  const summarySeqRef = useRef(0);

  const loadSummary = useCallback(async (isRefresh = false) => {
    const seq = ++summarySeqRef.current;
    setSummaryLoading(true);
    const data = await fetchDashboardSummaryApi(isRefresh);
    if (seq !== summarySeqRef.current || !mountedRef.current) return;
    if (data) {
      setSummary(data);
      setSummaryError(false);
    } else {
      setSummaryError(true);
    }
    setSummaryLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadSummary();
    return () => {
      mountedRef.current = false;
    };
  }, [loadSummary]);

  const refresh = useCallback(async () => {
    await loadSummary(true);
  }, [loadSummary]);

  const now = new Date();
  const greeting = greetingFor(now);
  const greetingEmoji = greetingEmojiFor(now);
  const firstName =
    (profile as { firstName?: string } | null)?.firstName || "there";

  return {
    greeting,
    greetingEmoji,
    firstName,
    staffRoles,

    summary,
    summaryLoading,
    summaryError,

    refresh,
    retrySummary: () => loadSummary(true),
  } as const;
}
