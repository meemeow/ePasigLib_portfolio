import type {
  BookResult,
  SearchResponse,
  SearchDataResponse,
} from "@/features/opac/home/types/opac-home-types";


export async function fetchSearchResults(
  searchTerm: string,
  limit: number = 7,
  startAfterId?: string,
): Promise<SearchResponse> {
  if (!searchTerm || searchTerm.trim() === "") {
    return { results: [], total: 0, hasMore: false, nextStartAfterId: null };
  }

  const trimmedTerm = searchTerm.trim().toLowerCase();

  try {
        const result = await callable({
      case: "searchCollectionsViaSearchables",
      searchTerm: trimmedTerm,
      limit,
      startAfterId,
    });

    const data = result?.data as SearchDataResponse;

    return {
      results: Array.isArray(data?.results) ? data.results : [],
      total: data?.total || 0,
      hasMore: data?.hasMore || false,
      nextStartAfterId: data?.nextStartAfterId || null,
    };
  } catch (error) {
    console.error("[Search API] Error fetching results:", error);
    throw error;
  }
}

import { useState, useEffect, useCallback, useRef } from "react";
import { callSearchData as callable } from "@/lib/api/callables";

const DEBOUNCE_DELAY = 800;
const INITIAL_LIMIT = 7;
const LOAD_MORE_LIMIT = 7;
const MAX_PAGES = 3;
const CACHE_TTL = 5 * 60 * 1000;

interface SearchCacheEntry {
  results: BookResult[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
  timestamp: number;
  loadedCount: number;
}

const searchCache: Record<string, SearchCacheEntry> = {};

export function useHomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [nextStartAfterId, setNextStartAfterId] = useState<string | null>(null);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [lastSearchTerm, setLastSearchTerm] = useState("");
  const [loadCount, setLoadCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const scrollToTop = useCallback(() => {
    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollTop = 0;
    }
  }, []);

  const clearResultsForNewSearch = useCallback(() => {
    setResults([]);
    setHasMore(false);
    setTotal(0);
    setNextStartAfterId(null);
    setLoadCount(0);
    scrollToTop();
  }, [scrollToTop]);

