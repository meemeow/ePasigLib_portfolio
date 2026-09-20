import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import {
	fetchClassCodes,
	fetchCollections,
	hasAvailableCopy,
	hasLibraryUseCopy,
	hasLendableCopy,
	hasIncomingCopy,
} from "@/features/opac/collections/api/collections";
import type { SortOption } from "@/components/ui/SortPopover";
import {
	ALL_FACET,
	DEFAULT_FILTERS,
	DEFAULT_SORT,
	type CollectionSummary,
	type CollectionTabId,
	type CollectionsFilters,
	type CollectionsSortState,
	type CollectionsViewMode,
} from "@/features/opac/collections/types/collections-types";

export const BOOKS_PER_PAGE = 10;

export const PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];

export const FEATURED = "featured";
export const ALL_COLLECTIONS = "all_collections";

const FEATURED_PER_SHELF = 10;

const NEW_ARRIVALS = 10;

const SEARCH_DEBOUNCE = 300;

export const SORT_OPTIONS: SortOption[] = [
	{ id: "BorrowCount", label: "Most Borrowed" },
	{ id: "CreatedOn", label: "Date Added" },
	{ id: "CollectionTitle", label: "Title" },
	{ id: "MainAuthor", label: "Author" },
];

export const SEARCH_SORT_OPTIONS: SortOption[] = [
	{ id: "Relevance", label: "Best match" },
	...SORT_OPTIONS,
];

const cache: {
	books: CollectionSummary[] | null;
	classCodes: string[] | null;
	collection: string | null;
	page: number | null;
	search: string | null;
	view: CollectionsViewMode | null;
} = {
	books: null,
	classCodes: null,
	collection: null,
	page: null,
	search: null,
	view: null,
};

const slug = (code: string) => code.toLowerCase().replace(/\s+/g, "_");

function isArchived(book: any): boolean {
	if (!book) return false;
	if (book.isArchived || book.is_archived || book.IS_ARCHIVED) return true;
	const status = book.Status ?? book.status ?? null;
	if (typeof status === "string")
		return status.trim().toLowerCase() === "archived";
	if (typeof status === "boolean") return status;
	if (typeof status === "number") return status === 1;
	return false;
}

function matchesAvailability(
	book: CollectionSummary,
	filter: CollectionsFilters["availability"],
) {
	switch (filter) {
		case "available":
			return hasAvailableCopy(book);
		case "availableSoon":
			return (
				hasLendableCopy(book) &&
				!hasAvailableCopy(book) &&
				hasIncomingCopy(book)
			);
		case "allOut":
			return (
				hasLendableCopy(book) &&
				!hasAvailableCopy(book) &&
				!hasIncomingCopy(book)
			);
		case "libraryUse":
			return hasLibraryUseCopy(book);
		default:
			return true;
	}
}

function facetValues(books: CollectionSummary[], key: "format" | "year"): string[] {
	const values = new Set<string>();
	for (const book of books) {
		const value = book[key];
		if (value) values.add(value);
	}
	const list = [...values];
	return key === "year"
		? list.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
		: list.sort((a, b) => a.localeCompare(b));
}

function sortBooks(books: CollectionSummary[], sort: CollectionsSortState): CollectionSummary[] {
	if (sort.column === "Relevance") return books;

	const flip = sort.direction === "asc" ? -1 : 1;
	const sorted = [...books];

	switch (sort.column) {
		case "CreatedOn":
			return sorted.sort(
				(a, b) =>
					flip * ((b.CreatedOn ?? -Infinity) - (a.CreatedOn ?? -Infinity)),
			);
		case "CollectionTitle":
			return sorted.sort((a, b) => -flip * a.title.localeCompare(b.title));
		case "MainAuthor":
			return sorted.sort((a, b) => -flip * a.author.localeCompare(b.author));
		default:
			return sorted.sort((a, b) => flip * (b.borrowCount - a.borrowCount));
	}
}

const isDefaultSort = (sort: CollectionsSortState): boolean =>
	sort.column === DEFAULT_SORT.column &&
	sort.direction === DEFAULT_SORT.direction;

const sortForSearch = (sort: CollectionsSortState): CollectionsSortState =>
	isDefaultSort(sort) ? { column: "Relevance", direction: "desc" } : sort;

function featuredBooks(books: CollectionSummary[]): CollectionSummary[] {
	const mostBorrowed = sortBooks(books, {
		column: "BorrowCount",
		direction: "desc",
	}).slice(0, FEATURED_PER_SHELF);
	const newest = sortBooks(books, {
		column: "CreatedOn",
		direction: "desc",
	}).slice(0, FEATURED_PER_SHELF);
	const seen = new Set<string>();
	return [...mostBorrowed, ...newest].filter((book) => {
		if (seen.has(book.id)) return false;
		seen.add(book.id);
		return true;
	});
}

