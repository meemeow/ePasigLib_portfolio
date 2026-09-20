export interface CollectionCopy {
	Availability: string;
	ForLibraryUse?: boolean;
}

export interface CollectionSummary {
	id: string;
	cover: string;
	title: string;
	author: string;
	description: string;
	classCode: string;
	format: string;
	publisher: string;
	year: string;
	subjects: string[];
	borrowCount: number;
	status: "Available" | "Archived";
	copies: CollectionCopy[];
	otherCopies: CollectionCopy[];
	CreatedOn?: number | null;
}

export interface ClassCodeMaterialTypes {
	classCodes: string[];
	materialTypes: string[];
}

export interface CollectionsResponse {
	collections: Array<{
		id: string;
		CollectionImage: string;
		MainAuthor: string;
		CollectionTitle: string;
		Description: string;
		ClassCode: string;
		MaterialType: string;
		Publisher: string;
		PublicationYear: string;
		CopyrightYear: string;
		Subjects: string[];
		BorrowCount: number;
		Status: string;
		Copies: CollectionCopy[];
		OtherCopies: CollectionCopy[];
		CreatedOn?: number | null;
	}>;
}

export type CollectionsSortColumn =
	| "Relevance"
	| "BorrowCount"
	| "CreatedOn"
	| "CollectionTitle"
	| "MainAuthor";

export interface CollectionsSortState {
	column: CollectionsSortColumn;
	direction: "asc" | "desc";
}

export const DEFAULT_SORT: CollectionsSortState = {
	column: "BorrowCount",
	direction: "desc",
};

export type AvailabilityFilter =
	| "all"
	| "available"
	| "availableSoon"
	| "allOut"
	| "libraryUse";

export type CollectionsViewMode = "grid" | "list";

export interface CollectionsFilters {
	format: string;
	year: string;
	availability: AvailabilityFilter;
}

export interface CollectionTabId {
	value: string;
	label: string;
	count: number;
}

export type CartStatus =
	| "ok"
	| "availableSoon"
	| "allOut"
	| "libraryUse"
	| "noCopies";

export const ALL_FACET = "ALL";

export const DEFAULT_FILTERS: CollectionsFilters = {
	format: ALL_FACET,
	year: ALL_FACET,
	availability: "all",
};
