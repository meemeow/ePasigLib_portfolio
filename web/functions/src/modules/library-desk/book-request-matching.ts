export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeAuthor(value: unknown): string {
  const words = normalizeText(value).split(" ").filter(Boolean);
  return words.sort().join(" ");
}

function isbnChars(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^0-9X]/g, "");
}

export function isbn10To13(isbn10: string): string {
  const core = isbnChars(isbn10);
  if (core.length !== 10) return "";

  const body = `978${core.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${body}${check}`;
}

export function isbnSet(record: {
  isbn10?: unknown;
  isbn13?: unknown;
}): Set<string> {
  const out = new Set<string>();

  const thirteen = isbnChars(record.isbn13);
  if (thirteen.length === 13) out.add(thirteen);

  const ten = isbnChars(record.isbn10);
  if (ten.length === 10) {
    const converted = isbn10To13(ten);
    if (converted) out.add(converted);
  }

  return out;
}

export interface SuggestionIdentity {
  title: string;
  author: string;
  isbns: Set<string>;
}

export interface SuggestionInput {
  title?: unknown;
  author?: unknown;
  isbn10?: unknown;
  isbn13?: unknown;
}

export function identityOf(record: SuggestionInput): SuggestionIdentity {
  return {
    title: normalizeText(record.title),
    author: normalizeAuthor(record.author),
    isbns: isbnSet(record),
  };
}

export function identityKeyOf(record: SuggestionInput): string {
  const identity = identityOf(record);
  return `${identity.title}::${identity.author}`;
}

export function sameSuggestion(
  a: SuggestionIdentity,
  b: SuggestionIdentity,
): boolean {
  for (const isbn of a.isbns) {
    if (b.isbns.has(isbn)) return true;
  }

  if (!a.title || a.title !== b.title) return false;
  return !a.author || !b.author || a.author === b.author;
}
