import type { Filters, SortState, PatronFiltersPayload, PatronSortPayload } from "@/features/lms/patrons/pages/index/types/patrons-types";

export const capitalize = (str?: string): string => {
  if (!str) return "";
  return str
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
};

export const formatTimestamp = (ts?: number | null): string => {
  try {
    if (!ts || typeof ts !== "number") return "-";
    return new Date(ts).toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

export const buildFiltersPayload = (filters: Filters): PatronFiltersPayload => {
  return {
    residency: filters.residency,
    ...(filters.barangay ? { barangay: filters.barangay } : {}),
    state: filters.state.length > 0 ? filters.state : undefined,
    status: filters.status,
    ageRange: filters.ageRange,
  };
};

export const buildSortPayload = (sortBy: SortState): PatronSortPayload => {
  return {
    column: sortBy.column,
    direction: sortBy.direction,
  };
};

export const getActiveFilterCount = (filters: Filters): number => {
  let count = 0;
  count += filters.state.length;
  if (filters.residency !== "All") count++;
  if (filters.barangay) count++;
  if (filters.status !== "All") count++;
  if (filters.ageRange !== "All") count++;
  return count;
};

export const getActiveSortCount = (sortBy: SortState): number => {
  let count = 0;
  if (sortBy.column !== "CreatedOn") count++;
  if (sortBy.direction !== "asc") count++;
  return count;
};