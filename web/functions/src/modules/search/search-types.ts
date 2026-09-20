export interface SearchableEntry {
  id: string;
  keywords: string[];
}

export interface SortedSearchEntry {
  id: string;
  score: number;
}

export interface BookSearchResult {
  id: string;
  CollectionTitle: string;
  MainAuthor: string;
  CollectionImage: string;
  Subjects: string[];
  SecondTitle: string;
  Edition: string;
  Volume: string;
  CallNumber: string;
  Publisher: string;
  CopyrightYear: string;
  ISBN10: string;
  ISBN13: string;
  UID: string;
  Status: string;
}

export interface SearchResponse {
  results: BookSearchResult[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
}

export interface FirestoreData {
  keywords?: unknown[];
  CollectionTitle?: string;
  MainAuthor?: string;
  CollectionImage?: string;
  Subjects?: unknown[];
  SecondTitle?: string;
  Edition?: string;
  Volume?: string;
  CallNumber?: string;
  Publisher?: string;
  CopyrightYear?: string;
  ISBN10?: string;
  ISBN13?: string;
  UID?: string;
  Status?: string;
  [key: string]: unknown;
}

export interface GoogleBooksVolume {
  id: string;
  title: string;
  subtitle: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  publicationYear: string;
  description: string;
  pageCount: string;
  categories: string[];
  isbn10: string;
  isbn13: string;
  thumbnail: string;
  infoLink: string;
}

export type GoogleBooksLookupStatus = "found" | "not-found" | "invalid";

export interface GoogleBooksLookupResponse {
  status: GoogleBooksLookupStatus;
  isbn: string;
  volume: GoogleBooksVolume | null;
}

export type GoogleBooksSearchStatus = "found" | "not-found" | "invalid";

export interface GoogleBooksSearchResponse {
  status: GoogleBooksSearchStatus;
  query: string;
  results: GoogleBooksVolume[];
}

export interface GoogleBooksIndustryIdentifier {
  type?: string;
  identifier?: string;
}

export interface GoogleBooksVolumeInfo {
  infoLink?: string;
  title?: string;
  subtitle?: string;
  authors?: unknown;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: unknown;
  industryIdentifiers?: GoogleBooksIndustryIdentifier[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
}

export interface GoogleBooksApiResponse {
  totalItems?: number;
  items?: Array<{ id?: string; volumeInfo?: GoogleBooksVolumeInfo }>;
}

export interface CollectionSearchIdsResponse {
  ids: string[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
}

export interface StaffSearchIdsResponse {
  ids: string[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
}
