/** `+639171234567` as `917-123-4567`; anything unexpected passes through. */
export function formatPhoneForDisplay(phone?: string): string {
  if (!phone) return "";
  if (!phone.startsWith("+63") || phone.length !== 13) return phone;
  const digits = phone.slice(3);
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** Live formatting while the user types into a phone field. */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length > 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return digits;
}

export function toE164Phone(value?: string): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 10 ? `+63${digits}` : null;
}
