export type TimeOfDay = "morning" | "afternoon" | "evening";

export function timeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

const GREETINGS: Record<TimeOfDay, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

const GREETING_EMOJI: Record<TimeOfDay, string> = {
  morning: "☀️",
  afternoon: "🌤️",
  evening: "🌙",
};

export function greetingFor(date: Date = new Date()): string {
  return GREETINGS[timeOfDay(date)];
}

export function greetingEmojiFor(date: Date = new Date()): string {
  return GREETING_EMOJI[timeOfDay(date)];
}

export type TimestampLike =
  | { toDate?: () => Date; seconds?: number }
  | string
  | number
  | Date
  | null
  | undefined;

export function toDate(value: TimestampLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatUpdateDate(value: TimestampLike): string {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCount(value: number | undefined): string | null {
  return typeof value === "number" ? value.toLocaleString() : null;
}

export interface CalendarDay {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export function buildMonthGrid(
  month: Date,
  today: Date = new Date(),
): CalendarDay[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const todayKey = dayKey(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      first.getFullYear(),
      first.getMonth(),
      1 - first.getDay() + index,
    );

    return {
      key: dayKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === first.getMonth(),
      isToday: dayKey(date) === todayKey,
    };
  });
}
