function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(matrix[j] + 1, prev + 1, matrix[j - 1] + cost);
      matrix[j - 1] = prev;
      prev = val;
    }
    matrix[b.length] = prev;
  }
  return matrix[b.length];
}

export const SEARCH_INDEX_VERSION = 2;

export const SEARCH_INDEX_META_DOC = "search_index";

export interface SearchIndexEntry {
  v: number;
  title: string;
  text: string;
  titleTokens: string[];
  authorTokens: string[];
  otherTokens: string[];
  keywords: string[];
}

export interface StoredSearchEntry extends SearchIndexEntry {
  id: string;
}

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function normalizeText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value)
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenize(value: unknown): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return Array.from(new Set(normalized.split(" ").filter(Boolean)));
}

function tokenizeAll(values: unknown[]): string[] {
  const tokens = new Set<string>();
  for (const value of values) {
    for (const token of tokenize(value)) tokens.add(token);
  }
  return Array.from(tokens);
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? ""));
  if (value === undefined || value === null || value === "") return [];
  return [String(value)];
}

type CollectionFields = Record<string, unknown>;

export function buildSearchEntry(data: CollectionFields): SearchIndexEntry {
  const titleValues = [data.CollectionTitle, data.SecondTitle];
  const authorValues = [
    data.MainAuthor,
    data.JointAuthor,
    data.Author,
    ...asList(data.RelatedNames),
  ];
  const otherValues = [
    ...asList(data.Subjects),
    data.Publisher,
    data.PublicationPlace,
    data.PublicationYear,
    data.SeriesTitle,
    data.Inclusion,
    data.ClassCode,
    data.MaterialType,
    data.CallNumber,
    data.UID,
    data.ISBN10,
    data.ISBN13,
  ];

  const keywords = [...titleValues, ...authorValues, ...otherValues]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(String);

  const title = normalizeText(data.CollectionTitle);
  const titleTokens = tokenizeAll(titleValues);
  const authorTokens = tokenizeAll(authorValues);
  const otherTokens = tokenizeAll(otherValues);

  return {
    v: SEARCH_INDEX_VERSION,
    title,
    text: normalizeText(keywords.join(" ")),
    titleTokens,
    authorTokens,
    otherTokens,
    keywords,
  };
}

export function readSearchEntry(
  id: string,
  data: CollectionFields,
): StoredSearchEntry | null {
  const version = Number(data.v) || 0;

  if (version >= 2) {
    return {
      id,
      v: version,
      title: String(data.title ?? ""),
      text: String(data.text ?? ""),
      titleTokens: asList(data.titleTokens),
      authorTokens: asList(data.authorTokens),
      otherTokens: asList(data.otherTokens),
      keywords: asList(data.keywords),
    };
  }

  const keywords = asList(data.keywords);
  if (keywords.length === 0) return null;

  const [rawTitle, ...rest] = keywords;
  return {
    id,
    v: version,
    title: normalizeText(rawTitle),
    text: normalizeText(keywords.join(" ")),
    titleTokens: tokenize(rawTitle),
    authorTokens: [],
    otherTokens: tokenizeAll(rest),
    keywords,
  };
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

const FIELD_WEIGHTS = {
  title: { exact: 1.0, prefix: 0.85, fuzzy: 0.6 },
  author: { exact: 0.8, prefix: 0.68, fuzzy: 0.45 },
  other: { exact: 0.5, prefix: 0.42, fuzzy: 0.3 },
} as const;

const OPTIONAL_WORD_LENGTH = 3;

function fuzzyTolerance(word: string): number {
  if (word.length >= 8) return 2;
  if (word.length >= 5) return 1;
  return 0;
}

function scoreWordInField(
  word: string,
  tokens: string[],
  weights: { exact: number; prefix: number; fuzzy: number },
): number {
  if (tokens.length === 0) return 0;

  let best = 0;
  const tolerance = fuzzyTolerance(word);

  for (const token of tokens) {
    if (token === word) return weights.exact;

    if (token.startsWith(word) || word.startsWith(token)) {
      best = Math.max(best, weights.prefix);
      continue;
    }

    if (tolerance > 0 && Math.abs(token.length - word.length) <= tolerance) {
      if (levenshtein(token, word) <= tolerance) {
        best = Math.max(best, weights.fuzzy);
      }
    }
  }

  return best;
}

export function scoreEntry(entry: StoredSearchEntry, queryWords: string[]): number {
  if (queryWords.length === 0) return 0;

  let total = 0;
  let matched = 0;

  for (const word of queryWords) {
    const best = Math.max(
      scoreWordInField(word, entry.titleTokens, FIELD_WEIGHTS.title),
      scoreWordInField(word, entry.authorTokens, FIELD_WEIGHTS.author),
      scoreWordInField(word, entry.otherTokens, FIELD_WEIGHTS.other),
    );

    if (best === 0) {
      if (word.length >= OPTIONAL_WORD_LENGTH) return 0;
      continue;
    }

    total += best;
    matched += 1;
  }

  if (matched === 0) return 0;

  let score = total / matched;

  const phrase = queryWords.join(" ");
  if (entry.title === phrase) score += 1.0;
  else if (entry.title.startsWith(phrase)) score += 0.6;
  else if (entry.title.includes(phrase)) score += 0.4;
  else if (entry.text.includes(phrase)) score += 0.15;

  return score;
}

export function queryWordsOf(searchTerm: string): string[] {
  return tokenize(searchTerm);
}
