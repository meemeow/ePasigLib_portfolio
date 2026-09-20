import type { CartStatus } from "@/features/opac/collections/types/collections-types";

export const CART_STATUS_LABEL: Record<Exclude<CartStatus, "ok">, string> = {
  availableSoon: "Reserved by someone else — back within days",
  allOut: "All copies are out on loan right now",
  libraryUse: "Library use only — cannot be borrowed",
  noCopies: "No copies catalogued yet",
};

export const CART_STATUS_MESSAGE: Record<Exclude<CartStatus, "ok">, string> = {
  availableSoon:
    "Every copy is spoken for, but one is on a reservation rather than on loan — those usually come back within a few days. Try again shortly.",
  allOut:
    "Every copy of this title is out on loan right now. Try again once one comes back.",
  libraryUse: "This title is for library use only and cannot be borrowed.",
  noCopies: "No copies of this title are catalogued yet.",
};

export interface CartCollection {
  id: string;
  CollectionTitle: string;
  MainAuthor: string;
  CollectionImage?: string;
  ClassCode?: string;
  MaterialType?: string;
  Year?: string;
  CartStatus?: CartStatus;
}

export interface LoanRow {
  BorrowID: string;
  Accession: string;
  BookID: string;
  CollectionTitle: string;
  CollectionImage: string;
  CheckoutBy: string;
  CheckoutDate: number | null;
  DueDate: number | null;
  RenewalCount: number;
  MaxRenewals: number;
  Status: string;
  IsOverdue: boolean;
  IneligibleReason: string | null;
  RenewsTo: number | null;
}

export interface HoldRow {
  HoldID: string;
  BookID: string;
  Accession: string;
  CollectionTitle: string;
  CollectionImage: string;
  PickupFrom: number | null;
  ShelfExpiresOn: number | null;
  ApprovedBy: string;
  RequestId: string;
  Collectable: boolean;
}

export interface RequestCollection {
  BookID: string;
  Accession: string;
  CollectionTitle: string;
  MainAuthor?: string;
  CollectionImage?: string;
}

export interface RequestRow {
  id: string;
  Status: string;
  Purpose: string;
  RequestedOn: number | null;
  ExpiresAt: number | null;
  Books: RequestCollection[];
  BookCount: number;
}

export interface HistoryRow {
  id: string;
  Type: string;
  Status: string;
  ProcessedOn: number | null;
  Accession: string;
  CollectionTitle: string;
  Books: RequestCollection[];
  DueDate: number | null;
  NewDueDate: number | null;
  CheckinDate: number | null;
  Purpose: string;
  Remarks: string;
  Violations: string;
}

export interface CartPolicy {
  LoanPeriodDays: number;
  MaxRenewals: number;
  RenewalPeriodDays: number;
  PickupWindowDays: number;
  HoldRequestExpiryHours: number;
  MaxCartItems: number;
  MaxSavedItems: number;
}

export interface CartOverview {
  slotsLeft: number;
  maxSlots: number;
  counts: { loans: number; holds: number; pending: number; total: number };
  cart: Record<string, CartCollection>;
  saved: Record<string, CartCollection>;
  loans: LoanRow[];
  holds: HoldRow[];
  requests: RequestRow[];
  history: { rows: HistoryRow[]; hasMore: boolean };
  policy: CartPolicy;
  generatedAt: number;
}

export const DEFAULT_CART_POLICY: CartPolicy = {
  LoanPeriodDays: 14,
  MaxRenewals: 1,
  RenewalPeriodDays: 7,
  PickupWindowDays: 3,
  HoldRequestExpiryHours: 24,
  MaxCartItems: 10,
  MaxSavedItems: 50,
};

export const DEFAULT_MAX_SLOTS = 3;

export const EMPTY_OVERVIEW: CartOverview = {
  slotsLeft: 0,
  maxSlots: DEFAULT_MAX_SLOTS,
  counts: { loans: 0, holds: 0, pending: 0, total: 0 },
  cart: {},
  saved: {},
  loans: [],
  holds: [],
  requests: [],
  history: { rows: [], hasMore: false },
  policy: DEFAULT_CART_POLICY,
  generatedAt: 0,
};

export function normalizeOverview(data: unknown): CartOverview {
  const raw = (data || {}) as Partial<CartOverview>;
  const history = raw.history || EMPTY_OVERVIEW.history;
  return {
    slotsLeft: Number(raw.slotsLeft ?? EMPTY_OVERVIEW.slotsLeft),
    maxSlots: Number(raw.maxSlots ?? EMPTY_OVERVIEW.maxSlots),
    counts: { ...EMPTY_OVERVIEW.counts, ...(raw.counts || {}) },
    cart: raw.cart || {},
    saved: raw.saved || {},
    loans: raw.loans || [],
    holds: raw.holds || [],
    requests: raw.requests || [],
    history: {
      rows: history.rows || [],
      hasMore: Boolean(history.hasMore),
    },
    policy: { ...DEFAULT_CART_POLICY, ...(raw.policy || {}) },
    generatedAt: Number(raw.generatedAt ?? 0),
  };
}

export interface ReserveBatchItem {
  book: CartCollection;
  quantity: number;
}

export const MAX_PURPOSE_LENGTH = 300;