  const performSearch = useCallback(
    async (searchTerm: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const trimmed = searchTerm.trim();

      if (trimmed !== lastSearchTerm) {
        clearResultsForNewSearch();
      }

      if (!trimmed) {
        setResults([]);
        setIsLoading(false);
        setIsError(false);
        setLastSearchTerm("");
        setCurrentSearchTerm("");
        return;
      }

      const cached = searchCache[trimmed];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(
          `✅ [Cache] HIT for "${trimmed}" (${cached.loadedCount}/${cached.total})`,
        );

        if (trimmed !== lastSearchTerm) {
          clearResultsForNewSearch();
        }

        const loadedResults = cached.results.slice(0, cached.loadedCount);
        setResults(loadedResults);
        setTotal(cached.total);
        setHasMore(
          cached.loadedCount < cached.total && cached.loadedCount < 21,
        );
        setNextStartAfterId(cached.nextStartAfterId);
        setCurrentSearchTerm(trimmed);
        setLastSearchTerm(trimmed);
        setLoadCount(Math.ceil(cached.loadedCount / LOAD_MORE_LIMIT));
        setIsLoading(false);
        return;
      }

      console.log(`🔄 [Cache] MISS for "${trimmed}", fetching...`);
      setIsLoading(true);
      setIsError(false);
      setCurrentSearchTerm(trimmed);
      setLastSearchTerm(trimmed);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetchSearchResults(trimmed, INITIAL_LIMIT);

        if (isMountedRef.current && !controller.signal.aborted) {
          searchCache[trimmed] = {
            results: response.results,
            total: response.total,
            hasMore: response.hasMore && response.results.length < 21,
            nextStartAfterId: response.nextStartAfterId,
            timestamp: Date.now(),
            loadedCount: response.results.length,
          };

          setResults(response.results);
          setTotal(response.total);
          setHasMore(response.hasMore && response.results.length < 21);
          setNextStartAfterId(response.nextStartAfterId);
          setLoadCount(1);
          setIsLoading(false);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsError(true);
          setErrorMessage(
            error instanceof Error ? error.message : "Search failed",
          );
        }
      }
    },
    [lastSearchTerm, clearResultsForNewSearch],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    if (!hasMore) return;
    if (!nextStartAfterId) return;
    if (!currentSearchTerm) return;
    if (loadCount >= MAX_PAGES) {
      setHasMore(false);
      return;
    }

    setIsLoadingMore(true);

    try {
      const response = await fetchSearchResults(
        currentSearchTerm,
        LOAD_MORE_LIMIT,
        nextStartAfterId,
      );

      if (isMountedRef.current) {
        const existingIds = new Set(results.map((r) => r.id));
        const newUniqueResults = response.results.filter(
          (r) => !existingIds.has(r.id),
        );

        const updatedResults = [...results, ...newUniqueResults];
        setResults(updatedResults);

        const newLoadCount = loadCount + 1;
        setLoadCount(newLoadCount);

        const stillHasMore = response.hasMore && newLoadCount < MAX_PAGES;
        setHasMore(stillHasMore);
        setNextStartAfterId(response.nextStartAfterId);

        if (currentSearchTerm && searchCache[currentSearchTerm]) {
          const entry = searchCache[currentSearchTerm];
          const mergedResults = [...entry.results];
          for (const newResult of response.results) {
            if (!mergedResults.some((r) => r.id === newResult.id)) {
              mergedResults.push(newResult);
            }
          }
          searchCache[currentSearchTerm] = {
            ...entry,
            results: mergedResults,
            hasMore: stillHasMore,
            nextStartAfterId: response.nextStartAfterId,
            loadedCount: mergedResults.length,
          };
        }

        setIsLoadingMore(false);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
        setIsError(true);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load more",
        );
      }
    }
  }, [
    isLoadingMore,
    hasMore,
    nextStartAfterId,
    currentSearchTerm,
    results,
    loadCount,
  ]);

  const debouncedSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setQuery(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!trimmed) {
        setResults([]);
        setIsLoading(false);
        setIsError(false);
        setLastSearchTerm("");
        setCurrentSearchTerm("");
        setHasMore(false);
        setTotal(0);
        setNextStartAfterId(null);
        setLoadCount(0);
        return;
      }

      const cached = searchCache[trimmed];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        if (trimmed !== lastSearchTerm) {
          clearResultsForNewSearch();
        }

        const loadedResults = cached.results.slice(0, cached.loadedCount);
        setResults(loadedResults);
        setTotal(cached.total);
        setHasMore(
          cached.loadedCount < cached.total && cached.loadedCount < 21,
        );
        setNextStartAfterId(cached.nextStartAfterId);
        setCurrentSearchTerm(trimmed);
        setLastSearchTerm(trimmed);
        setLoadCount(Math.ceil(cached.loadedCount / LOAD_MORE_LIMIT));
        setIsLoading(false);
        return;
      }

      if (trimmed !== lastSearchTerm && lastSearchTerm !== "") {
        clearResultsForNewSearch();
      }

      debounceTimerRef.current = setTimeout(() => {
        performSearch(value);
      }, DEBOUNCE_DELAY);
    },
    [performSearch, lastSearchTerm, clearResultsForNewSearch],
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsLoading(false);
    setIsError(false);
    setLastSearchTerm("");
    setCurrentSearchTerm("");
    setHasMore(false);
    setTotal(0);
    setNextStartAfterId(null);
    setLoadCount(0);
    scrollToTop();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [scrollToTop]);

  return {
    query,
    setQuery: debouncedSearch,
    results,
    isLoading,
    isLoadingMore,
    isError,
    errorMessage,
    hasMore,
    total,
    clearSearch,
    loadMore,
    hasResults: results.length > 0,
    resultsContainerRef,
    scrollToTop,
  };
}
