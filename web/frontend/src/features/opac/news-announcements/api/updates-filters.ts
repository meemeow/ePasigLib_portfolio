import Fuse from "fuse.js";
import type { TimestampLike } from "@/features/opac/news-announcements/types/news-announcements-types";

export const ANY = "any";

export const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: new Date(0, i).toLocaleString("en", { month: "long" }),
}));

export const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

export function matchesDate(
  ts: TimestampLike | undefined,
  month: string,
  year: string,
  day: string,
): boolean {
  if (month === ANY && year === ANY && day === ANY) return true;
  if (!ts) return false;

  const date = ts.toDate();
  if (Number.isNaN(date.getTime())) return false;

  if (month !== ANY && String(date.getMonth() + 1).padStart(2, "0") !== month) {
    return false;
  }
  if (year !== ANY && String(date.getFullYear()) !== year) return false;
  if (day !== ANY && String(date.getDate()) !== day) return false;
  return true;
}

export function yearOptions(
  ...lists: Array<Array<{ createdOn?: TimestampLike }>>
): { value: string; label: string }[] {
  const found = new Set<number>();
  for (const list of lists) {
    for (const item of list) {
      if (!item.createdOn) continue;
      const date = item.createdOn.toDate();
      if (!Number.isNaN(date.getTime())) found.add(date.getFullYear());
    }
  }
  return [...found]
    .sort((a, b) => b - a)
    .map((value) => ({ value: String(value), label: String(value) }));
}

export const FUSE_OPTIONS = {
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
} as const;

export const NEWS_KEYS = ["title", "description", "tags", "mainAuthor"];
export const ANNOUNCEMENT_KEYS = ["subject", "message", "authorName"];

export function fuzzyFilter<T>(fuse: Fuse<T>, items: T[], term: string): T[] {
  const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;

  let survivors: Map<number, number> | null = null;

  for (const word of words) {
    const round = new Map<number, number>();
    for (const hit of fuse.search(word)) {
      const index = hit.refIndex;
      if (index === undefined) continue;
      if (survivors && !survivors.has(index)) continue;
      round.set(index, (survivors?.get(index) ?? 0) + (hit.score ?? 0));
    }
    survivors = round;
    if (survivors.size === 0) break;
  }

  return [...(survivors ?? new Map()).entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([index]) => items[index])
    .filter(Boolean);
}
