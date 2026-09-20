import { badRequest } from "./errors";

/** Trimmed string, with null/undefined collapsing to "". */
export const str = (value: unknown): string => String(value ?? "").trim();

/** Finite number, or `fallback` when the value cannot be read as one. */
export const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function requireString(
  source: Record<string, unknown>,
  field: string,
  label = field,
): string {
  const value = str(source[field]);
  if (!value) throw badRequest(`${label} is required.`);
  return value;
}

export const optionalString = (
  source: Record<string, unknown>,
  field: string,
): string => str(source[field]);

/** Copy across only the allowed keys that the source actually defines. */
export function pickFields(
  source: Record<string, unknown>,
  allowed: readonly string[],
): Record<string, unknown> {
  return allowed.reduce<Record<string, unknown>>((acc, field) => {
    if (source[field] !== undefined) acc[field] = source[field];
    return acc;
  }, {});
}

/** Philippine mobile numbers, normalised to E.164 (+63…). */
export function formatToE164(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return `+63${cleaned.slice(1)}`;
  if (cleaned.startsWith("63")) return `+${cleaned}`;
  if (cleaned.startsWith("9")) return `+63${cleaned}`;
  return `+${cleaned}`;
}
