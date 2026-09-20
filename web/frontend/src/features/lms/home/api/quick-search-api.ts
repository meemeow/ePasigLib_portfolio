import { useCallback, useEffect, useRef, useState } from "react";
import { cachedFetch } from "@/lib/fetching-data-cache";
import { LOOKUP_DEBOUNCE_MS } from "@/hooks/use-debounced-lookup";
import {
  buildFiltersPayload as buildCollectionFilters,
  buildSortPayload as buildCollectionSort,
} from "@/features/lms/collections/pages/index/api/collections-helpers";
import { defaultCollectionFilters } from "@/features/lms/collections/pages/index/types/collections-types";
import {
  buildFiltersPayload as buildPatronFilters,
  buildSortPayload as buildPatronSort,
} from "@/features/lms/patrons/pages/index/api/patrons-helpers";
import { defaultFilters as defaultPatronFilters } from "@/features/lms/patrons/pages/index/types/patrons-types";
import type {
  CollectionPaginatedResponse,
  CollectionSearchIdsResponse,
  TableCollection,
} from "@/features/lms/collections/pages/index/types/collections-types";
import type {
  PaginatedResponse as PatronPaginatedResponse,
  SearchIdsResponse as PatronSearchIdsResponse,
} from "@/features/lms/patrons/pages/index/api/patrons-api";
import type { TablePatron } from "@/features/lms/patrons/pages/index/types/patrons-types";

const QUICK_SEARCH_TTL = 5 * 60 * 1000;

export const QUICK_SEARCH_PAGE_SIZE = 10;

export interface QuickSearchPage<T> {
  rows: T[];
  hasMore: boolean;
  total: number;
}

const EMPTY_PAGE = { rows: [], hasMore: false, total: 0 } as const;

export async function quickSearchCollectionsPage(
  term: string,
  page: number,
): Promise<QuickSearchPage<TableCollection>> {
  const trimmed = term.trim();
  if (!trimmed) return { ...EMPTY_PAGE, rows: [] };

  const ranked = await cachedFetch<CollectionSearchIdsResponse>(
    "searchCollections",
    { searchTerm: trimmed },
    {
      ttlMs: QUICK_SEARCH_TTL,
      cacheKey: `searchCollections::quick::${trimmed.toLowerCase()}`,
    },
  );

  const ids = ranked?.ids ?? [];
  if (ids.length === 0) return { ...EMPTY_PAGE, rows: [] };

  const res = await cachedFetch<CollectionPaginatedResponse>(
    "collectionDataPaginated",
    {
      limit: QUICK_SEARCH_PAGE_SIZE,
      page,
      filters: buildCollectionFilters(defaultCollectionFilters),
      sortBy: buildCollectionSort({ column: "Relevance", direction: "desc" }),
      ids,
    },
    {
      ttlMs: QUICK_SEARCH_TTL,
      cacheKey: `collectionDataPaginated::quick::${trimmed.toLowerCase()}::${page}`,
    },
  );

  return {
    rows: res?.data ?? [],
    hasMore: res?.hasMore ?? false,
    total: res?.total ?? 0,
  };
}

export async function quickSearchPatronsPage(
  term: string,
  page: number,
): Promise<QuickSearchPage<TablePatron>> {
  const trimmed = term.trim();
  if (!trimmed) return { ...EMPTY_PAGE, rows: [] };

  const ranked = await cachedFetch<PatronSearchIdsResponse>(
    "searchPatrons",
    { searchTerm: trimmed, limit: QUICK_SEARCH_PAGE_SIZE, page },
    {
      ttlMs: QUICK_SEARCH_TTL,
      cacheKey: `searchPatrons::quick::${trimmed.toLowerCase()}::${page}`,
    },
  );

  const ids = ranked?.ids ?? [];
  if (ids.length === 0) {
    return { rows: [], hasMore: false, total: ranked?.total ?? 0 };
  }

  const res = await cachedFetch<PatronPaginatedResponse>(
    "patronDataPaginated",
    {
      limit: QUICK_SEARCH_PAGE_SIZE,
      page: 1,
      filters: buildPatronFilters(defaultPatronFilters),
      sortBy: buildPatronSort({ column: "CreatedOn", direction: "asc" }),
      ids,
    },
    {
      ttlMs: QUICK_SEARCH_TTL,
      cacheKey: `patronDataPaginated::quick::${trimmed.toLowerCase()}::${page}`,
    },
  );

  const rows = res?.data ?? [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  return {
    rows: ids
      .map((id) => byId.get(id))
      .filter((row): row is TablePatron => Boolean(row)),
    hasMore: ranked?.hasMore ?? false,
    total: ranked?.total ?? 0,
  };
}

function useQuickSearch<T>(
  load: (term: string, page: number) => Promise<QuickSearchPage<T>>,
  delay = LOOKUP_DEBOUNCE_MS,
) {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const pageRef = useRef(1);
  const termRef = useRef("");
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setHasMore(false);
    setTotal(0);
    setError(null);
  }, []);

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      if (timerRef.current) clearTimeout(timerRef.current);

      const trimmed = value.trim();
      if (!trimmed) {
        seqRef.current++;
        loadingRef.current = false;
        termRef.current = "";
        clearResults();
        setSearching(false);
        setLoadingMore(false);
        return;
      }

      setSearching(true);
      timerRef.current = setTimeout(async () => {
        const seq = ++seqRef.current;
        termRef.current = trimmed;
        pageRef.current = 1;
        loadingRef.current = true;
        try {
          const page = await loadRef.current(trimmed, 1);
          if (seq !== seqRef.current || !mountedRef.current) return;
          setResults(page.rows);
          setHasMore(page.hasMore);
          setTotal(page.total);
          setError(null);
        } catch (e) {
          if (seq !== seqRef.current || !mountedRef.current) return;
          clearResults();
          setError(e instanceof Error ? e.message : "Search failed.");
        } finally {
          if (seq === seqRef.current && mountedRef.current) setSearching(false);
          if (seq === seqRef.current) loadingRef.current = false;
        }
      }, delay);
    },
    [clearResults, delay],
  );

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !termRef.current) return;

    const seq = seqRef.current;
    const next = pageRef.current + 1;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const page = await loadRef.current(termRef.current, next);
      if (seq !== seqRef.current || !mountedRef.current) return;
      pageRef.current = next;
      setResults((current) => {
        const seen = new Set(
          current.map((row) => (row as { id?: string }).id).filter(Boolean),
        );
        const fresh = page.rows.filter(
          (row) => !seen.has((row as { id?: string }).id),
        );
        return fresh.length ? [...current, ...fresh] : current;
      });
      setHasMore(page.hasMore);
      if (page.total) setTotal(page.total);
    } catch {
      if (seq !== seqRef.current || !mountedRef.current) return;
      setHasMore(false);
    } finally {
      if (seq === seqRef.current && mountedRef.current) setLoadingMore(false);
      if (seq === seqRef.current) loadingRef.current = false;
    }
  }, [hasMore]);

  const reset = useCallback(() => {
    seqRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    loadingRef.current = false;
    termRef.current = "";
    pageRef.current = 1;
    setQueryState("");
    clearResults();
    setSearching(false);
    setLoadingMore(false);
  }, [clearResults]);

  return {
    query,
    setQuery,
    results,
    searching,
    loadingMore,
    hasMore,
    total,
    error,
    loadMore,
    reset,
  } as const;
}

export function useQuickCollectionSearch() {
  return useQuickSearch<TableCollection>(quickSearchCollectionsPage);
}

export function useQuickPatronSearch() {
  return useQuickSearch<TablePatron>(quickSearchPatronsPage);
}
