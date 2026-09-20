import type { firestore } from "firebase-admin";
import { Timestamp } from "./firebase";

type TimestampLike = {
  toMillis?: () => number;
  toDate?: () => Date;
  seconds?: number;
  _seconds?: number;
  nanoseconds?: number;
  _nanoseconds?: number;
};

/**
 * Milliseconds for a Firestore Timestamp, a Date or a number.
 *
 * Anything else — a raw date string included — reads as null. That refusal is
 * deliberate: these call sites serialize stored timestamps, and a string in the
 * field means the record is malformed rather than merely differently typed.
 * Use `toMillisLoose` where strings are a legitimate input.
 */
export function toMillis(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "object") return null;

  const ts = value as TimestampLike;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.toDate === "function") {
    try {
      return ts.toDate().getTime();
    } catch {
      return null;
    }
  }
  const seconds = ts.seconds ?? ts._seconds;
  if (typeof seconds === "number") {
    const nanos = ts.nanoseconds ?? ts._nanoseconds ?? 0;
    return seconds * 1000 + Math.floor(nanos / 1_000_000);
  }
  return null;
}

/** `toMillis`, but a parseable date string is accepted too. */
export function toMillisLoose(value: unknown): number | null {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return toMillis(value);
}

/** Date for anything date-shaped, strings included. */
export function toDateSafe(value: unknown): Date | null {
  const millis = toMillisLoose(value);
  return millis === null ? null : new Date(millis);
}

/** Firestore Timestamp for anything date-shaped, strings included. */
export function toTimestamp(value: unknown): firestore.Timestamp | null {
  if (value instanceof Timestamp) return value;
  try {
    const millis = toMillisLoose(value);
    return millis === null ? null : Timestamp.fromMillis(millis);
  } catch (error) {
    console.warn("toTimestamp conversion failed, value=", value, error);
    return null;
  }
}
