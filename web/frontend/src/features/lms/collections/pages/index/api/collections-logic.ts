import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cachedFetch } from "@/lib/fetching-data-cache";
import { useAuth } from "@/lib/auth/use-auth";
import type {
  ClassCodeMaterialTypesResponse,
  CollectionDateFilters,
  CollectionFiltersState,
  CollectionSortState,
  DateInputFormat,
  FetchCollectionsPayload,
  LibraryLocationsResponse,
  PageStep,
  TableCollection,
} from "@/features/lms/collections/pages/index/types/collections-types";
import {
  defaultCollectionFilters,
  defaultCollectionSort,
} from "@/features/lms/collections/pages/index/types/collections-types";
import {
  CACHE_TTL,
  DEBOUNCE_DELAY,
  searchCache,
} from "@/features/lms/collections/pages/index/api/collections-cache";
import {
  buildFiltersPayload,
  buildSortPayload,
  formatTimestamp,
  getActiveFilterCount,
  getActiveSortCount,
  searchSortOf,
  toDateFilters,
} from "@/features/lms/collections/pages/index/api/collections-helpers";
import {
  fetchCollectionsApi,
  searchCollectionsApi,
} from "@/features/lms/collections/pages/index/api/collections-api";
import { invalidateCollectionCaches } from "@/features/lms/collections/collection-cache";
import { callArchiveRecord as archiveCallable } from "@/lib/api/callables";

