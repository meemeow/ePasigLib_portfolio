import { toMillis } from "../../../core/time";

// ==========================================
// || TYPES FOR PAGINATED PATRON FETCHING ||
// ==========================================

export interface PatronFilters {
  residency: "All" | "Pasig Resident" | "Non-Pasig Resident";
  barangay?: string;
  state: string[];
  status: "All" | "Active" | "Archived";
  ageRange: "All" | "Under 18" | "18-25" | "26-40" | "41-60" | "60+";
}

export interface PatronSort {
  column: "PatronUID" | "LastName" | "FirstName" | "Email" | "CreatedOn" | "LastBorrowedDate";
  direction: "asc" | "desc";
}

export interface PatronDataPaginatedRequest extends PagedRequest {
  searchTerm?: string;
  filters?: PatronFilters;
  sortBy?: PatronSort;
  ids?: string[];
}

export type PatronDataPaginatedResponse = PagedResponse<TablePatron>;

// ==========================================
// || TABLE-ONLY PATRON FIELDS             ||
// ==========================================

export interface TablePatron {
  id: string;
  PublicUID: string;
  UID: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
  Email: string;
  State: string;
  Barangay: string;
  SchoolWork: string;
  Status: string;
  LastBorrowedDate: number | null;
}

// ==========================================
// || FIREBASE DATA TYPE                  ||
// ==========================================

export interface FirestorePatronData {
  PublicUID?: string;
  UID?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Suffix?: string;
  Email?: string;
  State?: string;
  Barangay?: string;
  SchoolWork?: string;
  Status?: string;
  LastBorrowedDate?: FirebaseFirestore.Timestamp | Date | number | string | null;
  CreatedOn?: FirebaseFirestore.Timestamp | Date | number | string | null;
  [key: string]: unknown;
}

// ==========================================
// || HELPER FUNCTIONS                    ||
// ==========================================

export function mapPatronForTable(doc: FirebaseFirestore.DocumentSnapshot): TablePatron {
  const data = doc.data() as FirestorePatronData;
  return {
    id: doc.id,
    PublicUID: data.PublicUID || "-",
    UID: data.UID || "",
    FirstName: data.FirstName || "",
    MiddleName: data.MiddleName || "",
    LastName: data.LastName || "",
    Suffix: data.Suffix || "",
    Email: data.Email || "",
    State: data.State || "",
    Barangay: data.Barangay || "",
    SchoolWork: data.SchoolWork || "",
    Status: data.Status || "",
    LastBorrowedDate: toMillis(data.LastBorrowedDate) || null,
  };
}

export function getSortField(column: string): string {
  const fieldMap: Record<string, string> = {
    "PatronUID": "UID",
    "LastName": "LastName",
    "FirstName": "FirstName",
    "Email": "Email",
    "CreatedOn": "CreatedOn",
    "LastBorrowedDate": "LastBorrowedDate"
  };
  return fieldMap[column] || "LastName";
}

export function getSortDirection(direction: "asc" | "desc"): "asc" | "desc" {
  return direction === "desc" ? "desc" : "asc";
}


// ==========================================
// || TYPES FOR PAGINATED STAFF FETCHING   ||
// ==========================================

export interface StaffFilters {
  positions: string[];
  roles: string[];
  status: "All" | "Active" | "Archived";
}

export interface StaffSort {
  column: "staffCode" | "lastName" | "firstName" | "email";
  direction: "asc" | "desc";
}

export interface StaffDataPaginatedRequest extends PagedRequest {
  searchTerm?: string;
  filters?: StaffFilters;
  sortBy?: StaffSort;
  ids?: string[];
}

export type StaffDataPaginatedResponse = PagedResponse<TableStaff>;

export interface TableStaff {
  id: string;
  StaffCode: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
  Email: string;
  JobTitle: string;
  Status: string;
  CatalogingAdd: boolean;
  CatalogingEdit: boolean;
  CatalogingArchive: boolean;
  StaffEdit: boolean;
  StaffAdd: boolean;
  StaffArchive: boolean;
  PatronAdd: boolean;
  PatronEdit: boolean;
  PatronArchive: boolean;
  VerifyIDs: boolean;
  Checkin: boolean;
  Checkout: boolean;
  ApproveRenewals: boolean;
  AnnouncementCreation: boolean;
  ReportGeneration: boolean;
  LiveChat: boolean;
}

