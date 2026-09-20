export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const MONTH_NAMES_SHORT = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "June",
  "July",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec.",
] as const;

/** Anything the backend might hand back for a timestamp field. */
export type TimestampLike =
  | { toDate?: () => Date; seconds?: number; nanoseconds?: number }
  | Date
  | number
  | string
  | null
  | undefined;

export function toDateOrNull(value: TimestampLike): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTimestamp(value: TimestampLike): string {
  const date = toDateOrNull(value);
  if (date) return date.toLocaleString();
  return typeof value === "string" ? value : "";
}

export function formatTimestampDate(value: TimestampLike): string {
  const date = toDateOrNull(value);
  return date ? date.toLocaleDateString() : "-";
}

export function formatFullDate(value?: string): string {
  if (!value) return "";
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!parts) return value;

  const date = new Date(
    Number(parts[1]),
    Number(parts[2]) - 1,
    Number(parts[3]),
  );
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

export function ageFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/** The latest birth date the forms accept — patrons must be at least four. */
export function minBirthDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 4);
  return date.toISOString().split("T")[0];
}
