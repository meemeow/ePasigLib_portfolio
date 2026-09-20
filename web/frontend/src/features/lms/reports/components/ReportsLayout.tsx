import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import ReportsSidebar from "@/features/lms/reports/components/ReportsSidebar";
import PeriodPicker from "@/features/lms/reports/components/PeriodPicker";
import GenerateReportModal from "@/features/lms/reports/components/GenerateReportModal";
import {
  ReportsContext,
  useReportsState,
} from "@/features/lms/reports/api/reports-logic";
import { formatGeneratedAt } from "@/features/lms/reports/types/report-types";
import { REPORT_SECTIONS } from "@/features/lms/reports/api/report-sections";

export default function ReportsLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const state = useReportsState();

  const { pathname } = useLocation();
  const slug = pathname.split("/")[3] || "overview";
  const section =
    REPORT_SECTIONS.find((entry) => entry.slug === slug) ?? REPORT_SECTIONS[0];

  const {
    summary,
    loading,
    refreshing,
    errorMessage,
    period,
    setPeriod,
    years,
  } = state;

  const sideBySide = collapsed
    ? "min-[1360px]:flex-row min-[1360px]:items-end min-[1360px]:justify-between"
    : "min-[1584px]:flex-row min-[1584px]:items-end min-[1584px]:justify-between";

  return (
    <ReportsContext.Provider value={state}>
      <div className="flex min-h-[calc(100vh-160px)] flex-col font-[gothamLight] lg:flex-row">
        <ReportsSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((current) => !current)}
        />

        <main className="min-w-0 flex-1 px-6 pb-6 pt-4 sm:px-8 sm:pb-10 md:py-6 lg:p-10">
          <div className="min-w-0 pb-4">
            <div className="flex min-w-0 items-center gap-2">
              <Text className="truncate text-2xl font-[gothamBlack] uppercase text-[#011b38] sm:text-3xl">
                {section.label}
              </Text>
              <RefreshButton
                onClick={state.refresh}
                refreshing={loading || refreshing}
                className="mt-0.5"
                label="Refresh the report"
              />
            </div>

            {refreshing ? (
              <Skeleton className="mt-1 h-4 w-56 rounded" />
            ) : (
              <Text className="text-sm font-[gothamMedium] text-[#003067]">
                {summary
                  ? `Generated ${formatGeneratedAt(summary.generatedAt)}`
                  : "Building the report…"}
              </Text>
            )}
          </div>

          <div className={`flex flex-col gap-3 pb-3 ${sideBySide}`}>
            <div className="min-w-0">
              {refreshing ? (
                <Skeleton className="h-7 w-44 rounded-lg sm:h-8" />
              ) : (
                <Text
                  as="h1"
                  className="font-[gothamBlack] text-xl uppercase leading-tight text-[#011b38] sm:text-2xl"
                >
                  {summary?.period.label ?? ""}
                </Text>
              )}
              {summary ? (
                <Text className="text-xs text-gray-500 sm:text-sm">
                  Figures marked{" "}
                  <span className="font-[gothamMedium] uppercase tracking-wider text-amber-600">
                    as of now
                  </span>{" "}
                  describe the library at this moment and do not change with the
                  period.
                </Text>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <PeriodPicker
                value={period}
                onChange={setPeriod}
                years={years}
                disabled={loading}
              />
              <Button
                type="button"
                onClick={() => setPrintOpen(true)}
                disabled={!summary}
                className={`${COMPACT_CONTROL} w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto`}
              >
                <FileText className="size-4" />
                Generate a Report
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-10 animate-spin text-blue-600" />
            </div>
          ) : errorMessage && !summary ? (
            <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border bg-white p-10 text-center shadow-sm">
              <AlertTriangle className="size-7 text-red-500" />
              <Text className="text-sm text-gray-600">{errorMessage}</Text>
              <Button variant="cancel" size="sm" onClick={state.refresh}>
                Try again
              </Button>
            </div>
          ) : (
            <div className={refreshing ? "pointer-events-none" : ""}>
              <Outlet />
            </div>
          )}
        </main>
      </div>

      {summary ? (
        <GenerateReportModal
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          summary={summary}
        />
      ) : null}
    </ReportsContext.Provider>
  );
}
