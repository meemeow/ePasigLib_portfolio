export interface CollectionFormData {
	CollectionTitle: string;
	SecondTitle: string;
	TitleDescription: string;
	MainAuthor: string;
	JointAuthor: string;
	Author: string;
	Description: string;
	ClassCode: string;
	CallNumber: string;
	CuttersTable: string;
	Subjects: string | string[];
	Publisher: string;
	PublicationPlace: string;
	PublicationYear: string;
	CopyrightYear: string;
	SeriesTitle?: string;
	GeneralNote?: string;
	Size: string;
	Inclusion: string;
	DateReceived: string;
	Acquisition: string;
	CostPrice: string;
	Donor: string;
	ISBN13: string;
	ISBN10: string;
	Edition: string;
	Volume: string;
	MaterialType: string;
	PageCount: string;
	PrePage: string;
	CollectionImage: string;
	RelatedNames?: string[];
}

export interface RegisterConstants {
	classCodes: string[];
	materialTypes: string[];
}

export interface GoogleBooksVolume {
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
}

export type GoogleBooksLookupStatus = "found" | "not-found" | "invalid";

export interface GoogleBooksLookupResponse {
	status: GoogleBooksLookupStatus;
	isbn: string;
	volume: GoogleBooksVolume | null;
}

export interface AddCollectionPayload extends CollectionFormData {
	case: "addCollectionRecord";
}

export interface AddCollectionResult {
	success: boolean;
	id: string;
	UID: string;
	CreatedBy: string | null;
}

export interface UpdateCollectionImagePayload {
	case: "updateCollectionImage";
	docId: string;
	imageUrl: string;
}

export interface SearchGoogleBooksPayload {
	case: "searchGoogleBooks";
	searchTerm: string;
}

export type IsbnLookupState =
	| "idle"
	| "typing"
	| "searching"
	| "found"
	| "not-found"
	| "invalid"
	| "error";

import { defaultCollectionImage } from "@/lib/collection-cover";

export { defaultCollectionImage };

export const initialFormData: CollectionFormData = {
	CollectionTitle: "",
	SecondTitle: "",
	TitleDescription: "",
	MainAuthor: "",
	JointAuthor: "",
	Author: "",
	Description: "",
	ClassCode: "",
	CallNumber: "",
	CuttersTable: "",
	Subjects: "",
	Publisher: "",
	PublicationPlace: "",
	PublicationYear: "",
	SeriesTitle: "",
	GeneralNote: "",
	CopyrightYear: "",
	Size: "",
	Inclusion: "",
	DateReceived: "",
	Acquisition: "",
	CostPrice: "",
	Donor: "",
	ISBN13: "",
	ISBN10: "",
	Edition: "",
	Volume: "",
	MaterialType: "",
	PageCount: "",
	PrePage: "",
	CollectionImage: defaultCollectionImage,
	RelatedNames: [],
};

