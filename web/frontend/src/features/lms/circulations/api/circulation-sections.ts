import type { SortOption } from "@/components/ui/SortPopover";
import type {
  CirculationSection,
  CirculationSortState,
  SectionFilters,
} from "@/features/lms/circulations/types/circulation-records-types";

export interface SectionConfig<S extends CirculationSection> {
  section: S;
  label: string;
  slug: string;
  searchPlaceholder: string;
  emptyMessage: string;
  defaultFilters: SectionFilters[S];
  defaultSort: CirculationSortState<S>;
  sortOptions: SortOption[];
  dateFieldOptions: { id: string; label: string }[];
}

const HISTORY_STATUS_ALL: string[] = [];

export const CHECKOUT_STATUS_OPTIONS = [
  { id: "Borrowed", label: "Borrowed" },
  { id: "Returned", label: "Returned" },
  { id: "Overdue", label: "Overdue" },
  { id: "LongOverdue", label: "Long overdue" },
  { id: "AssumedLost", label: "Assumed lost" },
];

export const RESERVATION_STATUS_OPTIONS = [
  { id: "Pending", label: "Pending" },
  { id: "Approved", label: "Approved" },
  { id: "Fulfilled", label: "Collected" },
  { id: "Pickup Failed", label: "Not collected" },
  { id: "Rejected", label: "Rejected" },
  { id: "Cancelled", label: "Cancelled" },
  { id: "Expired", label: "Expired" },
];

export const VIOLATION_OPTIONS = [
  { id: "All", label: "All" },
  { id: "None", label: "No violations" },
  { id: "Any", label: "With violations" },
];

export const REQUESTED_DAYS_OPTIONS = Array.from({ length: 7 }, (_, i) => ({
  id: String(i + 1),
  label: i === 0 ? "1 day" : `${i + 1} days`,
}));

const checkoutHistory: SectionConfig<"checkoutHistory"> = {
  section: "checkoutHistory",
  label: "Check Out History",
  slug: "checkout-history",
  searchPlaceholder: "Search borrower, title, accession...",
  emptyMessage: "No check outs found. Try adjusting your filters or search.",
  defaultFilters: {
    status: HISTORY_STATUS_ALL,
    overdueOnly: false,
    dateField: "processedOn",
    dateFrom: "",
    dateTo: "",
  },
  defaultSort: { column: "processedOn", direction: "desc" },
  sortOptions: [
    { id: "processedOn", label: "Checkout Date" },
    { id: "dueDate", label: "Due Date" },
    { id: "targetName", label: "Borrower" },
    { id: "collectionTitle", label: "Collection Title" },
    { id: "accession", label: "Accession" },
    { id: "status", label: "Status" },
    { id: "processedBy", label: "Processed By" },
  ],
  dateFieldOptions: [
    { id: "processedOn", label: "Checkout Date" },
    { id: "dueDate", label: "Due Date" },
  ],
};

const checkinHistory: SectionConfig<"checkinHistory"> = {
  section: "checkinHistory",
  label: "Check In History",
  slug: "checkin-history",
  searchPlaceholder: "Search borrower, title, accession...",
  emptyMessage: "No check ins found. Try adjusting your filters or search.",
  defaultFilters: {
    violations: "All",
    dateField: "processedOn",
    dateFrom: "",
    dateTo: "",
  },
  defaultSort: { column: "processedOn", direction: "desc" },
  sortOptions: [
    { id: "processedOn", label: "Processed On" },
    { id: "checkinDate", label: "Check In Date" },
    { id: "targetName", label: "Borrower" },
    { id: "collectionTitle", label: "Collection Title" },
    { id: "accession", label: "Accession" },
    { id: "violations", label: "Violations" },
    { id: "processedBy", label: "Processed By" },
  ],
  dateFieldOptions: [
    { id: "processedOn", label: "Processed On" },
    { id: "checkinDate", label: "Check In Date" },
  ],
};

const reservationHistory: SectionConfig<"reservationHistory"> = {
  section: "reservationHistory",
  label: "Reservation History",
  slug: "reservation-history",
  searchPlaceholder: "Search patron or title...",
  emptyMessage: "No reservations found. Try adjusting your filters or search.",
  defaultFilters: {
    status: HISTORY_STATUS_ALL,
    hasMultipleBooks: false,
    dateField: "processedOn",
    dateFrom: "",
    dateTo: "",
  },
  defaultSort: { column: "processedOn", direction: "desc" },
  sortOptions: [
    { id: "processedOn", label: "Processed On" },
    { id: "targetName", label: "Patron" },
    { id: "status", label: "Status" },
  ],
  dateFieldOptions: [{ id: "processedOn", label: "Processed On" }],
};

const renewalHistory: SectionConfig<"renewalHistory"> = {
  section: "renewalHistory",
  label: "Renewal History",
  slug: "renewal-history",
  searchPlaceholder: "Search patron, title, accession...",
  emptyMessage: "No renewals found. Try adjusting your filters or search.",
  defaultFilters: {
    requestedDays: [],
    dateField: "processedOn",
    dateFrom: "",
    dateTo: "",
  },
  defaultSort: { column: "processedOn", direction: "desc" },
  sortOptions: [
    { id: "processedOn", label: "Renewed On" },
    { id: "targetName", label: "Patron" },
    { id: "collectionTitle", label: "Collection Title" },
    { id: "accession", label: "Accession" },
    { id: "dueDate", label: "Previous Due Date" },
    { id: "newDueDate", label: "New Due Date" },
    { id: "daysOfExtension", label: "Days Extended" },
    { id: "processedBy", label: "Renewed By" },
  ],
  dateFieldOptions: [
    { id: "processedOn", label: "Renewed On" },
    { id: "dueDate", label: "Previous Due Date" },
    { id: "newDueDate", label: "New Due Date" },
  ],
};

const reservationApproval: SectionConfig<"reservationApproval"> = {
  section: "reservationApproval",
  label: "Reservation Approval",
  slug: "reservation-approval",
  searchPlaceholder: "Search patron or title...",
  emptyMessage: "No reservation requests are waiting for approval.",
  defaultFilters: {
    hasMultipleBooks: false,
    dateField: "requestedAt",
    dateFrom: "",
    dateTo: "",
  },
  defaultSort: { column: "requestedOn", direction: "asc" },
  sortOptions: [
    { id: "requestedOn", label: "Requested On" },
    { id: "patronName", label: "Patron" },
    { id: "bookCount", label: "Number of Books" },
  ],
  dateFieldOptions: [{ id: "requestedAt", label: "Requested On" }],
};

export const SECTION_CONFIG = {
  checkoutHistory,
  checkinHistory,
  reservationHistory,
  renewalHistory,
  reservationApproval,
} as const satisfies { [S in CirculationSection]: SectionConfig<S> };

export const ALWAYS_FRESH_SECTIONS: CirculationSection[] = [
  "reservationApproval",
];

export const RECORD_SECTIONS: CirculationSection[] = [
  "checkoutHistory",
  "checkinHistory",
  "renewalHistory",
  "reservationHistory",
  "reservationApproval",
];

export const TRANSACTION_PAGES = [
  { slug: "check-out", label: "Check Out", role: "Checkout" },
  { slug: "check-in", label: "Check In", role: "Checkin" },
  { slug: "renew", label: "Renew", role: "ApproveRenewals" },
] as const;

export type TransactionRole = (typeof TRANSACTION_PAGES)[number]["role"];

export const SECTION_ROLE: Partial<
  Record<CirculationSection, TransactionRole>
> = {};