export function useCollectionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userType, staffRoles, user } = useAuth();

  const canAdd = userType === "Staff" && !!staffRoles?.CatalogingAdd;
  const canEdit = userType === "Staff" && !!staffRoles?.CatalogingEdit;
  const canArchive = userType === "Staff" && !!staffRoles?.CatalogingArchive;
  const canConfigureClassCodeMaterialTypes =
    userType === "Staff" &&
    !!(staffRoles?.StaffAdd || staffRoles?.StaffArchive || staffRoles?.StaffEdit);

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [collections, setCollections] = useState<TableCollection[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState("");
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [lastSearchTerm, setLastSearchTerm] = useState("");

  const [filters, setFilters] = useState<CollectionFiltersState>({
    ...defaultCollectionFilters,
  });
  const [pendingFilters, setPendingFilters] = useState<CollectionFiltersState>({
    ...defaultCollectionFilters,
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [sortBy, setSortBy] = useState<CollectionSortState>({
    ...defaultCollectionSort,
  });
  const [pendingSort, setPendingSort] = useState<CollectionSortState>({
    ...defaultCollectionSort,
  });
  const [isSortPopoverOpen, setIsSortPopoverOpen] = useState(false);

  const [dateInputFormat] = useState<DateInputFormat>("year");
  const [pendingDateFilters, setPendingDateFilters] =
    useState<CollectionDateFilters>(
      toDateFilters(defaultCollectionFilters, "year"),
    );

  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [classCodes, setClassCodes] = useState<string[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [libraryLocations, setLibraryLocations] = useState<string[]>([]);
  const [showClassCodeMaterialTypesModal, setShowClassCodeMaterialTypesModal] =
    useState(false);

  const [selectedCollections, setSelectedCollections] = useState<
    Map<string, TableCollection>
  >(new Map());
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveConfirmChecked, setArchiveConfirmChecked] = useState(false);
  const [archiveAction, setArchiveAction] = useState<"archive" | "unarchive">(
    "archive",
  );
  const [collectionToArchive, setCollectionToArchive] =
    useState<TableCollection | null>(null);
  const [archiveProcessing, setArchiveProcessing] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const initialLoadDone = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageStartsRef = useRef<{ signature: string; starts: Map<number, string> }>({
    signature: "",
    starts: new Map(),
  });

  const getCacheKey = useCallback(
    (
      searchTerm: string = "",
      filtersObj: CollectionFiltersState = filters,
      sortState: CollectionSortState = sortBy,
      perPage: number = itemsPerPage,
    ): string =>
      `${searchTerm}_${JSON.stringify(filtersObj)}_${JSON.stringify(sortState)}_${perPage}`,
    [filters, sortBy, itemsPerPage],
  );

  const fetchCollections = useCallback(
    async (page: number, isRefresh = false, step?: PageStep) => {
      setTableLoading(true);

      const signature = getCacheKey("");
      if (pageStartsRef.current.signature !== signature) {
        pageStartsRef.current = { signature, starts: new Map() };
      }

      const payload: FetchCollectionsPayload = {
        limit: itemsPerPage,
        page: Math.max(1, page),
        filters: buildFiltersPayload(filters),
        sortBy: buildSortPayload(sortBy),
        ...(step ?? {}),
      };
      const response = await fetchCollectionsApi(payload, isRefresh);
      if (response) {
        setCollections(response.data || []);
        setTotalCount(response.total || 0);
        setTotalPages(
          response.totalPages ??
            Math.max(1, Math.ceil((response.total || 0) / itemsPerPage)),
        );
        setHasMore(response.hasMore || false);
        const served = response.page ?? Math.max(1, page);
        setCurrentPage(served);

        const first = response.data?.[0];
        if (first?.id) pageStartsRef.current.starts.set(served, first.id);
      }
      setTableLoading(false);
      return response;
    },
    [itemsPerPage, filters, sortBy, getCacheKey],
  );

  const searchCollections = useCallback(
    async (searchTerm: string, page: number = 1): Promise<void> => {
      setTableLoading(true);
      const trimmed = searchTerm.trim();
      const safePage = Math.max(1, page);

      const searchResponse = await searchCollectionsApi(trimmed);
      const ids = searchResponse?.ids || [];

      if (ids.length === 0) {
        setCollections([]);
        setTotalCount(0);
        setTotalPages(1);
        setHasMore(false);
        setCurrentPage(1);
        setTableLoading(false);
        return;
      }

      const payload: FetchCollectionsPayload = {
        limit: itemsPerPage,
        page: safePage,
        filters: buildFiltersPayload(filters),
        sortBy: buildSortPayload(searchSortOf(sortBy)),
        ids,
      };

      const response = await fetchCollectionsApi(payload, true);
      if (response) {
        setCollections(response.data || []);
        setTotalCount(response.total || 0);
        setTotalPages(
          response.totalPages ??
            Math.max(1, Math.ceil((response.total || 0) / itemsPerPage)),
        );
        setHasMore(response.hasMore || false);
        setCurrentPage(response.page ?? safePage);
      }
      setTableLoading(false);
    },
    [itemsPerPage, filters, sortBy],
  );

  const performSearch = useCallback(
    async (searchTerm: string): Promise<void> => {
      const trimmed = searchTerm.trim();

      if (trimmed !== lastSearchTerm) {
        setCollections([]);
        setHasMore(false);
        setTotalCount(0);
        setTotalPages(1);
        setCurrentPage(1);
      }

      if (!trimmed) {
        setCurrentSearchTerm("");
        setLastSearchTerm("");
        await fetchCollections(1);
        return;
      }

      const cached = searchCache[getCacheKey(trimmed)];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setCollections(cached.results);
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
        setCurrentSearchTerm(trimmed);
        setLastSearchTerm(trimmed);
        setTableLoading(false);
        return;
      }

      setCurrentSearchTerm(trimmed);
      setLastSearchTerm(trimmed);
      await searchCollections(trimmed, 1);
    },
    [
      getCacheKey,
      lastSearchTerm,
      fetchCollections,
      searchCollections,
      itemsPerPage,
    ],
  );

  const handleSearchChange = useCallback(
    (value: string): void => {
      setSearch(value);
      const trimmed = value.trim();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (!trimmed) {
        setCurrentSearchTerm("");
        setLastSearchTerm("");
        fetchCollections(1);
        return;
      }

      const cached = searchCache[getCacheKey(trimmed)];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setCollections(cached.results);
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
        setCurrentSearchTerm(trimmed);
        setLastSearchTerm(trimmed);
        setTableLoading(false);
        return;
      }

      debounceTimerRef.current = setTimeout(
        () => performSearch(value),
        DEBOUNCE_DELAY,
      );
    },
    [getCacheKey, fetchCollections, performSearch, itemsPerPage],
  );

  useEffect(() => {
    if (currentSearchTerm && collections.length > 0 && !tableLoading) {
      searchCache[getCacheKey(currentSearchTerm)] = {
        results: collections,
        total: totalCount,
        hasMore,
        timestamp: Date.now(),
        loadedCount: collections.length,
      };
    }
  }, [
    collections,
    totalCount,
    hasMore,
    currentSearchTerm,
    getCacheKey,
    tableLoading,
  ]);

  useEffect(() => {
    const init = async (): Promise<void> => {
      try {
        const cached = searchCache[getCacheKey()];
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setCollections(cached.results);
          setTotalCount(cached.total);
          setHasMore(cached.hasMore);
          setTotalPages(Math.ceil(cached.total / itemsPerPage) || 1);
          setLoading(false);
          initialLoadDone.current = true;
          return;
        }

        setLoading(true);
        const response = await fetchCollections(1);
        if (response) {
          searchCache[getCacheKey()] = {
            results: response.data || [],
            total: response.total || 0,
            hasMore: response.hasMore || false,
            timestamp: Date.now(),
            loadedCount: (response.data || []).length,
          };
        }
        initialLoadDone.current = true;
      } catch (error) {
        console.error("Failed to initialize collections page:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    delete searchCache[getCacheKey(currentSearchTerm)];
    setCurrentPage(1);
    if (currentSearchTerm) performSearch(currentSearchTerm);
    else fetchCollections(1);
  }, [filters, sortBy, itemsPerPage]);

  useEffect(() => {
    const fetchConstants = async (): Promise<void> => {
      try {
        const patronUID = user?.uid;
        const [ccmt, locations] = await Promise.all([
          cachedFetch<ClassCodeMaterialTypesResponse>(
            "fetchClassCodeMaterialTypes",
            { patronUID },
          ),
          cachedFetch<LibraryLocationsResponse>("fetchLibraryLocations", {
            patronUID,
          }),
        ]);
        setClassCodes(Array.isArray(ccmt?.classCodes) ? ccmt.classCodes : []);
        setMaterialTypes(
          Array.isArray(ccmt?.materialTypes) ? ccmt.materialTypes : [],
        );
        setLibraryLocations(
          Array.isArray(locations?.libraryLocations)
            ? locations.libraryLocations
            : [],
        );
      } catch (error) {
        console.error("Failed to load constants:", error);
      }
    };
    fetchConstants();
  }, [user]);

  useEffect(() => {
    const searchParam = new URLSearchParams(location.search).get("search");
    if (searchParam) handleSearchChange(searchParam);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setCurrentPage(1);
    delete searchCache[getCacheKey(currentSearchTerm)];
    if (currentSearchTerm) await performSearch(currentSearchTerm);
    else await fetchCollections(1, true);
  }, [fetchCollections, performSearch, currentSearchTerm, getCacheKey]);

  useEffect(() => {
    const state = location.state as { refresh?: boolean } | null;
    if (state?.refresh) {
      refresh();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.key]);

  const goToPage = useCallback(
    (page: number, step?: PageStep): void => {
      const target = Math.max(1, Math.min(totalPages, page));
      if (target === currentPage) return;
      setCurrentPage(target);
      if (currentSearchTerm) searchCollections(currentSearchTerm, target);
      else fetchCollections(target, false, step);
    },
    [
      totalPages,
      currentPage,
      fetchCollections,
      searchCollections,
      currentSearchTerm,
    ],
  );

  const nextPage = useCallback((): void => {
    if (currentPage >= totalPages) return;
    const last = collections[collections.length - 1];
    goToPage(currentPage + 1, last?.id ? { after: last.id } : undefined);
  }, [currentPage, totalPages, goToPage, collections]);

  const prevPage = useCallback((): void => {
    if (currentPage <= 1) return;
    const target = currentPage - 1;
    const start = pageStartsRef.current.starts.get(target);
    goToPage(target, start ? { at: start } : undefined);
  }, [currentPage, goToPage]);

  const handleOpenPopover = useCallback(
    (open: boolean): void => {
      if (open) {
        setPendingFilters(filters);
        setPendingDateFilters(toDateFilters(filters, dateInputFormat));
      }
      setIsPopoverOpen(open);
    },
    [filters, dateInputFormat],
  );

  const handleResetFilters = useCallback((): void => {
    setPendingFilters({ ...defaultCollectionFilters });
    setPendingDateFilters(toDateFilters(defaultCollectionFilters, dateInputFormat));
  }, [dateInputFormat]);

  const handleSetFilter = useCallback((): void => {
    setFilters({
      ...pendingFilters,
      pubYearStart: pendingDateFilters.pubYearStart,
      pubYearEnd: pendingDateFilters.pubYearEnd,
      copyrightStart: pendingDateFilters.copyrightStart,
      copyrightEnd: pendingDateFilters.copyrightEnd,
      createdStartMonth: pendingDateFilters.createdStartMonth,
      createdStartYear: pendingDateFilters.createdStartYear,
      createdEndMonth: pendingDateFilters.createdEndMonth,
      createdEndYear: pendingDateFilters.createdEndYear,
    });
    setIsPopoverOpen(false);
    setCurrentPage(1);
  }, [pendingFilters, pendingDateFilters]);

  const openSort = useCallback(
    (open: boolean): void => {
      if (open) setPendingSort(sortBy);
      setIsSortPopoverOpen(open);
    },
    [sortBy],
  );

  const applySort = useCallback((): void => {
    setSortBy(pendingSort);
    setIsSortPopoverOpen(false);
    setCurrentPage(1);
  }, [pendingSort]);

  const resetSort = useCallback((): void => {
    setPendingSort({ ...defaultCollectionSort });
  }, []);

  const handleCheckboxChange = useCallback(
    (id: string): void => {
      setSelectedCollections((prev) => {
        const next = new Map(prev);
        if (next.has(id)) {
          next.delete(id);
          return next;
        }
        const found = collections.find((collection) => collection.id === id);
        if (found) next.set(id, found);
        return next;
      });
    },
    [collections],
  );

  const handleSelectAll = useCallback((): void => {
    setSelectedCollections((prev) => {
      const allSelected = collections.every((collection) =>
        prev.has(collection.id),
      );
      const next = new Map(prev);
      collections.forEach((collection) => {
        if (allSelected) next.delete(collection.id);
        else next.set(collection.id, collection);
      });
      return next;
    });
  }, [collections]);

  const handleArchiveToggleClick = useCallback(
    (collection: TableCollection): void => {
      setCollectionToArchive(collection);
      setArchiveAction(
        collection.Status.trim() === "Archived" ? "unarchive" : "archive",
      );
      setArchiveConfirmChecked(false);
      setShowArchiveModal(true);
    },
    [],
  );

  const confirmArchiveToggle = useCallback(async (): Promise<void> => {
    if (!collectionToArchive) return;
    setModalMessage(null);
    setArchiveProcessing(true);
    try {
            await archiveCallable({
        case: "collectionArchiveUnarchive",
        action: archiveAction,
        targetUID: collectionToArchive.UID,
      });

      invalidateCollectionCaches();

      setModalMessage(
        archiveAction === "archive"
          ? "Collection archived successfully."
          : "Collection unarchived successfully.",
      );
      setShowArchiveModal(false);
      setArchiveConfirmChecked(false);
      await refresh();
    } catch (error) {
      console.error("Archive/unarchive failed:", error);
      setModalMessage(
        error instanceof Error && error.message
          ? error.message
          : "Failed to process archive/unarchive.",
      );
    } finally {
      setArchiveProcessing(false);
    }
  }, [collectionToArchive, archiveAction, refresh]);

  const selectedCollectionIds = useMemo(
    () => new Set(selectedCollections.keys()),
    [selectedCollections],
  );

  const handleNavigateToView = (id: string) =>
    navigate(`/lms/collections/view/${id}`);
  const handleNavigateToEdit = (id: string) =>
    navigate(`/lms/collections/edit/${id}`, { state: { from: "list" } });
  const handleNavigateToAdd = () => navigate("/lms/collections/register");

  return {
    canAdd,
    canEdit,
    canArchive,
    canConfigureClassCodeMaterialTypes,

    loading,
    tableLoading,
    paginated: collections,
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
    isPopoverOpen,
    handleOpenPopover,
    handleResetFilters,
    handleSetFilter,
    activeFilterCount: getActiveFilterCount(filters),

    sortBy,
    pendingSort,
    setPendingSort,
    isSortPopoverOpen,
    openSort,
    applySort,
    resetSort,
    activeSortCount: getActiveSortCount(sortBy),

    dateInputFormat,
    pendingDateFilters,
    setPendingDateFilters,

    classCodes,
    materialTypes,
    libraryLocations,
    setClassCodes,
    setMaterialTypes,
    showClassCodeMaterialTypesModal,
    setShowClassCodeMaterialTypesModal,
    handleOpenClassCodeMaterialTypesModal: () =>
      setShowClassCodeMaterialTypesModal(true),

    selectedCollections,
    selectedCollectionIds,
    handleCheckboxChange,
    handleSelectAll,
    showBarcodeModal,
    setShowBarcodeModal,
    handlePrintBarcodes: () => setShowBarcodeModal(true),

    showArchiveModal,
    setShowArchiveModal,
    archiveConfirmChecked,
    setArchiveConfirmChecked,
    archiveAction,
    collectionToArchive,
    handleArchiveToggleClick,
    confirmArchiveToggle,
    archiveProcessing,

    modalMessage,
    setModalMessage,

    formatTimestamp,
    handleNavigateToView,
    handleNavigateToEdit,
    handleNavigateToAdd,
  } as const;
}
