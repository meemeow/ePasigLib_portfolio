export interface LocationCopy {
	branch: string;
	section?: string;
	callNumber?: string;
	copies: number;
	available: boolean;
	state: string;
	forLibraryUse: boolean;
}

export interface OtherCopy {
	branch: string;
	callNumber?: string;
	copiesAvailable: number;
	availability: string;
}

export interface CollectionDetail {
	id: string;
	cover: string;
	title: string;
	author: string;
	description: string;
	publisher: string;
	publicationYear: string;
	publicationPlace: string;
	copyrightYear: string;
	isbn10: string;
	isbn13: string;
	edition: string;
	volume: string;
	secondTitle: string;
	materialType: string;
	size: string;
	pageCount: string;
	includesSummary: string;
	classCode: string;
	callNumber: string;
	cuttersTable: string;
	subjects: string[];
	relatedNames: string[];
	locations: LocationCopy[];
	otherCopies: OtherCopy[];
	borrowCount?: number;
	status: string;
}

export interface RelatedCollectionsResponse {
	relatedByAuthor: Array<{
		id: string;
		CollectionImage: string;
		MainAuthor: string;
		CollectionTitle: string;
		Description: string;
		ClassCode: string;
		BorrowCount: number;
	}>;
	relatedByPublisher: Array<{
		id: string;
		CollectionImage: string;
		MainAuthor: string;
		CollectionTitle: string;
		Description: string;
		ClassCode: string;
		BorrowCount: number;
	}>;
}
