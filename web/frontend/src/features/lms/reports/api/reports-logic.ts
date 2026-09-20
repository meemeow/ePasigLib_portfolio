import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  fetchReportSummaryApi,
  fetchReportYearsApi,
  invalidateReportCaches,
} from "@/features/lms/reports/api/reports-api";
import {
  defaultPeriod,
  type ReportPeriodChoice,
  type ReportSummary,
} from "@/features/lms/reports/types/report-types";

export interface ReportsState {
  summary: ReportSummary | null;
  loading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  period: ReportPeriodChoice;
  setPeriod: (period: ReportPeriodChoice) => void;
  years: number[];
  refresh: () => Promise<void>;
}

export const ReportsContext = createContext<ReportsState | null>(null);

export function useReports(): ReportsState {
  const state = useContext(ReportsContext);
  if (!state) {
    throw new Error("A report screen was rendered outside ReportsLayout.");
  }
  return state;
}

export function useReportsState(): ReportsState {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<ReportPeriodChoice>(defaultPeriod);
  const [years, setYears] = useState<number[]>([]);

  const mountedRef = useRef(true);
  const seqRef = useRef(0);

  const load = useCallback(
    async (choice: ReportPeriodChoice, isRefresh: boolean): Promise<void> => {
      const seq = ++seqRef.current;
      setErrorMessage(null);
      if (summary === null) setLoading(true);
      else setRefreshing(true);

      const data = await fetchReportSummaryApi(choice, isRefresh);

      if (seq !== seqRef.current || !mountedRef.current) return;

      if (data) setSummary(data);
      else setErrorMessage("Could not build the report. Try Refresh.");

      setLoading(false);
      setRefreshing(false);
    },
    [summary],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void fetchReportYearsApi().then((list) => {
      if (mountedRef.current) setYears(list);
    });
  }, []);

  useEffect(() => {
    void load(period, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.scope, period.year, period.month, period.day]);

  const refresh = useCallback(async (): Promise<void> => {
    invalidateReportCaches();
    await load(period, true);
  }, [load, period]);

  return {
    summary,
    loading,
    refreshing,
    errorMessage,
    period,
    setPeriod,
    years,
    refresh,
  };
}
