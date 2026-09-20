export type CirculationSection =
  | "checkoutHistory"
  | "checkinHistory"
  | "reservationHistory"
  | "renewalHistory"
  | "reservationApproval";

export type SortDirection = "asc" | "desc";

export interface CirculationBookRef {
  BookID: string;
  Accession: string;
  CollectionTitle: string;
  MainAuthor?: string;
}

export interface CirculationHistoryRow {
  id: string;
  Type: string;
  TargetUID: string;
  TargetPublicUID: string;
  TargetName: string;
  CollectionTitle: string;
  Accession: string;
  ProcessedBy: string;
  ProcessedByUID: string;
  ProcessedByCode: string;
  ProcessedOn: number | null;
  DueDate: number | null;
  NewDueDate: number | null;
  CheckinDate: number | null;
  Purpose: string;
  Status: string;
  Violations: string;
  Remarks: string;
  Books: CirculationBookRef[];
  HasRenewed: boolean;
  DaysOfExtension: number | null;
}

export interface ReservationApprovalRow {
  id: string;
  PatronUID: string;
  PatronPublicUID: string;
  PatronName: string;
  Purpose: string;
  RequestedOn: number | null;
  ExpiresAt: number | null;
  Books: CirculationBookRef[];
  BookCount: number;
  Status: string;
}

export interface SectionRow {
  checkoutHistory: CirculationHistoryRow;
  checkinHistory: CirculationHistoryRow;
  reservationHistory: CirculationHistoryRow;
  renewalHistory: CirculationHistoryRow;
  reservationApproval: ReservationApprovalRow;
}

export interface DateRangeFilter {
  dateField: string;
  dateFrom: string;
  dateTo: string;
}

export interface SectionFilters {
  checkoutHistory: DateRangeFilter & {
    status: string[];
    overdueOnly: boolean;
  };
  checkinHistory: DateRangeFilter & {
    violations: "All" | "None" | "Any";
  };
  reservationHistory: DateRangeFilter & {
    status: string[];
    hasMultipleBooks: boolean;
  };
  renewalHistory: DateRangeFilter & {
    requestedDays: number[];
  };
  reservationApproval: DateRangeFilter & {
    hasMultipleBooks: boolean;
  };
}

export interface SectionSortColumn {
  checkoutHistory:
    | "processedOn"
    | "dueDate"
    | "targetName"
    | "collectionTitle"
    | "accession"
    | "status"
    | "processedBy";
  checkinHistory:
    | "processedOn"
    | "checkinDate"
    | "targetName"
    | "collectionTitle"
    | "accession"
    | "violations"
    | "processedBy";
  reservationHistory: "processedOn" | "targetName" | "status";
  renewalHistory:
    | "processedOn"
    | "targetName"
    | "collectionTitle"
    | "accession"
    | "dueDate"
    | "newDueDate"
    | "daysOfExtension"
    | "processedBy";
  reservationApproval: "requestedOn" | "patronName" | "bookCount";
}

export interface CirculationSortState<S extends CirculationSection> {
  column: SectionSortColumn[S];
  direction: SortDirection;
}

export interface CirculationFiltersPayload {
  status?: string[];
  violations?: "All" | "None" | "Any";
  overdueOnly?: boolean;
  processedByUID?: string[];
  dateField?: string;
  dateFrom?: string;
  dateTo?: string;
  requestedDays?: number[];
  hasMultipleBooks?: boolean;
}

export interface FetchCirculationRecordsPayload {
  type: CirculationSection;
  limit: number;
  page: number;
  searchTerm?: string;
  filters: CirculationFiltersPayload;
  sortBy: { column: string; direction: SortDirection };
}

export interface CirculationPaginatedResponse<S extends CirculationSection> {
  data: SectionRow[S][];
  page: number;
  totalPages: number;
  hasMore: boolean;
  total: number;
}
