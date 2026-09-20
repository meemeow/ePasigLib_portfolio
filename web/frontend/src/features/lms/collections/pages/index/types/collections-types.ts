export type LibraryLocationMode = "All" | "PKC" | "Other";

export type CollectionStatusFilter = "All" | "Available" | "Archived";

export type DateInputFormat = "year" | "month" | "mm/yyyy" | "mm/dd/yyyy";

export type SortDirection = "asc" | "desc";

export type CollectionSortColumn =
  | "Relevance"
  | "CollectionTitle"
  | "MainAuthor"
  | "CreatedOn"
  | "ModifiedOn";

export interface CollectionSortState {
  column: CollectionSortColumn;
  direction: SortDirection;
}

export interface TableCollectionCopy {
  Accession: string;
  LibraryLocation: string;
}

export interface TableCollection {
  id: string;
  UID: string;
  CollectionTitle: string;
  SecondTitle: string;
  Edition: string;
  Volume: string;
  MainAuthor: string;
  CollectionImage: string;
  CallNumber: string;
  ClassCode: string;
  MaterialType: string;
  ISBN10: string;
  ISBN13: string;
  Description: string;
  Status: string;
  CreatedBy: string;
  LastModifiedBy: string;
  CreatedOn: number | null;
  ModifiedOn: number | null;
  Copies: TableCollectionCopy[];
  OtherCopies: TableCollectionCopy[];
}

export interface CollectionFiltersState {
  classCodes: string[];
  materialTypes: string[];
  libraryLocationMode: LibraryLocationMode;
  Status: CollectionStatusFilter;
  pubYearStart: string;
  pubYearEnd: string;
  copyrightStart: string;
  copyrightEnd: string;
  createdStartMonth: string;
  createdStartYear: string;
  createdEndMonth: string;
  createdEndYear: string;
}

export const defaultCollectionFilters: CollectionFiltersState = {
  classCodes: [],
  materialTypes: [],
  libraryLocationMode: "All",
  Status: "All",
  pubYearStart: "",
  pubYearEnd: "",
  copyrightStart: "",
  copyrightEnd: "",
  createdStartMonth: "",
  createdStartYear: "",
  createdEndMonth: "",
  createdEndYear: "",
};

export const defaultCollectionSort: CollectionSortState = {
  column: "CreatedOn",
  direction: "asc",
};

export interface CollectionDateFilters {
  dateInputFormat: DateInputFormat;
  pubYearStart: string;
  pubYearEnd: string;
  copyrightStart: string;
  copyrightEnd: string;
  createdStartMonth: string;
  createdStartYear: string;
  createdEndMonth: string;
  createdEndYear: string;
}

export interface CollectionFiltersPayload {
  status: CollectionStatusFilter;
  classCodes?: string[];
  materialTypes?: string[];
  libraryLocationMode: LibraryLocationMode;
  pubYearStart?: string;
  pubYearEnd?: string;
  copyrightStart?: string;
  copyrightEnd?: string;
  createdStartMonth?: string;
  createdStartYear?: string;
  createdEndMonth?: string;
  createdEndYear?: string;
}

export interface CollectionSortPayload {
  column: CollectionSortColumn;
  direction: SortDirection;
}

export type PageStep = { after: string } | { at: string };

export interface FetchCollectionsPayload {
  limit: number;
  page: number;
  filters: CollectionFiltersPayload;
  sortBy: CollectionSortPayload;
  ids?: string[];
  after?: string;
  at?: string;
}

export interface SearchCollectionsPayload {
  case: "searchCollections";
  searchTerm: string;
}

export interface CollectionPaginatedResponse {
  data: TableCollection[];
  page: number;
  totalPages: number;
  hasMore: boolean;
  total: number;
}

export interface ClassCodeMaterialTypesResponse {
  classCodes: string[];
  materialTypes: string[];
}

export interface LibraryLocationsResponse {
  libraryLocations: string[];
}

export interface CollectionSearchIdsResponse {
  ids: string[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
}
