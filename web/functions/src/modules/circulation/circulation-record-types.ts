import { PagedResponse } from "../lms/reads/fetching-types";

export type CirculationSection =
  | "checkoutHistory"
  | "checkinHistory"
  | "reservationHistory"
  | "renewalHistory"
  | "reservationApproval";

export type SortDirection = "asc" | "desc";

export interface CirculationFiltersPayload {
  status?: string[];
  violations?: "All" | "None" | "Any";
  overdueOnly?: boolean;
  processedByUID?: string[];
  dateField?: "processedOn" | "dueDate" | "checkinDate" | "requestedAt";
  dateFrom?: string;
  dateTo?: string;
  requestedDays?: number[];
  hasMultipleBooks?: boolean;
}

export interface CirculationDataPaginatedRequest {
  type: CirculationSection;
  limit: number;
  page: number;
  searchTerm?: string;
  filters?: CirculationFiltersPayload;
  sortBy?: { column: string; direction: SortDirection };
}

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
  TargetName: string;
  CollectionTitle: string;
  Accession: string;
  ProcessedBy: string;
  ProcessedByUID: string;
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
  PatronName: string;
  Purpose: string;
  RequestedOn: number | null;
  ExpiresAt: number | null;
  Books: CirculationBookRef[];
  BookCount: number;
  Status: string;
}

export type CirculationRow = CirculationHistoryRow | ReservationApprovalRow;

export type CirculationDataPaginatedResponse = PagedResponse<CirculationRow>;

export interface DashboardSummary {
  activePatrons: number;
  totalBooks: number;
  booksBorrowed: number;
  booksDueToday: number;
  newPatronsThisMonth: number;
  pendingApprovals: {
    total: number;
    reservations: {
      requests: number;
      books: number;
    };
  };
  generatedAt: number;
}

export interface BorrowedBookRow {
  BorrowID: string;
  Accession: string;
  BookID: string;
  CollectionTitle: string;
  CheckoutBy: string;
  CheckoutDate: number | null;
  DueDate: number | null;
  HasRenewed: boolean;
  IsOverdue: boolean;
  IneligibleReason: string | null;
}

export interface ListBorrowedBooksResponse {
  patronUID: string;
  patronName: string;
  books: BorrowedBookRow[];
}

export interface PatronSlotItem {
  kind: "loan" | "hold" | "pending";
  title: string;
  accession: string;
  date: number | null;
  from: number | null;
  flagged: boolean;
}
