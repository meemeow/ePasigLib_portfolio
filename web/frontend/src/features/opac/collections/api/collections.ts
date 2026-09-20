import { cachedFetch } from "@/lib/fetching-data-cache";
import { FUNCTIONS_REGION } from "@/lib/firebase";
import type {
	CollectionSummary,
	CartStatus,
	CollectionsResponse,
} from "@/features/opac/collections/types/collections-types";

const text = (value: unknown): string =>
	typeof value === "string" ? value.trim() : value == null ? "" : String(value);

function toMillis(value: unknown): number | null {
	if (typeof value === "number") return value;
	if (value && typeof value === "object") {
		const stamp = value as { seconds?: number; _seconds?: number };
		const seconds = stamp.seconds ?? stamp._seconds;
		if (typeof seconds === "number") return seconds * 1000;
	}
	const parsed = value ? Date.parse(String(value)) : NaN;
	return Number.isNaN(parsed) ? null : parsed;
}

const CATALOGUE_URL = import.meta.env.VITE_FIREBASE_PROJECT_ID
	? `https://${FUNCTIONS_REGION}-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/opacCatalogue`
	: "";

async function fetchCatalogueOverGet(): Promise<unknown[] | null> {
	if (!CATALOGUE_URL) return null;
	try {
		const res = await fetch(CATALOGUE_URL, { headers: { Accept: "application/json" } });
		if (!res.ok) return null;
		const body = await res.json();
		return Array.isArray(body?.collections) ? body.collections : null;
	} catch {
		return null;
	}
}

export async function fetchCollections(): Promise<CollectionSummary[]> {
	let collections = (await fetchCatalogueOverGet()) as
		| CollectionsResponse["collections"]
		| null;

	if (!collections) {
		const res: any = await cachedFetch("fetchBooksCollection");
		collections = (res?.collections || res) as CollectionsResponse["collections"];
	}

	return (Array.isArray(collections) ? collections : []).map((c: any) => ({
		id: c.id,
		cover: text(c.CollectionImage),
		title: text(c.CollectionTitle),
		author: text(c.MainAuthor),
		description: text(c.Description || c.TitleDescription),
		classCode: text(c.ClassCode),
		format: text(c.MaterialType),
		publisher: text(c.Publisher),
		year: text(c.PublicationYear) || text(c.CopyrightYear),
		subjects: Array.isArray(c.Subjects)
			? c.Subjects.map(text).filter(Boolean)
			: [],
		borrowCount: Number(c.BorrowCount || 0),
		status: c.Status === "Archived" ? "Archived" : "Available",
		copies: Array.isArray(c.Copies) ? c.Copies : [],
		otherCopies: Array.isArray(c.OtherCopies) ? c.OtherCopies : [],
		CreatedOn: toMillis(c.CreatedOn),
	}));
}

export async function fetchClassCodes(): Promise<string[]> {
	const res: any = await cachedFetch("fetchClassCodeMaterialTypes");
	return Array.isArray(res?.classCodes) ? res.classCodes : [];
}

export function hasLendableCopy(book: CollectionSummary): boolean {
	return Array.isArray(book.copies)
		? book.copies.some((c) => !c.ForLibraryUse)
		: false;
}

export function hasAvailableCopy(book: CollectionSummary): boolean {
	return Array.isArray(book.copies)
		? book.copies.some(
				(c) =>
					String(c.Availability || "").toLowerCase() === "available" &&
					!c.ForLibraryUse,
			)
		: false;
}

export function hasIncomingCopy(book: CollectionSummary): boolean {
	return Array.isArray(book.copies)
		? book.copies.some((c) => {
				const state = String(c.Availability || "").toLowerCase();
				return !c.ForLibraryUse && (state === "pending" || state === "reserved");
			})
		: false;
}

export function hasLibraryUseCopy(book: CollectionSummary): boolean {
	const available = (c: { Availability?: string }) =>
		String(c?.Availability || "").toLowerCase() === "available";
	return (
		(Array.isArray(book.copies) &&
			book.copies.some((c) => available(c) && Boolean(c.ForLibraryUse))) ||
		(Array.isArray(book.otherCopies) && book.otherCopies.some(available))
	);
}

export function cartStatusOf(book: CollectionSummary): CartStatus {
	const copies = Array.isArray(book.copies) ? book.copies : [];
	if (copies.length === 0) return "noCopies";
	if (!copies.some((copy) => !copy.ForLibraryUse)) return "libraryUse";
	if (hasAvailableCopy(book)) return "ok";
	return hasIncomingCopy(book) ? "availableSoon" : "allOut";
}

export function hasNoCopies(book: CollectionSummary): boolean {
	return (
		(!book.copies || book.copies.length === 0) &&
		(!book.otherCopies || book.otherCopies.length === 0)
	);
}

export interface SuggestionQuota {
	limit: number;
	windowDays: number;
	used: number;
	remaining: number;
	titles: string[];
}

export const EMPTY_QUOTA: SuggestionQuota = {
	limit: 3,
	windowDays: 7,
	used: 0,
	remaining: 3,
	titles: [],
};

export async function fetchSuggestionQuota(): Promise<SuggestionQuota> {
	const res: any = await cachedFetch("suggestionQuota");
	return {
		limit: Number(res?.limit ?? EMPTY_QUOTA.limit),
		windowDays: Number(res?.windowDays ?? EMPTY_QUOTA.windowDays),
		used: Number(res?.used ?? 0),
		remaining: Number(res?.remaining ?? EMPTY_QUOTA.limit),
		titles: Array.isArray(res?.titles) ? res.titles.map(text) : [],
	};
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

export interface GoogleBooksSearchResponse {
	status: "found" | "not-found" | "invalid";
	query: string;
	results: GoogleBooksVolume[];
}

export async function searchGoogleBooksByTitle(
	term: string,
): Promise<GoogleBooksSearchResponse> {
	const searchTerm = term.trim();
	if (searchTerm.length < 2) {
		return { status: "invalid", query: searchTerm, results: [] };
	}

	const res = await cachedFetch<GoogleBooksSearchResponse>(
		"searchGoogleBooksByTitle",
		{ searchTerm },
	);
	return {
		status: res?.status ?? "not-found",
		query: res?.query ?? searchTerm,
		results: Array.isArray(res?.results) ? res.results : [],
	};
}
