export interface EditCollectionFormData {
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

export interface EditCollectionConstants {
	classCodes: string[];
	materialTypes: string[];
}

export interface CollectionCopyRecord {
	Accession: string;
	LibraryLocation: string;
	Section: string;
	Status: string;
	ClassCode: string;
	MaterialType: string;
}

export interface CollectionRecord {
	id: string;
	UID: string;
	Acquisition: string;
	Author: string;
	CallNumber: string;
	CollectionTitle: string;
	SecondTitle: string;
	Edition: string;
	Volume: string;
	MainAuthor: string;
	JointAuthor: string;
	ClassCode: string;
	MaterialType: string;
	ISBN: string;
	ISBN10: string;
	ISBN13: string;
	Description: string;
	TitleDescription: string;
	CostPrice: string;
	IncludesSummary: string;
	CuttersTable: string;
	DateReceived: string;
	Donor: string;
	Inclusion: string;
	PageCount: string;
	PrePage: string;
	PublicationDate: string;
	PublicationPlace: string;
	PublicationYear: string;
	CopyrightYear: string;
	Publisher: string;
	SeriesTitle: string;
	GeneralNote: string;
	Size: string;
	Status: string;
	CollectionImage: string;
	RelatedNames: string[];
	Subjects: string[];
	LastBorrowedDate: string;
	CreatedOn: number | null;
	ModifiedOn: number | null;
	CreatedBy: string;
	LastModifiedBy: string;
	Copies: CollectionCopyRecord[];
	OtherCopies: CollectionCopyRecord[];
}

export interface CollectionByIdPayload {
	id: string;
}

export interface EditCollectionPayload {
	case: "editCollectionInformation";
	targetUID: string;
	profileData: EditCollectionFormData;
}

export interface EditCollectionResult {
	status: "updated";
	case: "editCollectionInformation";
	success: boolean;
	updatedFields: string[];
}

export interface UpdateCollectionImagePayload {
	case: "updateCollectionImage";
	docId: string;
	imageUrl: string;
}

import { defaultCollectionImage } from "@/lib/collection-cover";

export { defaultCollectionImage };

export const initialFormData: EditCollectionFormData = {
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

