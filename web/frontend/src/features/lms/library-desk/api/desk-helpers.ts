import { SECTION_CONFIG } from "@/features/lms/library-desk/api/desk-sections";
import type { UpdateStatus } from "@/features/lms/library-desk/types/updates-types";
import { DEFAULT_FILTERS } from "@/features/lms/library-desk/types/desk-types";
import type {
  DeskFiltersPayload,
  DeskSection,
  DeskSortPayload,
  DeskSortState,
  SectionFilters,
} from "@/features/lms/library-desk/types/desk-types";

export function formatMillis(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} ${date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatMillisDate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncate(value: string, max: number): string {
  const text = String(value ?? "").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}

export function buildDeskFiltersPayload<S extends DeskSection>(
  _section: S,
  filters: SectionFilters[S],
): DeskFiltersPayload {
  const draft = filters as SectionFilters[S] & Record<string, unknown>;
  return {
    ...(Array.isArray(draft.status) ? { status: [...(draft.status as string[])] } : {}),
    ...(Array.isArray(draft.tags) ? { tags: [...(draft.tags as string[])] } : {}),
    ...(typeof draft.state === "string" ? { state: draft.state } : {}),
    ...(Array.isArray(draft.concern) ? { concern: [...(draft.concern as string[])] } : {}),
    ...(typeof draft.dateField === "string" ? { dateField: draft.dateField } : {}),
    dateFrom: String(draft.dateFrom ?? ""),
    dateTo: String(draft.dateTo ?? ""),
  };
}

export function buildDeskSortPayload<S extends DeskSection>(
  sortBy: DeskSortState<S>,
): DeskSortPayload {
  return { column: String(sortBy.column), direction: sortBy.direction };
}

export function getActiveFilterCount<S extends DeskSection>(
  section: S,
  filters: SectionFilters[S],
): number {
  const defaults = DEFAULT_FILTERS[section] as unknown as Record<string, unknown>;
  const draft = filters as unknown as Record<string, unknown>;
  let count = 0;

  const sameList = (a: unknown, b: unknown): boolean => {
    const left = Array.isArray(a) ? a.map(String).sort() : [];
    const right = Array.isArray(b) ? b.map(String).sort() : [];
    return left.length === right.length && left.every((v, i) => v === right[i]);
  };

  if ("status" in draft && !sameList(draft.status, defaults.status)) count += 1;
  if (Array.isArray(draft.tags) && draft.tags.length > 0) count += 1;
  if (Array.isArray(draft.concern) && draft.concern.length > 0) count += 1;
  if ("state" in draft && draft.state !== defaults.state) count += 1;
  if (draft.dateFrom || draft.dateTo) count += 1;
  if ("dateField" in draft && draft.dateField !== defaults.dateField) count += 1;

  return count;
}

export function getActiveSortCount<S extends DeskSection>(
  section: S,
  sortBy: DeskSortState<S>,
): number {
  const defaults = SECTION_CONFIG[section].defaultSort as DeskSortState<S>;
  return sortBy.column === defaults.column &&
    sortBy.direction === defaults.direction
    ? 0
    : 1;
}

export function statusBadgeClass(status: UpdateStatus): string {
  switch (status) {
    case "Draft":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "Archived":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-green-50 text-green-700 border-green-200";
  }
}
