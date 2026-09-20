import { PagedResponse } from "../modules/lms/reads/fetching-types";

export function pagedFromQuery<T>(
  rows: T[],
  limit: number,
  page: number,
  total: number,
): PagedResponse<T> {
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    data: rows,
    page: safePage,
    totalPages,
    hasMore: safePage * safeLimit < total,
    total,
  };
}

function compareValues(a: unknown, b: unknown, direction: "asc" | "desc"): number {
  const aBlank = a === null || a === undefined || a === "";
  const bBlank = b === null || b === undefined || b === "";
  if (aBlank && bBlank) return 0;
  if (aBlank) return 1;
  if (bBlank) return -1;

  const cmp =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), undefined, {
        sensitivity: "base",
        numeric: true,
      });

  return direction === "desc" ? -cmp : cmp;
}

export function pageRowsInMemory<T extends { id: string }>(
  rows: T[],
  sortField: string,
  direction: "asc" | "desc",
  limit: number,
  page: number,
): PagedResponse<T> {
  const sorted = [...rows].sort((a, b) => {
    const cmp = compareValues(
      (a as unknown as Record<string, unknown>)[sortField],
      (b as unknown as Record<string, unknown>)[sortField],
      direction,
    );
    return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
  });

  const safeLimit = Math.max(1, limit);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * safeLimit;

  return {
    data: sorted.slice(from, from + safeLimit),
    page: safePage,
    totalPages,
    hasMore: safePage < totalPages,
    total,
  };
}
