import { useEffect, useState, useCallback, useRef } from "react";
import { getBarangays } from "@/lib/constants/cities_barangays";
import type {
  TablePatron,
  Filters,
  SortState,
} from "@/features/lms/patrons/pages/index/types/patrons-types";
import { defaultFilters } from "@/features/lms/patrons/pages/index/types/patrons-types";
import {
  searchCache,
  CACHE_TTL,
  DEBOUNCE_DELAY,
} from "@/features/lms/patrons/pages/index/api/patrons-cache";
import {
  capitalize,
  formatTimestamp,
  buildFiltersPayload,
  buildSortPayload,
  getActiveFilterCount,
  getActiveSortCount,
} from "@/features/lms/patrons/pages/index/api/patrons-helpers";
import {
  fetchPatronsApi,
  searchPatronsApi,
  fetchUnverifiedCount,
  type PaginatedResponse,
  type FetchPatronsPayload,
} from "./patrons-api";

export function usePatronsPage() {
  const [loading, setLoading] = useState(true);
  const [patronLoading, setPatronLoading] = useState(false);
  const [patrons, setPatrons] = useState<TablePatron[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unverifiedCount, setUnverifiedCount] = useState(0);

  const [search, setSearch] = useState("");
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [lastSearchTerm, setLastSearchTerm] = useState("");

  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const [pendingFilters, setPendingFilters] = useState<Filters>({
    ...defaultFilters,
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [sortBy, setSortBy] = useState<SortState>({
    column: "CreatedOn",
    direction: "asc",
  });
  const [pendingSort, setPendingSort] = useState<SortState>({
    column: "CreatedOn",
    direction: "asc",
  });
  const [isSortPopoverOpen, setIsSortPopoverOpen] = useState(false);

  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pasigBarangays, setPasigBarangays] = useState<string[]>([]);

  const initialLoadDone = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCacheKey = useCallback(
    (
      searchTerm: string = "",
      filtersObj: Filters = filters,
      sortState: SortState = sortBy,
      perPage: number = itemsPerPage,
    ): string => {
      return `${searchTerm}_${JSON.stringify(filtersObj)}_${JSON.stringify(sortState)}_${perPage}`;
    },
    [filters, sortBy, itemsPerPage],
  );

  const fetchPatrons = useCallback(
    async (
      page: number,
      isRefresh = false,
    ): Promise<PaginatedResponse | undefined> => {
      setPatronLoading(true);
      const payload: FetchPatronsPayload = {
        limit: itemsPerPage,
        page: Math.max(1, page),
        filters: buildFiltersPayload(filters),
        sortBy: buildSortPayload(sortBy),
      };
      const response = await fetchPatronsApi(payload, isRefresh);
      if (response) {
        setPatrons(response.data || []);
        setTotalCount(response.total || 0);
        setTotalPages(
          response.totalPages ??
            Math.max(1, Math.ceil((response.total || 0) / itemsPerPage)),
        );
        setHasMore(response.hasMore || false);
        setCurrentPage(response.page ?? Math.max(1, page));
      }
      setPatronLoading(false);
      return response;
    },
    [itemsPerPage, filters, sortBy],
  );

  const searchPatrons = useCallback(
    async (searchTerm: string, page: number = 1): Promise<void> => {
      setPatronLoading(true);
      const trimmed = searchTerm.trim();
      const safePage = Math.max(1, page);

      const searchResponse = await searchPatronsApi(
        trimmed,
        itemsPerPage,
        safePage,
      );
      const ids = searchResponse?.ids || [];
      const total = searchResponse?.total || 0;
      const hasMoreResults = searchResponse?.hasMore || false;

      const payload: FetchPatronsPayload = {
        limit: itemsPerPage,
        page: 1,
        filters: buildFiltersPayload(filters),
        sortBy: buildSortPayload(sortBy),
      };
      if (ids.length > 0) payload.ids = ids;

      const patronResponse = await fetchPatronsApi(payload, true);
      if (patronResponse) {
        let filteredPatrons = patronResponse.data || [];
        if (ids.length > 0) {
          const idSet = new Set(ids);
          filteredPatrons = filteredPatrons.filter((p) => idSet.has(p.id));
          const orderedPatrons: TablePatron[] = [];
          for (const id of ids) {
            const found = filteredPatrons.find((p) => p.id === id);
            if (found) orderedPatrons.push(found);
          }
          setPatrons(orderedPatrons);
        } else {
          setPatrons(filteredPatrons);
        }
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
        setHasMore(hasMoreResults);
        setCurrentPage(safePage);
      }
      setPatronLoading(false);
    },
    [itemsPerPage, filters, sortBy],
  );

  const performSearch = useCallback(
    async (searchTerm: string): Promise<void> => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const trimmed = searchTerm.trim();

      if (trimmed !== lastSearchTerm) {
        setPatrons([]);
        setHasMore(false);
        setTotalCount(0);
        setTotalPages(1);
        setCurrentPage(1);
      }

      if (!trimmed) {
        setCurrentSearchTerm("");
        setLastSearchTerm("");
        await fetchPatrons(1);
        return;
      }

      const cacheKey = getCacheKey(trimmed);
      const cached = searchCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setPatrons(cached.results);
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
        setCurrentSearchTerm(trimmed);
        setLastSearchTerm(trimmed);
        setPatronLoading(false);
        return;
      }

      setCurrentSearchTerm(trimmed);
      setLastSearchTerm(trimmed);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      await searchPatrons(trimmed, 1);
    },
    [getCacheKey, lastSearchTerm, fetchPatrons, searchPatrons, itemsPerPage],
  );

  const handleSearchChange = useCallback(
    (value: string): void => {
      setSearch(value);
      const trimmed = value.trim();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (!trimmed) {
        setCurrentSearchTerm("");
        setLastSearchTerm("");
        fetchPatrons(1);
        setPatronLoading(false);
        return;
      }

      const cacheKey = getCacheKey(trimmed);
      const cached = searchCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setPatrons(cached.results);
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
        setCurrentSearchTerm(trimmed);
        setLastSearchTerm(trimmed);
        setPatronLoading(false);
        return;
      }

      debounceTimerRef.current = setTimeout(
        () => performSearch(value),
        DEBOUNCE_DELAY,
      );
    },
    [getCacheKey, fetchPatrons, performSearch, itemsPerPage],
  );

  useEffect(() => {
    if (currentSearchTerm && patrons.length > 0 && !patronLoading) {
      const cacheKey = getCacheKey(currentSearchTerm);
      searchCache[cacheKey] = {
        results: patrons,
        total: totalCount,
        hasMore: hasMore,
        timestamp: Date.now(),
        loadedCount: patrons.length,
      };
    }
  }, [
    patrons,
    totalCount,
    hasMore,
    currentSearchTerm,
    getCacheKey,
    patronLoading,
  ]);

  useEffect(() => {
    let mounted = true;
    const init = async (): Promise<void> => {
      try {
        const cacheKey = getCacheKey();
        const cached = searchCache[cacheKey];

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setPatrons(cached.results);
          setTotalCount(cached.total);
          setHasMore(cached.hasMore);
          setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
          setLoading(false);
          if (mounted) {
            const brgys = await getBarangays("City of Pasig");
            setPasigBarangays(brgys);
          }
          initialLoadDone.current = true;
          return;
        }

        setLoading(true);
        const response = await fetchPatrons(1);
        if (response) {
          const newCacheKey = getCacheKey();
          searchCache[newCacheKey] = {
            results: response.data || [],
            total: response.total || 0,
            hasMore: response.hasMore || false,
            timestamp: Date.now(),
            loadedCount: (response.data || []).length,
          };
        }

        if (mounted) {
          const brgys = await getBarangays("City of Pasig");
          setPasigBarangays(brgys);
        }

        const count = await fetchUnverifiedCount();
        setUnverifiedCount(count);
        initialLoadDone.current = true;
      } catch (error) {
        console.error("Failed to initialize patrons page:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) {
      const cacheKey = getCacheKey(currentSearchTerm);
      delete searchCache[cacheKey];
      setCurrentPage(1);
      if (currentSearchTerm) performSearch(currentSearchTerm);
      else fetchPatrons(1);
    }
  }, [filters, sortBy, itemsPerPage]);

  const refreshUnverifiedCount = useCallback(async (): Promise<void> => {
    try {
      const count = await fetchUnverifiedCount();
      setUnverifiedCount(count);
    } catch (error) {
      console.warn("Failed to refresh unverified count:", error);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setCurrentPage(1);
    const cacheKey = getCacheKey(currentSearchTerm);
    delete searchCache[cacheKey];
    if (currentSearchTerm) await performSearch(currentSearchTerm);
    else await fetchPatrons(1, true);
  }, [fetchPatrons, performSearch, currentSearchTerm, getCacheKey]);

  const goToPage = useCallback(
    (page: number): void => {
      const p = Math.max(1, Math.min(totalPages, page));
      if (p === currentPage) return;
      setCurrentPage(p);
      if (currentSearchTerm) {
        searchPatrons(currentSearchTerm, p);
      } else {
        fetchPatrons(p);
      }
    },
    [
      totalPages,
      fetchPatrons,
      currentSearchTerm,
      searchPatrons,
      currentPage,
    ],
  );

  const nextPage = useCallback((): void => {
    if (currentPage < totalPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      if (currentSearchTerm) {
        searchPatrons(currentSearchTerm, next);
      } else {
        fetchPatrons(next);
      }
    }
  }, [
    currentPage,
    totalPages,
    hasMore,
    fetchPatrons,
    currentSearchTerm,
    searchPatrons,
  ]);

  const prevPage = useCallback((): void => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      if (currentSearchTerm) {
        searchPatrons(currentSearchTerm, prev);
      } else {
        fetchPatrons(prev);
      }
    }
  }, [currentPage, fetchPatrons, currentSearchTerm, searchPatrons]);

  const handleOpenPopover = useCallback(
    (open: boolean): void => {
      if (!open) setPendingFilters(filters);
      setIsPopoverOpen(open);
    },
    [filters],
  );

  const handleResetFilters = useCallback((): void => {
    setPendingFilters({ ...defaultFilters });
  }, []);

  const handleSetFilter = useCallback((): void => {
    setFilters(pendingFilters);
    setIsPopoverOpen(false);
    setCurrentPage(1);
  }, [pendingFilters]);

  const openSort = useCallback(
    (open: boolean): void => {
      if (!open) setPendingSort(sortBy);
      setIsSortPopoverOpen(open);
    },
    [sortBy],
  );

  const applySort = useCallback((): void => {
    setSortBy(pendingSort);
    setIsSortPopoverOpen(false);
    setCurrentPage(1);
  }, [pendingSort]);

  return {
    loading,
    patronLoading,
    paginated: patrons,
    totalPages,
    totalCount,
    hasMore,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    filters,
    setFilters,
    pendingFilters,
    setPendingFilters,
    isPopoverOpen,
    handleOpenPopover,
    handleResetFilters,
    handleSetFilter,
    sortBy,
    setSortBy,
    pendingSort,
    setPendingSort,
    isSortPopoverOpen,
    openSort,
    applySort,
    search,
    setSearch: handleSearchChange,
    pasigBarangays,
    unverifiedCount,
    refreshUnverifiedCount,
    capitalize,
    formatTimestamp,
    activeFilterCount: getActiveFilterCount(filters),
    activeSortCount: getActiveSortCount(sortBy),
  };
}
