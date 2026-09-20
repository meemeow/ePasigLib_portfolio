import { useEffect, useState, useCallback, useRef } from "react";
import type {
  TableStaff,
  StaffFilters,
  StaffSortState,
  StaffPaginatedResponse,
  FetchStaffsPayload,
} from "@/features/lms/staffs/pages/index/types/staffs-types";
import { defaultStaffFilters } from "@/features/lms/staffs/pages/index/types/staffs-types";
import {
  staffSearchCache,
  STAFF_CACHE_TTL,
  STAFF_DEBOUNCE_DELAY,
} from "./staffs-cache";
import {
  capitalize,
  buildStaffFiltersPayload,
  buildStaffSortPayload,
  getActiveStaffFilterCount,
  getActiveStaffSortCount,
} from "./staffs-helpers";
import {
  fetchStaffsApi,
  searchStaffsApi,
} from "./staffs-api";

export function useStaffsPage() {
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffs, setStaffs] = useState<TableStaff[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState("");
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [lastSearchTerm, setLastSearchTerm] = useState("");

  const [filters, setFilters] = useState<StaffFilters>({ ...defaultStaffFilters });
  const [pendingFilters, setPendingFilters] = useState<StaffFilters>({
    ...defaultStaffFilters,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [sortBy, setSortBy] = useState<StaffSortState>({
    column: "staffCode",
    direction: "asc",
  });
  const [pendingSort, setPendingSort] = useState<StaffSortState>({
    column: "staffCode",
    direction: "asc",
  });
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const initialLoadDone = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCacheKey = useCallback(
    (
      searchTerm: string = "",
      filtersObj: StaffFilters = filters,
      sortState: StaffSortState = sortBy,
      perPage: number = itemsPerPage,
    ): string => {
      return `${searchTerm}_${JSON.stringify(filtersObj)}_${JSON.stringify(sortState)}_${perPage}`;
    },
    [filters, sortBy, itemsPerPage],
  );

  const fetchStaffs = useCallback(
    async (page: number, isRefresh = false): Promise<StaffPaginatedResponse | undefined> => {
      setStaffLoading(true);
      const payload: FetchStaffsPayload = {
        limit: itemsPerPage,
        page: Math.max(1, page),
        filters: buildStaffFiltersPayload(filters),
        sortBy: buildStaffSortPayload(sortBy),
      };
      const response = await fetchStaffsApi(payload, isRefresh);
      if (response) {
        setStaffs(response.data || []);
        setTotalCount(response.total || 0);
        setTotalPages(
          response.totalPages ??
            Math.max(1, Math.ceil((response.total || 0) / itemsPerPage)),
        );
        setHasMore(response.hasMore || false);
        setCurrentPage(response.page ?? Math.max(1, page));
      }
      setStaffLoading(false);
      return response;
    },
    [itemsPerPage, filters, sortBy],
  );

  const searchStaffs = useCallback(
    async (searchTerm: string, page: number = 1): Promise<void> => {
      setStaffLoading(true);
      const trimmed = searchTerm.trim();
      const safePage = Math.max(1, page);

      const searchResponse = await searchStaffsApi(trimmed, itemsPerPage, safePage);
      const ids = searchResponse?.ids || [];
      const total = searchResponse?.total || 0;
      const hasMoreResults = searchResponse?.hasMore || false;

      const payload: FetchStaffsPayload = {
        limit: itemsPerPage,
        page: 1,
        filters: buildStaffFiltersPayload(filters),
        sortBy: buildStaffSortPayload(sortBy),
      };
      if (ids.length > 0) payload.ids = ids;

      const staffResponse = await fetchStaffsApi(payload, true);
      if (staffResponse) {
        let filteredStaffs = staffResponse.data || [];
        if (ids.length > 0) {
          const idSet = new Set(ids);
          filteredStaffs = filteredStaffs.filter((s) => idSet.has(s.id));
          const orderedStaffs: TableStaff[] = [];
          for (const id of ids) {
            const found = filteredStaffs.find((s) => s.id === id);
            if (found) orderedStaffs.push(found);
          }
          setStaffs(orderedStaffs);
        } else {
          setStaffs(filteredStaffs);
        }
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
        setHasMore(hasMoreResults);
        setCurrentPage(safePage);
      }
      setStaffLoading(false);
    },
    [itemsPerPage, filters, sortBy],
  );

  const performSearch = useCallback(
    async (searchTerm: string): Promise<void> => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const trimmed = searchTerm.trim();

      if (trimmed !== lastSearchTerm) {
        setStaffs([]);
        setHasMore(false);
        setTotalCount(0);
        setTotalPages(1);
        setCurrentPage(1);
      }

      if (!trimmed) {
        setCurrentSearchTerm("");
        setLastSearchTerm("");
        await fetchStaffs(1);
        return;
      }

      const cacheKey = getCacheKey(trimmed);
      const cached = staffSearchCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < STAFF_CACHE_TTL) {
        setStaffs(cached.results);
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
        setCurrentSearchTerm(trimmed);
        setLastSearchTerm(trimmed);
        setStaffLoading(false);
        return;
      }

      setCurrentSearchTerm(trimmed);
      setLastSearchTerm(trimmed);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      await searchStaffs(trimmed, 1);
    },
    [getCacheKey, lastSearchTerm, fetchStaffs, searchStaffs, itemsPerPage],
  );

  const handleSearchChange = useCallback(
    (value: string): void => {
      setSearch(value);
      const trimmed = value.trim();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (!trimmed) {
        setCurrentSearchTerm("");
        setLastSearchTerm("");
        fetchStaffs(1);
        setStaffLoading(false);
        return;
      }

      const cacheKey = getCacheKey(trimmed);
      const cached = staffSearchCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < STAFF_CACHE_TTL) {
        setStaffs(cached.results);
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
        setCurrentSearchTerm(trimmed);
        setLastSearchTerm(trimmed);
        setStaffLoading(false);
        return;
      }

      debounceTimerRef.current = setTimeout(() => performSearch(value), STAFF_DEBOUNCE_DELAY);
    },
    [getCacheKey, fetchStaffs, performSearch, itemsPerPage],
  );

  useEffect(() => {
    if (currentSearchTerm && staffs.length > 0 && !staffLoading) {
      const cacheKey = getCacheKey(currentSearchTerm);
      staffSearchCache[cacheKey] = {
        results: staffs,
        total: totalCount,
        hasMore: hasMore,
        timestamp: Date.now(),
        loadedCount: staffs.length,
      };
    }
  }, [staffs, totalCount, hasMore, currentSearchTerm, getCacheKey, staffLoading]);

  useEffect(() => {
    let mounted = true;
    const init = async (): Promise<void> => {
      try {
        const cacheKey = getCacheKey();
        const cached = staffSearchCache[cacheKey];

        if (cached && Date.now() - cached.timestamp < STAFF_CACHE_TTL) {
          setStaffs(cached.results);
          setTotalCount(cached.total);
          setHasMore(cached.hasMore);
          setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
          setLoading(false);
          initialLoadDone.current = true;
          return;
        }

        setLoading(true);
        const response = await fetchStaffs(1);
        if (response) {
          const newCacheKey = getCacheKey();
          staffSearchCache[newCacheKey] = {
            results: response.data || [],
            total: response.total || 0,
            hasMore: response.hasMore || false,
            timestamp: Date.now(),
            loadedCount: (response.data || []).length,
          };
        }
        initialLoadDone.current = true;
      } catch (error) {
        console.error("Failed to initialize staffs page:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) {
      const cacheKey = getCacheKey(currentSearchTerm);
      delete staffSearchCache[cacheKey];
      setCurrentPage(1);
      if (currentSearchTerm) performSearch(currentSearchTerm);
      else fetchStaffs(1);
    }
  }, [filters, sortBy, itemsPerPage]);

  const refresh = useCallback(async (): Promise<void> => {
    setCurrentPage(1);
    const cacheKey = getCacheKey(currentSearchTerm);
    delete staffSearchCache[cacheKey];
    if (currentSearchTerm) await performSearch(currentSearchTerm);
    else await fetchStaffs(1, true);
  }, [fetchStaffs, performSearch, currentSearchTerm, getCacheKey]);

  const goToPage = useCallback(
    (page: number): void => {
      const p = Math.max(1, Math.min(totalPages, page));
      if (p === currentPage) return;
      setCurrentPage(p);
      if (currentSearchTerm) {
        searchStaffs(currentSearchTerm, p);
      } else {
        fetchStaffs(p);
      }
    },
    [totalPages, fetchStaffs, currentSearchTerm, searchStaffs, currentPage],
  );

  const nextPage = useCallback((): void => {
    if (currentPage < totalPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      if (currentSearchTerm) {
        searchStaffs(currentSearchTerm, next);
      } else {
        fetchStaffs(next);
      }
    }
  }, [currentPage, totalPages, fetchStaffs, currentSearchTerm, searchStaffs]);

  const prevPage = useCallback((): void => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      if (currentSearchTerm) {
        searchStaffs(currentSearchTerm, prev);
      } else {
        fetchStaffs(prev);
      }
    }
  }, [currentPage, fetchStaffs, currentSearchTerm, searchStaffs]);

  const openFilter = useCallback((open: boolean): void => {
    if (!open) setPendingFilters(filters);
    setIsFilterOpen(open);
  }, [filters]);

  const resetFilter = useCallback((): void => {
    setPendingFilters({ ...defaultStaffFilters });
  }, []);

  const applyFilter = useCallback((): void => {
    setFilters(pendingFilters);
    setIsFilterOpen(false);
    setCurrentPage(1);
  }, [pendingFilters]);

  const openSort = useCallback((open: boolean): void => {
    if (!open) setPendingSort(sortBy);
    setIsSortOpen(open);
  }, [sortBy]);

  const resetSort = useCallback((): void => {
    setPendingSort({ column: "staffCode", direction: "asc" });
  }, []);

  const applySort = useCallback((): void => {
    setSortBy(pendingSort);
    setIsSortOpen(false);
    setCurrentPage(1);
  }, [pendingSort]);

  return {
    loading,
    staffLoading,
    paginated: staffs,
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
    isFilterOpen,
    openFilter,
    resetFilter,
    applyFilter,
    sortBy,
    setSortBy,
    pendingSort,
    setPendingSort,
    isSortOpen,
    openSort,
    resetSort,
    applySort,
    search,
    setSearch: handleSearchChange,
    capitalize,
    activeFilterCount: getActiveStaffFilterCount(filters),
    activeSortCount: getActiveStaffSortCount(sortBy),
  };
}
