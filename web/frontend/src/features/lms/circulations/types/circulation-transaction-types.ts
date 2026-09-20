export type ModalType = "success" | "error";

export interface ModalState {
  message: string | null;
  type: ModalType;
}

export interface Patron {
  id: string;
  UID?: string;
  PublicUID?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Suffix?: string;
  Email?: string;
  PhoneNumber?: string;
  Avatar?: string;
  Barangay?: string;
  City?: string;
  State?: string;
  Status?: string;
  BorrowList?: unknown[];
  ReservationList?: unknown[];
  SuspendedOverdueCount?: number;
  [key: string]: unknown;
}

export interface BookCopy {
  Accession: string;
  Availability?: string;
  ForLibraryUse?: boolean;
  LastBorrowedBy?: string;
  LastBorrowedDate?: unknown;
  [key: string]: unknown;
}

export interface CollectionLite {
  id: string;
  UID?: string;
  CollectionTitle?: string;
  MainAuthor?: string;
  ISBN10?: string;
  ISBN13?: string;
  CoverImage?: string;
  Copies?: BookCopy[];
  [key: string]: unknown;
}

export interface CopyHit {
  book: CollectionLite;
  copy: BookCopy;
  copyIndex: number;
}

export interface CheckoutPayload {
  patronIdOrUID: string;
  collectionId: string;
  accession: string;
  dueDate?: string;
}

export interface CheckinPayload {
  patronIdOrUID: string;
  collectionId: string;
  accession: string;
}

export interface RenewalPayload {
  patronIdOrUID: string;
  borrowKey: string;
  days: number;
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
  RenewsTo: number | null;
}

export interface ListBorrowedBooksResponse {
  patronUID: string;
  patronName: string;
  books: BorrowedBookRow[];
}

export interface DashboardSummary {
  activePatrons: number;
  totalBooks: number;
  booksBorrowed: number;
  booksDueToday: number;
  newPatronsThisMonth: number;
  pendingApprovals: {
    total: number;
    renewals: number;
    reservations: {
      requests: number;
      books: number;
    };
  };
  generatedAt: number;
}

export interface PatronSlotItem {
  kind: "loan" | "hold" | "pending";
  title: string;
  accession: string;
  date: number | null;
  from: number | null;
  flagged: boolean;
}

export interface PatronSlotUsage {
  patronUID: string;
  loans: number;
  holds: number;
  pending: number;
  total: number;
  max: number;
  loanPeriodDays: number;
  dueDatePreview: number;
  items?: PatronSlotItem[];
}