// ==========================================
// || HELPER FUNCTIONS FOR STAFF           ||
// ==========================================

export function mapStaffForTable(doc: FirebaseFirestore.DocumentSnapshot): TableStaff {
  const data = doc.data() as any;
  return {
    id: doc.id,
    StaffCode: data.StaffCode || "",
    FirstName: data.FirstName || "",
    MiddleName: data.MiddleName || "",
    LastName: data.LastName || "",
    Suffix: data.Suffix || "",
    Email: data.Email || "",
    JobTitle: data.JobTitle || data.Position || "",
    Status: data.Status || "",
    CatalogingAdd: !!data.CatalogingAdd,
    CatalogingEdit: !!data.CatalogingEdit,
    CatalogingArchive: !!data.CatalogingArchive,
    StaffEdit: !!data.StaffEdit,
    StaffAdd: !!data.StaffAdd,
    StaffArchive: !!data.StaffArchive,
    PatronAdd: !!data.PatronAdd,
    PatronEdit: !!data.PatronEdit,
    PatronArchive: !!data.PatronArchive,
    VerifyIDs: !!data.VerifyIDs,
    Checkin: !!data.Checkin,
    Checkout: !!data.Checkout,
    ApproveRenewals: !!data.ApproveRenewals,
    AnnouncementCreation: !!data.AnnouncementCreation,
    ReportGeneration: !!data.ReportGeneration,
    LiveChat: !!data.LiveChat,
  };
}

export function getStaffSortField(column: string): string {
  const fieldMap: Record<string, string> = {
    "staffCode": "StaffCode",
    "lastName": "LastName",
    "firstName": "FirstName",
    "email": "Email"
  };
  return fieldMap[column] || "LastName";
}

export function getStaffSortDirection(direction: "asc" | "desc"): "asc" | "desc" {
  return direction === "desc" ? "desc" : "asc";
}

export interface StaffLogEntry {
  Action: string;
  TargetName: string;
  Description: string;
  On: number | null;
  By: string;
  id?: string;
  CreatedBy?: string;
  CreatedOn?: number | null;
  ModifiedBy?: string;
  ModifiedOn?: number | null;
  ArchivedBy?: string;
  ArchivedOn?: number | null;
  UnarchivedBy?: string;
  UnarchivedOn?: number | null;
  EditedBy?: string;
  EditedOn?: number | null;
  ProcessedBy?: string;
  ProcessedOn?: number | null;
  UID?: string;
  TargetUID?: string;
}

export interface StaffLogsResponse {
  modificationLogs: StaffLogEntry[];
}

export interface PatronLogEntry {
  Action: string;
  TargetName: string;
  Description: string;
  On: number | null;
  By: string;
  id?: string;
}

export interface PatronCheckoutEntry {
  id?: string;
  Accession: string;
  CollectionTitle: string;
  ProcessedBy: string;
  ProcessedOn: number | null;
  DueDate: number | null;
  TargetUID: string;
  Status: string;
}

export interface PatronCheckinEntry {
  id?: string;
  Accession: string;
  CollectionTitle: string;
  ProcessedBy: string;
  ProcessedOn: number | null;
  TargetUID: string;
  Violations: string | string[];
}

export interface PatronLogsResponse {
  modificationLogs: PatronLogEntry[];
  checkoutHistory: PatronCheckoutEntry[];
  checkinHistory: PatronCheckinEntry[];
}

export interface PagedResponse<T> {
  data: T[];
  page: number;
  totalPages: number;
  hasMore: boolean;
  total: number;
}

export interface PagedRequest {
  limit: number;
  page?: number;
}
// ==============================
// || Collection Fetch Types   ||
// ==============================

export interface CollectionCopy {
  Accession: string;
  LibraryLocation: string;
  Section: string;
  CreatedBy: string;
  CreatedOn: number | null;
  LastModifiedBy: string;
  ModifiedOn: number | null;
  LastBorrowedBy: string;
  LastBorrowedDate: number | null;
  ForLibraryUse: boolean;
  Availability: string;
}

export interface CollectionOtherCopy {
  CallNumber: string;
  LibraryLocation: string;
  CreatedBy: string;
  CreatedOn: number | null;
  ModifiedBy: string;
  ModifiedOn: number | null;
  CopiesAvailable: number;
  Availability: string;
}

export interface OpacCopy {
  Availability: string;
  ForLibraryUse: boolean;
}

