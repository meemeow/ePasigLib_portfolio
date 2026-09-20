import { cachedFetch, clearCachedFetch } from "@/lib/fetching-data-cache";
import type {
  ReportPeriodChoice,
  ReportSummary,
} from "@/features/lms/reports/types/report-types";

function payloadFor(period: ReportPeriodChoice) {
  const { scope, year, month, day } = period;
  if (scope === "all") return { scope };
  if (scope === "year") return { scope, year };
  if (scope === "month") return { scope, year, month };
  return { scope, year, month, day };
}

function withTallyDefaults(summary: ReportSummary): ReportSummary {
  return {
    ...summary,
    patrons: {
      ...summary.patrons,
      standing: summary.patrons?.standing ?? [],
      residency: summary.patrons?.residency ?? [],
      byBarangay: summary.patrons?.byBarangay ?? [],
    },
  };
}

export async function fetchReportSummaryApi(
  period: ReportPeriodChoice,
  isRefresh?: boolean,
): Promise<ReportSummary | undefined> {
  try {
    const summary = await cachedFetch<ReportSummary>(
      "reportSummary",
      payloadFor(period),
      { force: isRefresh },
    );
    return summary ? withTallyDefaults(summary) : summary;
  } catch (error) {
    console.error("Failed to fetch the report:", error);
    return undefined;
  }
}

export async function fetchReportYearsApi(): Promise<number[]> {
  try {
    const data = await cachedFetch<{ years: number[] }>("reportYears", {});
    return Array.isArray(data?.years) ? data.years : [];
  } catch (error) {
    console.error("Failed to fetch report years:", error);
    return [];
  }
}

export function invalidateReportCaches(): void {
  clearCachedFetch("reportSummary");
  clearCachedFetch("reportYears");
}
