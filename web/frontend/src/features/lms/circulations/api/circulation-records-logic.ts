import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCirculationRecordsApi } from "@/features/lms/circulations/api/circulation-records-api";
import {
  CIRC_CACHE_TTL,
  CIRC_DEBOUNCE_DELAY,
  clearSectionSearchCache,
  sectionSearchCache,
} from "@/features/lms/circulations/api/circulation-records-cache";
import {
  buildCirculationFiltersPayload,
  buildCirculationSortPayload,
  getActiveFilterCount,
  getActiveSortCount,
} from "@/features/lms/circulations/api/circulation-records-helpers";
import {
  ALWAYS_FRESH_SECTIONS,
  SECTION_CONFIG,
} from "@/features/lms/circulations/api/circulation-sections";
import type {
  CirculationPaginatedResponse,
  CirculationSection,
  CirculationSortState,
  FetchCirculationRecordsPayload,
  SectionFilters,
  SectionRow,
} from "@/features/lms/circulations/types/circulation-records-types";

const SUPPRESS_MS = 10_000;

interface FetchOptions {
  isRefresh?: boolean;
  searchTerm?: string;
  page?: number;
}

export function useCirculationRecords<S extends CirculationSection>(
  section: S,
) {
  const config = SECTION_CONFIG[section] as unknown as {
    defaultFilters: SectionFilters[S];
    defaultSort: CirculationSortState<S>;
  };

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [rows, setRows] = useState<SectionRow[S][]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");

  const [filters, setFilters] = useState<SectionFilters[S]>({
    ...config.defaultFilters,
  });
  const [pendingFilters, setPendingFilters] = useState<SectionFilters[S]>({
    ...config.defaultFilters,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [sortBy, setSortBy] = useState<CirculationSortState<S>>({
    ...config.defaultSort,
  });
  const [pendingSort, setPendingSort] = useState<CirculationSortState<S>>({
    ...config.defaultSort,
  });
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const initialLoadDone = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const suppressedIdsRef = useRef<Map<string, number>>(new Map());
  const requestSeqRef = useRef(0);

  const getCacheKey = useCallback(
    (
      searchTerm = "",
      filtersObj: SectionFilters[S] = filters,
      sortState: CirculationSortState<S> = sortBy,
      perPage: number = itemsPerPage,
    ): string =>
      `${section}_${searchTerm}_${JSON.stringify(filtersObj)}_${JSON.stringify(
        sortState,
      )}_${perPage}`,
    [section, filters, sortBy, itemsPerPage],
  );

  const applySuppression = useCallback((incoming: SectionRow[S][]) => {
    const now = Date.now();
    for (const [id, at] of suppressedIdsRef.current) {
      if (now - at > SUPPRESS_MS) suppressedIdsRef.current.delete(id);
    }
    if (suppressedIdsRef.current.size === 0) return incoming;
    return incoming.filter(
      (r) => !suppressedIdsRef.current.has((r as { id: string }).id),
    );
  }, []);

  const suppressRow = useCallback((id: string) => {
    suppressedIdsRef.current.set(id, Date.now());
    setRows((prev) => prev.filter((r) => (r as { id: string }).id !== id));
    setTotalCount((c) => Math.max(0, c - 1));
  }, []);

  const fetchRecords = useCallback(
    async (
      page: number,
      opts?: FetchOptions,
    ): Promise<CirculationPaginatedResponse<S> | undefined> => {
      const seq = ++requestSeqRef.current;
      setTableLoading(true);
      setErrorMessage(null);

      const payload: FetchCirculationRecordsPayload = {
        type: section,
        limit: itemsPerPage,
        page: Math.max(1, page),
        searchTerm: (opts?.searchTerm ?? "").trim() || undefined,
        filters: buildCirculationFiltersPayload(section, filters),
        sortBy: buildCirculationSortPayload(sortBy),
      };

      const response = await fetchCirculationRecordsApi<S>(
        payload,
        opts?.isRefresh,
      );

      if (seq !== requestSeqRef.current || !mountedRef.current)
        return undefined;

      if (response) {
        setRows(applySuppression(response.data || []));
        setTotalCount(response.total || 0);
        setTotalPages(
          response.totalPages ??
            Math.max(1, Math.ceil((response.total || 0) / itemsPerPage)),
        );
        setHasMore(response.hasMore || false);
        setCurrentPage(response.page ?? Math.max(1, page));
      } else {
        setErrorMessage("Could not load records. Try Refresh.");
      }

      setTableLoading(false);
      return response;
    },
    [section, itemsPerPage, filters, sortBy, applySuppression],
  );

  const performSearch = useCallback(
    async (term: string): Promise<void> => {
      const trimmed = term.trim();

      if (!trimmed) {
        setCurrentSearchTerm("");
        await fetchRecords(1);
        return;
      }

      const cached = sectionSearchCache[getCacheKey(trimmed)];
      if (cached && Date.now() - cached.timestamp < CIRC_CACHE_TTL) {
        setRows(applySuppression(cached.results as SectionRow[S][]));
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
        setCurrentSearchTerm(trimmed);
        setCurrentPage(1);
        setTableLoading(false);
        return;
      }

      setCurrentSearchTerm(trimmed);
      await fetchRecords(1, { searchTerm: trimmed });
    },
    [getCacheKey, fetchRecords, itemsPerPage, applySuppression],
  );

  const handleSearchChange = useCallback(
    (value: string): void => {
      setSearch(value);
      const trimmed = value.trim();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (!trimmed) {
        setCurrentSearchTerm("");
        fetchRecords(1);
        return;
      }

      const cached = sectionSearchCache[getCacheKey(trimmed)];
      if (cached && Date.now() - cached.timestamp < CIRC_CACHE_TTL) {
        setRows(applySuppression(cached.results as SectionRow[S][]));
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
        setCurrentSearchTerm(trimmed);
        setCurrentPage(1);
        setTableLoading(false);
        return;
      }

      debounceTimerRef.current = setTimeout(
        () => performSearch(value),
        CIRC_DEBOUNCE_DELAY,
      );
    },
    [getCacheKey, fetchRecords, performSearch, itemsPerPage, applySuppression],
  );

  useEffect(() => {
    if (!currentSearchTerm || rows.length === 0 || tableLoading) return;
    sectionSearchCache[getCacheKey(currentSearchTerm)] = {
      results: rows,
      total: totalCount,
      hasMore,
      timestamp: Date.now(),
      loadedCount: rows.length,
    };
  }, [rows, totalCount, hasMore, currentSearchTerm, getCacheKey, tableLoading]);

  useEffect(() => {
    mountedRef.current = true;
    const init = async () => {
      try {
        const cached = sectionSearchCache[getCacheKey()];
        const useCache = !ALWAYS_FRESH_SECTIONS.includes(section);
        if (
          useCache &&
          cached &&
          Date.now() - cached.timestamp < CIRC_CACHE_TTL
        ) {
          setRows(applySuppression(cached.results as SectionRow[S][]));
          setTotalCount(cached.total);
          setHasMore(cached.hasMore);
          setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
          return;
        }
        const response = await fetchRecords(1);
        if (response) {
          sectionSearchCache[getCacheKey()] = {
            results: response.data || [],
            total: response.total || 0,
            hasMore: response.hasMore || false,
            timestamp: Date.now(),
            loadedCount: (response.data || []).length,
          };
        }
      } finally {
        initialLoadDone.current = true;
        if (mountedRef.current) setLoading(false);
      }
    };
    init();
    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    delete sectionSearchCache[getCacheKey(currentSearchTerm)];
    setCurrentPage(1);
    fetchRecords(1, { searchTerm: currentSearchTerm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, filters, sortBy, itemsPerPage]);

  const refresh = useCallback(async (): Promise<void> => {
    clearSectionSearchCache(section);
    setCurrentPage(1);
    await fetchRecords(1, { isRefresh: true, searchTerm: currentSearchTerm });
  }, [section, fetchRecords, currentSearchTerm]);

  const goToPage = useCallback(
    (page: number): void => {
      const target = Math.max(1, Math.min(totalPages, page));
      if (target === currentPage) return;
      setCurrentPage(target);
      fetchRecords(target, { searchTerm: currentSearchTerm });
    },
    [totalPages, currentPage, fetchRecords, currentSearchTerm],
  );

  const nextPage = useCallback(
    () => goToPage(currentPage + 1),
    [goToPage, currentPage],
  );
  const prevPage = useCallback(
    () => goToPage(currentPage - 1),
    [goToPage, currentPage],
  );

  const openFilter = useCallback(
    (open: boolean): void => {
      if (open) setPendingFilters(filters);
      setIsFilterOpen(open);
    },
    [filters],
  );

  const resetFilter = useCallback((): void => {
    setPendingFilters({ ...config.defaultFilters });
  }, [config]);

  const applyFilter = useCallback((): void => {
    setFilters(pendingFilters);
    setIsFilterOpen(false);
    setCurrentPage(1);
  }, [pendingFilters]);

  const openSort = useCallback(
    (open: boolean): void => {
      if (open) setPendingSort(sortBy);
      setIsSortOpen(open);
    },
    [sortBy],
  );

  const resetSort = useCallback((): void => {
    setPendingSort({ ...config.defaultSort });
  }, [config]);

  const applySort = useCallback((): void => {
    setSortBy(pendingSort);
    setIsSortOpen(false);
    setCurrentPage(1);
  }, [pendingSort]);

  return {
    section,
    loading,
    tableLoading,
    errorMessage,
    paginated: rows,
    totalCount,
    totalPages,
    hasMore,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    search,
    setSearch: handleSearchChange,
    filters,
    pendingFilters,
    setPendingFilters,
    isFilterOpen,
    openFilter,
    resetFilter,
    applyFilter,
    activeFilterCount: getActiveFilterCount(section, filters),
    sortBy,
    pendingSort,
    setPendingSort,
    isSortOpen,
    openSort,
    resetSort,
    applySort,
    activeSortCount: getActiveSortCount(section, sortBy),
    suppressRow,
  } as const;
}

export type CirculationRecordsHook<S extends CirculationSection> = ReturnType<
  typeof useCirculationRecords<S>
>;
