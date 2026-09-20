import { SECTION_CONFIG } from "@/features/lms/circulations/api/circulation-sections";
import type {
  CirculationFiltersPayload,
  CirculationSection,
  CirculationSortState,
  SectionFilters,
} from "@/features/lms/circulations/types/circulation-records-types";

export function formatMillis(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMillisTime(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimeLeft(
  expiresAt: number | null | undefined,
  now: number = Date.now(),
): string {
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return "—";
  const remaining = expiresAt - now;
  if (remaining <= 0) return "Expired";
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  if (hours === 0 && minutes === 0) return "Expires soon";
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

export function capitalize(value?: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function buildCirculationFiltersPayload<S extends CirculationSection>(
  section: S,
  filters: SectionFilters[S],
): CirculationFiltersPayload {
  const f = filters as SectionFilters[CirculationSection] &
    Record<string, unknown>;
  const payload: CirculationFiltersPayload = {};

  if (Array.isArray(f.status) && f.status.length > 0) {
    payload.status = f.status as string[];
  }
  if (f.violations && f.violations !== "All") {
    payload.violations = f.violations as "None" | "Any";
  }
  if (f.overdueOnly === true) payload.overdueOnly = true;
  if (f.hasMultipleBooks === true) payload.hasMultipleBooks = true;
  if (Array.isArray(f.requestedDays) && f.requestedDays.length > 0) {
    payload.requestedDays = f.requestedDays as number[];
  }

  const from = String(f.dateFrom || "").trim();
  const to = String(f.dateTo || "").trim();
  if (from || to) {
    payload.dateField = String(
      f.dateField || SECTION_CONFIG[section].defaultFilters.dateField,
    );
    if (from) payload.dateFrom = from;
    if (to) payload.dateTo = to;
  }

  return payload;
}

export function buildCirculationSortPayload<S extends CirculationSection>(
  sortBy: CirculationSortState<S>,
): { column: string; direction: "asc" | "desc" } {
  return { column: String(sortBy.column), direction: sortBy.direction };
}

export function getActiveFilterCount<S extends CirculationSection>(
  section: S,
  filters: SectionFilters[S],
): number {
  const defaults = SECTION_CONFIG[section].defaultFilters as unknown as Record<
    string,
    unknown
  >;
  const current = filters as unknown as Record<string, unknown>;
  let count = 0;

  for (const key of Object.keys(defaults)) {
    if (key === "dateFrom" || key === "dateTo" || key === "dateField") continue;
    const a = current[key];
    const b = defaults[key];
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) count++;
    } else if (a !== b) {
      count++;
    }
  }

  if (String(current.dateFrom || "") || String(current.dateTo || "")) count++;
  return count;
}

export function getActiveSortCount<S extends CirculationSection>(
  section: S,
  sortBy: CirculationSortState<S>,
): number {
  const d = SECTION_CONFIG[section].defaultSort;
  return sortBy.column === d.column && sortBy.direction === d.direction ? 0 : 1;
}

export function toLocalYYYYMMDD(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
