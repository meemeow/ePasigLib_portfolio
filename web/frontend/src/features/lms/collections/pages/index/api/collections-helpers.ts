import type {
  CollectionDateFilters,
  CollectionFiltersPayload,
  CollectionFiltersState,
  CollectionSortPayload,
  CollectionSortState,
} from "@/features/lms/collections/pages/index/types/collections-types";
import { defaultCollectionSort } from "@/features/lms/collections/pages/index/types/collections-types";

export const formatTimestamp = (value: number | null): string => {
  if (!value || typeof value !== "number") return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const buildFiltersPayload = (
  filters: CollectionFiltersState,
): CollectionFiltersPayload => ({
  status: filters.Status,
  classCodes: filters.classCodes.length > 0 ? filters.classCodes : undefined,
  materialTypes:
    filters.materialTypes.length > 0 ? filters.materialTypes : undefined,
  libraryLocationMode: filters.libraryLocationMode,
  pubYearStart: filters.pubYearStart || undefined,
  pubYearEnd: filters.pubYearEnd || undefined,
  copyrightStart: filters.copyrightStart || undefined,
  copyrightEnd: filters.copyrightEnd || undefined,
  createdStartMonth: filters.createdStartMonth || undefined,
  createdStartYear: filters.createdStartYear || undefined,
  createdEndMonth: filters.createdEndMonth || undefined,
  createdEndYear: filters.createdEndYear || undefined,
});

export const buildSortPayload = (
  sortBy: CollectionSortState,
): CollectionSortPayload => ({
  column: sortBy.column,
  direction: sortBy.direction,
});

export const getActiveFilterCount = (
  filters: CollectionFiltersState,
): number => {
  let count = filters.classCodes.length + filters.materialTypes.length;
  if (filters.libraryLocationMode !== "All") count++;
  if (filters.Status !== "All") count++;
  count += [
    filters.pubYearStart,
    filters.pubYearEnd,
    filters.copyrightStart,
    filters.copyrightEnd,
    filters.createdStartMonth,
    filters.createdStartYear,
    filters.createdEndMonth,
    filters.createdEndYear,
  ].filter(Boolean).length;
  return count;
};

export const getActiveSortCount = (sortBy: CollectionSortState): number => {
  let count = 0;
  if (sortBy.column !== "CreatedOn") count++;
  if (sortBy.direction !== "asc") count++;
  return count;
};

export const isDefaultSort = (sortBy: CollectionSortState): boolean =>
  sortBy.column === defaultCollectionSort.column &&
  sortBy.direction === defaultCollectionSort.direction;

export const searchSortOf = (
  sortBy: CollectionSortState,
): CollectionSortState =>
  isDefaultSort(sortBy) ? { column: "Relevance", direction: "desc" } : sortBy;

export const toDateFilters = (
  filters: CollectionFiltersState,
  dateInputFormat: CollectionDateFilters["dateInputFormat"],
): CollectionDateFilters => ({
  dateInputFormat,
  pubYearStart: filters.pubYearStart,
  pubYearEnd: filters.pubYearEnd,
  copyrightStart: filters.copyrightStart,
  copyrightEnd: filters.copyrightEnd,
  createdStartMonth: filters.createdStartMonth,
  createdStartYear: filters.createdStartYear,
  createdEndMonth: filters.createdEndMonth,
  createdEndYear: filters.createdEndYear,
});
