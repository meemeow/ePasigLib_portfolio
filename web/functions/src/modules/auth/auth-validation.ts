import * as functions from "firebase-functions";

// =====================================================================
// || Server-side input validation                                    ||
// ||                                                                 ||
// || Mirrors the zod schemas the auth forms use. The client rules     ||
// || stay stricter per-form; these are the floor the backend refuses  ||
// || to go below, and they run on every callable regardless of what   ||
// || the browser did or did not check.                                ||
// =====================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-zÑñ\s\-']+$/;
const SIX_DIGITS_RE = /^\d{6}$/;

export const MIN_AGE = 4;
export const MAX_AGE = 122;

export function invalid(message: string): never {
  throw new functions.https.HttpsError("invalid-argument", message);
}

export function requiredString(value: unknown, label: string): string {
  const text =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!text) invalid(`${label} is required`);
  return text;
}

export function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function assertName(value: unknown, label: string): string {
  const name = requiredString(value, label);
  if (!NAME_RE.test(name)) {
    invalid(
      `${label} can only contain letters, spaces, hyphens, and apostrophes`,
    );
  }
  if (name.length > 50) invalid(`${label} is too long`);
  return name;
}

export function assertEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) {
    invalid("Please enter a valid email address");
  }
  if (email.length > 100) invalid("Email address is too long");
  return email;
}

export function assertPasswordStrength(password: unknown): string {
  if (typeof password !== "string" || password.length < 8) {
    invalid("Password must be at least 8 characters");
  }
  if (password.length > 50) invalid("Password is too long");
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[\d\W_]/.test(password)
  ) {
    invalid(
      "Password must contain an uppercase letter, a lowercase letter, and a number or symbol",
    );
  }
  return password;
}

export function assertBirthDate(value: unknown): string {
  const date = requiredString(value, "Birth date");
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) invalid("Please enter a valid birth date");
  if (parsed > new Date()) invalid("Birth date cannot be in the future");

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age--;
  }
  if (age < MIN_AGE || age > MAX_AGE) {
    invalid(`Age must be between ${MIN_AGE} and ${MAX_AGE}`);
  }
  return date;
}

export function assertResetCode(value: unknown): string {
  const code = typeof value === "string" ? value.trim() : "";
  if (!SIX_DIGITS_RE.test(code)) {
    invalid("Reset code must be a 6-digit number");
  }
  return code;
}
