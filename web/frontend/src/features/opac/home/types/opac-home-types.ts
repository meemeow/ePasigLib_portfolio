export interface BookResult {
  id: string;
  CollectionTitle: string;
  MainAuthor?: string;
  SecondTitle?: string;
  Edition?: string;
  Volume?: string;
  CollectionImage?: string;
  CallNumber?: string;
  Publisher?: string;
  CopyrightYear?: string;
  ISBN10?: string;
  ISBN13?: string;
  Subjects?: string[];
  UID?: string;
  Status?: string;
}

export type SearchResult = Required<BookResult>;

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
}

export type SearchDataResponse = SearchResponse;

export interface SearchState {
  query: string;
  results: BookResult[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

export interface SearchCacheEntry {
  results: BookResult[];
  timestamp: number;
  ttl: number;
}

export type SearchCache = Map<string, SearchCacheEntry>;
