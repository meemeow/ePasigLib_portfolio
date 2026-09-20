import { cachedFetch } from '@/lib/fetching-data-cache';
import type { CollectionDetail, RelatedCollectionsResponse } from "@/features/opac/collections/types/collection-view-types";
import type { CollectionData } from "@/features/lms/collections/pages/view-collection/types/collections-view-types";

export async function fetchBookRecord(id: string): Promise<CollectionData | null> {
	const res = await cachedFetch("fetchBookById", { id });
	return (res?.book as CollectionData) || null;
}

export async function fetchBookById(id: string): Promise<CollectionDetail | null> {
	const res = await cachedFetch('fetchBookById', { id });
	const v = res?.book;
	if (!v) return null;
	const detail: CollectionDetail = {
		id: v.id,
		cover: v.CollectionImage || "",
		// Some catalogue records carry stray leading/trailing spaces.
		title: String(v.CollectionTitle || "").trim(),
		author: String(v.MainAuthor || "").trim(),
		description: v.Description || "",
		publisher: String(v.Publisher || "").trim(),
		publicationYear: v.PublicationYear || "",
		publicationPlace: v.PublicationPlace || "",
		copyrightYear: v.CopyrightYear || "",
		isbn10: v.ISBN10 || "",
		isbn13: v.ISBN13 || "",
		edition: v.Edition || "",
		volume: v.Volume || "",
		secondTitle: v.SecondTitle || "",
		materialType: v.MaterialType || "",
		size: v.Size || "",
		pageCount: v.PageCount || "",
		includesSummary: v.IncludesSummary || "",
		classCode: v.ClassCode || "",
		callNumber: v.CallNumber || "",
		cuttersTable: v.CuttersTable || "",
		status: v.Status === "Archived" ? "Archived" : "Available",
		subjects: Array.isArray(v.Subjects) ? v.Subjects : [],
		relatedNames: Array.isArray(v.RelatedNames) ? v.RelatedNames : [],
		locations: Array.isArray(v.Copies)
			? v.Copies.map((copy: any) => ({
					branch: copy.LibraryLocation,
					section: copy.Section || "",
					callNumber: copy.CallNumber || "",
					copies: 1,
					available: copy.Availability === "Available",
					state: String(copy.Availability || ""),
					forLibraryUse: !!copy.ForLibraryUse,
				}))
			: [],
		otherCopies: Array.isArray(v.OtherCopies)
			? v.OtherCopies.map((copy: any) => ({
					branch: copy.LibraryLocation,
					callNumber: copy.CallNumber || "",
					copiesAvailable: copy.CopiesAvailable || 0,
					availability: copy.Availability || "Available",
				}))
			: [],
		borrowCount: v.BorrowCount || 0,
	};
	return detail;
}

export async function fetchRelated(author: string, publisher: string, excludeId: string): Promise<RelatedCollectionsResponse> {
	const res = await cachedFetch('fetchRelatedBooks', { author, publisher, excludeId });
	return res as RelatedCollectionsResponse;
}
