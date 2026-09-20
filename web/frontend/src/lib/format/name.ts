export function capitalizeWords(value?: string): string {
  if (!value) return "";
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function toTitleCase(value?: string): string {
  if (!value) return "";
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatFullName(parts: {
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Suffix?: string;
}): string {
  return [parts.FirstName, parts.MiddleName, parts.LastName, parts.Suffix]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ");
}