export interface OpacCollection {
  id: string;
  CollectionTitle: string;
  MainAuthor: string;
  CollectionImage: string;
  Description: string;
  ClassCode: string;
  MaterialType: string;
  Publisher: string;
  PublicationYear: string;
  CopyrightYear: string;
  Subjects: string[];
  BorrowCount: number;
  Status: string;
  CreatedOn: number | null;
  Copies: OpacCopy[];
  OtherCopies: OpacCopy[];
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
  BorrowCount: number;
  LastBorrowedDate: string;
  CreatedOn: number | null;
  ModifiedOn: number | null;
  CreatedBy: string;
  LastModifiedBy: string;
  Copies: CollectionCopy[];
  OtherCopies: CollectionOtherCopy[];
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

export interface CollectionCard {
  id: string;
  CollectionTitle: string;
  CollectionImage: string;
  MainAuthor: string;
  Description?: string;
  ClassCode?: string;
  BorrowCount?: number;
  IsArchived?: boolean;
}

export type CollectionLibraryLocationMode = "All" | "PKC" | "Other";

export interface CollectionFilters {
  status?: string;
  classCodes?: string[];
  materialTypes?: string[];
  libraryLocationMode?: CollectionLibraryLocationMode;
  pubYearStart?: string;
  pubYearEnd?: string;
  copyrightStart?: string;
  copyrightEnd?: string;
  createdStartMonth?: string;
  createdStartYear?: string;
  createdEndMonth?: string;
  createdEndYear?: string;
}

export type CollectionSortColumn =
  | "CollectionTitle"
  | "MainAuthor"
  | "CreatedOn"
  | "ModifiedOn"
  | "Relevance";

export interface CollectionSort {
  column: CollectionSortColumn;
  direction: "asc" | "desc";
}

export interface CollectionDataPaginatedRequest extends PagedRequest {
  filters?: CollectionFilters;
  sortBy?: CollectionSort;
  ids?: string[];
  after?: string;
  at?: string;
}

export type CollectionDataPaginatedResponse = PagedResponse<TableCollection>;

export interface CollectionLogEntry {
  Action: string;
  TargetName: string;
  Description: string;
  On: number | null;
  By: string;
  id?: string;
  CreatedBy?: string;
  CreatedOn?: number | null;
  ModifiedBy?: string;
  ModifiedOn?: number | null;
  ArchivedBy?: string;
  ArchivedOn?: number | null;
  UnarchivedBy?: string;
  UnarchivedOn?: number | null;
  ProcessedBy?: string;
  ProcessedOn?: number | null;
  UID?: string;
  TargetUID?: string;
}

export interface CollectionCheckoutEntry {
  id: string;
  Accession: string;
  FullName: string;
  CheckedOutBy: string;
  CheckoutDate: number | null;
  DueDate: number | null;
  ReturnStatus: string;
}

export interface CollectionCheckinEntry {
  id: string;
  Accession: string;
  FullName: string;
  CheckedInBy: string;
  CheckInDate: number | null;
  Violations: string;
}

export interface CollectionLogsResponse {
  modificationLogs: CollectionLogEntry[];
  checkoutHistory: CollectionCheckoutEntry[];
  checkinHistory: CollectionCheckinEntry[];
}

export interface ClassCodeMaterialTypes {
  classCodes: string[];
  materialTypes: string[];
}

export interface LibraryLocationsResponse {
  libraryLocations: string[];
}

export interface SectionsResponse {
  sections: string[];
}

export type RemovalTarget =
  | "classCodes"
  | "materialTypes"
  | "libraryLocations"
  | "sections";

export interface RemovalBlocker {
  value: string;
  blocking: Array<{ id: string; title: string }>;
}

export interface RemovalAvailabilityResponse {
  blocked: RemovalBlocker[];
}

export interface RelatedCollectionsResponse {
  relatedByAuthor: CollectionCard[];
  relatedByPublisher: CollectionCard[];
}

const COLLECTION_SORT_FIELDS: Record<string, string> = {
  CollectionTitle: "CollectionTitle",
  MainAuthor: "MainAuthor",
  CreatedOn: "CreatedOn",
  ModifiedOn: "ModifiedOn",
};

export function getCollectionSortField(column: string): string {
  return COLLECTION_SORT_FIELDS[column] || "CreatedOn";
}

export function getCollectionSortDirection(
  direction: "asc" | "desc",
): "asc" | "desc" {
  return direction === "desc" ? "desc" : "asc";
}