export function useCollectionsBrowser() {
	const [books, setBooks] = useState<CollectionSummary[]>(() => cache.books || []);
	const [classCodes, setClassCodes] = useState<string[]>(
		() => cache.classCodes || [],
	);
	const [loading, setLoading] = useState(!cache.books);

	const [collection, setCollection] = useState(() => cache.collection || FEATURED);
	const [searchInput, setSearchInput] = useState(() => cache.search || "");
	const [search, setSearch] = useState(() => cache.search || "");
	const [view, setView] = useState<CollectionsViewMode>(() => cache.view || "grid");
	const [page, setPage] = useState(() => cache.page || 1);
	const [perPage, setPerPage] = useState(BOOKS_PER_PAGE);

	const [filters, setFilters] = useState<CollectionsFilters>(DEFAULT_FILTERS);
	const [pendingFilters, setPendingFilters] =
		useState<CollectionsFilters>(DEFAULT_FILTERS);
	const [filterOpen, setFilterOpen] = useState(false);

	const [sort, setSort] = useState<CollectionsSortState>(DEFAULT_SORT);
	const [pendingSort, setPendingSort] = useState<CollectionsSortState>(DEFAULT_SORT);
	const [sortOpen, setSortOpen] = useState(false);

	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [pinnedId, setPinnedId] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const data = await fetchCollections();
				if (cancelled) return;
				setBooks(data);
				cache.books = data;
			} catch (error) {
				console.error("Failed to load the catalogue:", error);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (cache.classCodes) return;
		fetchClassCodes()
			.then((codes) => {
				setClassCodes(codes || []);
				cache.classCodes = codes || [];
			})
			.catch((error) => console.error("Failed to load class codes:", error));
	}, []);

	useEffect(() => {
		cache.collection = collection;
	}, [collection]);
	useEffect(() => {
		cache.page = page;
	}, [page]);
	useEffect(() => {
		cache.search = search;
	}, [search]);
	useEffect(() => {
		cache.view = view;
	}, [view]);

	const shelved = useMemo(
		() => books.filter((book) => !isArchived(book)),
		[books],
	);

	const tabs = useMemo<CollectionTabId[]>(() => {
		const byCode = new Map<string, number>();
		for (const book of shelved) {
			const key = slug(book.classCode);
			byCode.set(key, (byCode.get(key) ?? 0) + 1);
		}
		return [
			{
				value: FEATURED,
				label: "Featured",
				count: featuredBooks(shelved).length,
			},
			{
				value: ALL_COLLECTIONS,
				label: "All Books",
				count: shelved.length,
			},
			...classCodes.map((code) => ({
				value: slug(code),
				label: code,
				count: byCode.get(slug(code)) ?? 0,
			})),
		];
	}, [classCodes, shelved]);

	const fuse = useMemo(
		() =>
			new Fuse(shelved, {
				keys: [
					{ name: "title", weight: 0.45 },
					{ name: "author", weight: 0.25 },
					{ name: "subjects", weight: 0.18 },
					{ name: "description", weight: 0.12 },
				],
				threshold: 0.4,
				minMatchCharLength: 2,
			}),
		[shelved],
	);

	const searching = search.trim().length > 1;

	const shelf = useMemo(() => {
		const term = search.trim();
		if (term.length > 1) return fuse.search(term).map((hit) => hit.item);
		if (collection === FEATURED) return featuredBooks(shelved);
		if (collection === ALL_COLLECTIONS) return shelved;
		return shelved.filter((book) => slug(book.classCode) === collection);
	}, [search, fuse, collection, shelved]);

	const facets = useMemo(
		() => ({
			formats: facetValues(shelf, "format"),
			years: facetValues(shelf, "year"),
		}),
		[shelf],
	);

	const effectiveSort = useMemo(
		() => (searching ? sortForSearch(sort) : sort),
		[searching, sort],
	);

	const results = useMemo(() => {
		const filtered = shelf.filter(
			(book) =>
				(filters.format === ALL_FACET || book.format === filters.format) &&
				(filters.year === ALL_FACET || book.year === filters.year) &&
				matchesAvailability(book, filters.availability),
		);
		return sortBooks(filtered, effectiveSort);
	}, [shelf, filters, effectiveSort]);

	const totalPages = Math.max(1, Math.ceil(results.length / perPage));
	const currentPage = Math.min(page, totalPages);
	const startIndex = (currentPage - 1) * perPage;
	const pageBooks = results.slice(startIndex, startIndex + perPage);

	const previewId = hoveredId ?? pinnedId;
	const preview = useMemo(
		() => results.find((book) => book.id === previewId) || null,
		[results, previewId],
	);

	const activeFilterCount =
		(filters.format === ALL_FACET ? 0 : 1) +
		(filters.year === ALL_FACET ? 0 : 1) +
		(filters.availability === "all" ? 0 : 1);

	const activeSortCount =
		(sort.column === DEFAULT_SORT.column ? 0 : 1) +
		(sort.direction === DEFAULT_SORT.direction ? 0 : 1);

	const clearPreview = () => {
		setHoveredId(null);
		setPinnedId(null);
	};

	const goToCollection = (value: string) => {
		setCollection(value);
		setPage(1);
		clearPreview();
		setSearch("");
		setSearchInput("");
	};

	const runSearch = (term: string) => {
		const next = term.trim();
		setSearch(next);
		setPage(1);
		clearPreview();
		if (next.length > 1) setCollection(ALL_COLLECTIONS);
	};

	const searchRef = useRef(search);
	searchRef.current = search;
	useEffect(() => {
		const term = searchInput.trim();
		if (term === searchRef.current) return;
		if (!term) {
			runSearch("");
			return;
		}
		const timer = setTimeout(() => runSearch(term), SEARCH_DEBOUNCE);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchInput]);

	const clearSearch = () => setSearchInput("");

	const updateFilters = (next: CollectionsFilters) => {
		setFilters(next);
		setPendingFilters(next);
		setPage(1);
	};

	const setFacet = (key: "format" | "year", value: string) =>
		updateFilters({ ...filters, [key]: value });

	const openFilters = (open: boolean) => {
		if (open) setPendingFilters(filters);
		setFilterOpen(open);
	};

	const applyFilters = () => {
		updateFilters(pendingFilters);
		setFilterOpen(false);
	};

	const resetFilters = () => {
		updateFilters(DEFAULT_FILTERS);
		setFilterOpen(false);
	};

	const openSort = (open: boolean) => {
		if (open) setPendingSort(effectiveSort);
		setSortOpen(open);
	};

	const applySort = () => {
		setSort(pendingSort);
		setPage(1);
		setSortOpen(false);
	};

	const resetSort = () => setPendingSort(DEFAULT_SORT);

	const changePerPage = (next: number) => {
		setPerPage(next);
		setPage(1);
	};

	const perPageOptions = useMemo(() => {
		const total = results.length;
		const below = PER_PAGE_OPTIONS.filter((size) => size < total);
		const covering =
			PER_PAGE_OPTIONS.find((size) => size >= total) ??
			PER_PAGE_OPTIONS[PER_PAGE_OPTIONS.length - 1];
		return [...new Set([...below, covering, perPage])].sort((a, b) => a - b);
	}, [results.length, perPage]);

	const borrowRanks = useMemo(() => {
		const ranks = new Map<string, number>();
		shelved
			.filter((book) => book.borrowCount > 0)
			.sort((a, b) => b.borrowCount - a.borrowCount)
			.slice(0, 20)
			.forEach((book, index) => ranks.set(book.id, index + 1));
		return ranks;
	}, [shelved]);

	const newIds = useMemo(() => {
		return new Set(
			shelved
				.filter((book) => book.CreatedOn)
				.sort((a, b) => (b.CreatedOn ?? 0) - (a.CreatedOn ?? 0))
				.slice(0, NEW_ARRIVALS)
				.map((book) => book.id),
		);
	}, [shelved]);

	const heading = useMemo(() => {
		const term = search.trim();
		if (term.length > 1) return `RESULTS FOR "${term.toUpperCase()}"`;
		if (collection === FEATURED) return "FEATURED COLLECTIONS";
		if (collection === ALL_COLLECTIONS) return "ALL BOOKS";
		const tab = tabs.find((entry) => entry.value === collection);
		return (tab?.label || "COLLECTIONS").toUpperCase();
	}, [search, collection, tabs]);

	return {
		loading,
		tabs,
		collection,
		goToCollection,

		searchInput,
		setSearchInput,
		search,
		searching,
		clearSearch,

		filters,
		setFacet,
		pendingFilters,
		setPendingFilters,
		filterOpen,
		openFilters,
		applyFilters,
		resetFilters,
		activeFilterCount,
		facets,

		sort,
		pendingSort,
		setPendingSort,
		sortOpen,
		openSort,
		applySort,
		resetSort,
		activeSortCount,

		view,
		setView,

		heading,
		borrowRank: (id: string) => borrowRanks.get(id) ?? null,
		isNew: (id: string) => newIds.has(id),
		results,
		pageBooks,
		totalCount: results.length,
		startIndex,
		currentPage,
		totalPages,
		setPage,
		perPage,
		perPageOptions,
		changePerPage,

		preview,
		previewId,
		pinnedId,
		hover: setHoveredId,
		pin: (id: string) =>
			setPinnedId((current) => (current === id ? null : id)),
		clearPreview,
	};
}

export type CollectionsBrowser = ReturnType<typeof useCollectionsBrowser>;
