import { toMillis } from "../../core/time";
import { pagedFromQuery } from "../../core/pagination";
import {
  CirculationPolicy,
  DAY_MS as POLICY_DAY_MS,
  loadPolicy,
  holdsRef,
  loansRef,
  patronCircRef,
  phDateString,
  phDayEnd as policyPhDayEnd,
  phDayStart as policyPhDayStart,
  renewalOpensAt,
  stageFor,
  transactionsRef,
} from "./circulation-policy";
import { loadCalendar } from "./library-calendar";
import { pendingRequestsQuery, slotUsage } from "./staff-ops";
import { dueWithGrace, renewedDueDate } from "./circulation-dates";
import {
  BorrowedBookRow,
  CirculationBookRef,
  CirculationDataPaginatedRequest,
  CirculationDataPaginatedResponse,
  CirculationFiltersPayload,
  CirculationHistoryRow,
  CirculationRow,
  CirculationSection,
  DashboardSummary,
  ListBorrowedBooksResponse,
  PatronSlotItem,
  ReservationApprovalRow,
  SortDirection,
} from "./circulation-record-types";
import { Timestamp, db } from "../../core/firebase";

type AnyObj = Record<string, any>;

const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = POLICY_DAY_MS;

// ==========================================
// || DATE NORMALISATION                    ||
// ==========================================

export const phDayStartMillis = policyPhDayStart;

export function phMonthStartMillis(value: Date): number {
  const shifted = new Date(value.getTime() + PH_OFFSET_MS);
  return (
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - PH_OFFSET_MS
  );
}

export function toDayMillis(value: unknown): number | null {
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!m) return null;
    return (
      Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - PH_OFFSET_MS
    );
  }
  return toMillis(value);
}

// ==========================================
// || ROW MAPPERS                           ||
// ==========================================

function toBookRefs(value: unknown): CirculationBookRef[] {
  if (!Array.isArray(value)) return [];
  return value.map((b) => {
    const book = (b || {}) as AnyObj;
    return {
      BookID: String(book.BookID || book.bookId || ""),
      Accession: String(book.Accession || ""),
      CollectionTitle: String(book.CollectionTitle || ""),
      MainAuthor: book.MainAuthor ? String(book.MainAuthor) : undefined,
    };
  });
}

const SEARCH_BLOB = "_searchBlob";

function booksBlob(books: CirculationBookRef[]): string {
  return books
    .map((b) => `${b.CollectionTitle} ${b.Accession} ${b.MainAuthor || ""}`)
    .join(" ")
    .toLowerCase();
}

export function mapHistoryRow(id: string, raw: AnyObj): CirculationHistoryRow {
  const books = toBookRefs(raw.Books);
  const row: CirculationHistoryRow & AnyObj = {
    id,
    Type: String(raw.Type || ""),
    TargetUID: String(raw.TargetUID || ""),
    TargetName: String(raw.TargetName || ""),
    CollectionTitle: String(raw.CollectionTitle || ""),
    Accession: String(raw.Accession || ""),
    ProcessedBy: String(raw.ProcessedBy || raw.CheckinBy || ""),
    ProcessedByUID: String(raw.UID || ""),
    ProcessedOn: toMillis(raw.ProcessedOn),
    DueDate: toMillis(raw.DueDate),
    NewDueDate: toMillis(raw.NewDueDate),
    CheckinDate: toMillis(raw.CheckinDate),
    Purpose: String(raw.Purpose || ""),
    Status: String(raw.Status || ""),
    Violations: String(raw.Violations || "") || "None",
    Remarks: String(raw.Remarks || ""),
    Books: books,
    HasRenewed: Boolean(raw.HasRenewed),
    DaysOfExtension:
      raw.DaysOfExtension === undefined || raw.DaysOfExtension === null
        ? null
        : Number(raw.DaysOfExtension),
  };
  row[SEARCH_BLOB] = booksBlob(books);
  return row;
}

function expiresAt(
  raw: AnyObj,
  requestedAt: number | null,
  policy: CirculationPolicy,
): number | null {
  const stored = toMillis(raw.ExpiresAt);
  if (stored !== null) return stored;
  if (requestedAt === null) return null;
  return requestedAt + policy.HoldRequestExpiryHours * 60 * 60 * 1000;
}

export function mapReservationApprovalRow(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  policy: CirculationPolicy,
): ReservationApprovalRow {
  const raw = doc.data() as AnyObj;
  const books = toBookRefs(raw.Books);
  const requestedOn = toMillis(raw.RequestedOn);
  const row: ReservationApprovalRow & AnyObj = {
    id: doc.id,
    PatronUID: String(raw.PatronUID || ""),
    PatronName: String(raw.PatronName || ""),
    Purpose: String(raw.Purpose || ""),
    RequestedOn: requestedOn,
    ExpiresAt: expiresAt(raw, requestedOn, policy),
    Books: books,
    BookCount: books.length,
    Status: String(raw.Status || ""),
  };
  row[SEARCH_BLOB] = booksBlob(books);
  return row;
}

// ==========================================
// || SECTION DESCRIPTORS                   ||
// ==========================================

const HISTORY_TYPE: Partial<Record<CirculationSection, string>> = {
  checkoutHistory: "Checkout",
  checkinHistory: "Checkin",
  reservationHistory: "Reservation",
  renewalHistory: "Renewal",
};

const SEARCH_FIELDS: Record<CirculationSection, string[]> = {
  checkoutHistory: [
    "TargetName",
    "TargetUID",
    "CollectionTitle",
    "Accession",
    "ProcessedBy",
    "Status",
  ],
  checkinHistory: [
    "TargetName",
    "TargetUID",
    "CollectionTitle",
    "Accession",
    "ProcessedBy",
    "Status",
    "Violations",
  ],
  reservationHistory: [
    "TargetName",
    "TargetUID",
    "CollectionTitle",
    "Accession",
    "ProcessedBy",
    "Purpose",
    "Status",
    "Remarks",
    SEARCH_BLOB,
  ],
  renewalHistory: [
    "TargetName",
    "TargetUID",
    "CollectionTitle",
    "Accession",
    "ProcessedBy",
  ],
  reservationApproval: ["PatronName", "PatronUID", SEARCH_BLOB],
};

const SORT_FIELDS: Record<CirculationSection, Record<string, string>> = {
  checkoutHistory: {
    processedOn: "ProcessedOn",
    dueDate: "DueDate",
    targetName: "TargetName",
    collectionTitle: "CollectionTitle",
    accession: "Accession",
    status: "Status",
    processedBy: "ProcessedBy",
  },
  checkinHistory: {
    processedOn: "ProcessedOn",
    checkinDate: "CheckinDate",
    targetName: "TargetName",
    collectionTitle: "CollectionTitle",
    accession: "Accession",
    violations: "Violations",
    processedBy: "ProcessedBy",
  },
  reservationHistory: {
    processedOn: "ProcessedOn",
    targetName: "TargetName",
    status: "Status",
  },
  renewalHistory: {
    processedOn: "ProcessedOn",
    targetName: "TargetName",
    collectionTitle: "CollectionTitle",
    accession: "Accession",
    dueDate: "DueDate",
    newDueDate: "NewDueDate",
    daysOfExtension: "DaysOfExtension",
    processedBy: "ProcessedBy",
  },
  reservationApproval: {
    requestedOn: "RequestedOn",
    patronName: "PatronName",
    bookCount: "BookCount",
  },
};

const DEFAULT_SORT: Record<
  CirculationSection,
  { column: string; direction: SortDirection }
> = {
  checkoutHistory: { column: "processedOn", direction: "desc" },
  checkinHistory: { column: "processedOn", direction: "desc" },
  reservationHistory: { column: "processedOn", direction: "desc" },
  renewalHistory: { column: "processedOn", direction: "desc" },
  reservationApproval: { column: "requestedOn", direction: "asc" },
};

const DATE_FIELDS: Record<CirculationSection, Record<string, string>> = {
  checkoutHistory: { processedOn: "ProcessedOn", dueDate: "DueDate" },
  checkinHistory: { processedOn: "ProcessedOn", checkinDate: "CheckinDate" },
  reservationHistory: { processedOn: "ProcessedOn" },
  renewalHistory: {
    processedOn: "ProcessedOn",
    dueDate: "DueDate",
    newDueDate: "NewDueDate",
  },
  reservationApproval: {
    requestedAt: "RequestedOn",
  },
};

// ==========================================
// || FILTER / SORT / PAGE                  ||
// ==========================================

function applyDateRange(
  rows: AnyObj[],
  section: CirculationSection,
  filters: CirculationFiltersPayload,
): AnyObj[] {
  const { dateFrom, dateTo } = filters;
  if (!dateFrom && !dateTo) return rows;

  const map = DATE_FIELDS[section];
  const field =
    (filters.dateField && map[filters.dateField]) || map[Object.keys(map)[0]];

  const from = dateFrom ? toDayMillis(dateFrom) : null;
  const toStart = dateTo ? toDayMillis(dateTo) : null;
  const to = toStart === null ? null : toStart + DAY_MS - 1;

  return rows.filter((r) => {
    const v = r[field];
    if (typeof v !== "number") return false;
    if (from !== null && v < from) return false;
    if (to !== null && v > to) return false;
    return true;
  });
}

export function applyCirculationFilters(
  rows: AnyObj[],
  section: CirculationSection,
  filters: CirculationFiltersPayload,
): AnyObj[] {
  let out = rows;
  const now = Date.now();

  if (filters.status && filters.status.length > 0) {
    const wanted = new Set(filters.status.map((s) => String(s).toLowerCase()));
    const wantsOverdue = wanted.has("overdue");
    out = out.filter((r) => {
      const status = String(r.Status || "").toLowerCase();
      if (wanted.has(status)) return true;
      if (wantsOverdue) {
        return (
          typeof r.DueDate === "number" &&
          r.DueDate < now &&
          status !== "returned"
        );
      }
      return false;
    });
  }

  if (filters.overdueOnly) {
    out = out.filter(
      (r) =>
        typeof r.DueDate === "number" &&
        r.DueDate < now &&
        String(r.Status || "").toLowerCase() !== "returned",
    );
  }

  if (filters.violations && filters.violations !== "All") {
    out = out.filter((r) => {
      const v = String(r.Violations || "").trim();
      const none = v === "" || v.toLowerCase() === "none";
      return filters.violations === "None" ? none : !none;
    });
  }

  if (filters.processedByUID && filters.processedByUID.length > 0) {
    const wanted = new Set(filters.processedByUID);
    out = out.filter((r) => wanted.has(String(r.ProcessedByUID || "")));
  }

  if (filters.requestedDays && filters.requestedDays.length > 0) {
    const wanted = new Set(filters.requestedDays.map(Number));
    out = out.filter((r) => wanted.has(Number(r.DaysOfExtension)));
  }

  if (filters.hasMultipleBooks) {
    out = out.filter((r) => (Array.isArray(r.Books) ? r.Books.length : 0) > 1);
  }

  return applyDateRange(out, section, filters);
}

function compareRows(
  a: AnyObj,
  b: AnyObj,
  field: string,
  direction: SortDirection,
): number {
  const av = a[field];
  const bv = b[field];
  const aNull = av === null || av === undefined || av === "";
  const bNull = bv === null || bv === undefined || bv === "";

  if (aNull && bNull) return a.id < b.id ? 1 : -1;
  if (aNull) return 1;
  if (bNull) return -1;

  let c: number;
  if (typeof av === "number" && typeof bv === "number") {
    c = av - bv;
  } else {
    c = String(av).localeCompare(String(bv), undefined, {
      sensitivity: "base",
      numeric: true,
    });
  }
  if (c !== 0) return direction === "asc" ? c : -c;
  return a.id < b.id ? 1 : -1;
}

export function sortCirculationRows(
  rows: AnyObj[],
  section: CirculationSection,
  sortBy?: { column: string; direction: SortDirection },
): void {
  const map = SORT_FIELDS[section];
  const fallback = DEFAULT_SORT[section];
  const column =
    sortBy?.column && map[sortBy.column] ? sortBy.column : fallback.column;
  const direction: SortDirection =
    sortBy?.direction === "asc" || sortBy?.direction === "desc"
      ? sortBy.direction
      : fallback.direction;
  const field = map[column];
  rows.sort((a, b) => compareRows(a, b, field, direction));

  if (section === "reservationApproval") {
    const now = Date.now();
    const lapsed = (r: AnyObj) =>
      typeof r.ExpiresAt === "number" && r.ExpiresAt <= now;
    const dead = rows.filter(lapsed);
    if (dead.length && dead.length < rows.length) {
      const live = rows.filter((r) => !lapsed(r));
      rows.length = 0;
      rows.push(...live, ...dead);
    }
  }
}

function stripInternal(rows: AnyObj[]): CirculationRow[] {
  return rows.map((r) => {
    if (SEARCH_BLOB in r) {
      const { [SEARCH_BLOB]: _blob, ...rest } = r;
      return rest as CirculationRow;
    }
    return r as CirculationRow;
  });
}

async function publicIdsFor(
  db: FirebaseFirestore.Firestore,
  collection: "patrons" | "staffs",
  uids: Set<string>,
  field: "PublicUID" | "StaffCode",
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const list = [...uids].filter(Boolean);
  if (!list.length) return out;

  for (let i = 0; i < list.length; i += 30) {
    const chunk = list.slice(i, i + 30);
    try {
      const snap = await db
        .collection(collection)
        .where("UID", "in", chunk)
        .get();
      for (const doc of snap.docs) {
        const data = doc.data() as AnyObj;
        const uid = String(data.UID || "");
        const value = String(data[field] || "");
        if (uid && value) out.set(uid, value);
      }
    } catch (error) {
      console.error(`Could not resolve ${field} for ${collection}:`, error);
    }
  }
  return out;
}

async function attachPublicIds(
  db: FirebaseFirestore.Firestore,
  rows: AnyObj[],
): Promise<void> {
  const patronUids = new Set<string>();
  const staffUids = new Set<string>();

  for (const row of rows) {
    const patron = String(row.TargetUID || row.PatronUID || "");
    if (patron) patronUids.add(patron);
    const staff = String(row.ProcessedByUID || "");
    if (staff) staffUids.add(staff);
  }

  const [patrons, staffs] = await Promise.all([
    publicIdsFor(db, "patrons", patronUids, "PublicUID"),
    publicIdsFor(db, "staffs", staffUids, "StaffCode"),
  ]);

  for (const row of rows) {
    const target = String(row.TargetUID || "");
    const patron = String(row.PatronUID || "");
    const staff = String(row.ProcessedByUID || "");
    if (target) row.TargetPublicUID = patrons.get(target) || "";
    if (patron) row.PatronPublicUID = patrons.get(patron) || "";
    row.ProcessedByCode = staff ? staffs.get(staff) || "" : "";
  }
}

// ==========================================
// || THE PAGINATED READ                    ||
// ==========================================

export async function fetchCirculationDataPaginated(
  params: CirculationDataPaginatedRequest,
): Promise<CirculationDataPaginatedResponse> {
  const section = params.type;
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
  const filters = params.filters || {};
  const term = String(params.searchTerm || "")
    .trim()
    .toLowerCase();
  const policy = await loadPolicy(db);

  let rows: AnyObj[];

  if (section === "reservationApproval") {
    const snap = await db
      .collection("reservationRequests")
      .where("Status", "==", "Pending")
      .get();
    rows = snap.docs.map((doc) => mapReservationApprovalRow(doc, policy));
  } else {
    const wanted = HISTORY_TYPE[section];
    if (!wanted) {
      return { data: [], page: 1, totalPages: 1, hasMore: false, total: 0 };
    }
    const snap = await transactionsRef(db).where("Type", "==", wanted).get();
    rows = snap.docs.map((doc) => mapHistoryRow(doc.id, doc.data() as AnyObj));

    if (section === "renewalHistory") {
      rows = rows.filter((r) => String(r.Status || "") !== "Rejected");
    }
  }

  rows = applyCirculationFilters(rows, section, filters);

  if (term) {
    const fields = SEARCH_FIELDS[section];
    rows = rows.filter((r) =>
      fields.some((f) =>
        String(r[f] ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }

  sortCirculationRows(rows, section, params.sortBy);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const start = (safePage - 1) * limit;

  const page = rows.slice(start, start + limit);
  await attachPublicIds(db, page);

  return pagedFromQuery(stripInternal(page), limit, safePage, total);
}

// ==========================================
// || DASHBOARD SUMMARY                     ||
// ==========================================

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date();
  const monthStart = Timestamp.fromMillis(
    phMonthStartMillis(now),
  );
  const dayStart = phDayStartMillis(now);
  const dayEnd = dayStart + DAY_MS;

  const [
    activeSnap,
    booksSnap,
    newPatronSnap,
    resSnap,
    loansSnap,
    dueTodaySnap,
  ] = await Promise.all([
    db.collection("patrons").where("Status", "==", "Active").count().get(),
    db.collection("collections").count().get(),
    db.collection("patrons").where("CreatedOn", ">=", monthStart).count().get(),
    db.collection("reservationRequests").where("Status", "==", "Pending").get(),
    db.collectionGroup("loans").count().get(),
    db
      .collectionGroup("loans")
      .where("DueDate", ">=", Timestamp.fromMillis(dayStart))
      .where("DueDate", "<", Timestamp.fromMillis(dayEnd))
      .count()
      .get(),
  ]);

  const booksBorrowed = loansSnap.data().count;
  const booksDueToday = dueTodaySnap.data().count;

  const nowMs = Date.now();
  const expiryMs = 24 * 60 * 60 * 1000;
  let reservationRequests = 0;
  let reservationBooks = 0;
  for (const doc of resSnap.docs) {
    const raw = doc.data() as AnyObj;
    const expires =
      toMillis(raw.ExpiresAt) ??
      (toMillis(raw.RequestedOn) === null
        ? null
        : (toMillis(raw.RequestedOn) as number) + expiryMs);
    if (expires !== null && expires <= nowMs) continue;
    reservationRequests++;
    reservationBooks += Array.isArray(raw.Books) ? raw.Books.length : 0;
  }

  return {
    activePatrons: activeSnap.data().count,
    totalBooks: booksSnap.data().count,
    booksBorrowed,
    booksDueToday,
    newPatronsThisMonth: newPatronSnap.data().count,
    pendingApprovals: {
      total: reservationRequests,
      reservations: {
        requests: reservationRequests,
        books: reservationBooks,
      },
    },
    generatedAt: Date.now(),
  };
}

// ==========================================
// || A PATRON'S BORROWED COPIES            ||
// ==========================================

export async function listBorrowedBooks(
  patronIdOrUID: string,
): Promise<ListBorrowedBooksResponse> {

  let snap = await db.collection("patrons").doc(patronIdOrUID).get();
  if (!snap.exists) {
    const q = await db
      .collection("patrons")
      .where("UID", "==", patronIdOrUID)
      .limit(1)
      .get();
    if (q.empty) return { patronUID: "", patronName: "", books: [] };
    snap = q.docs[0];
  }

  const patron = snap.data() as AnyObj;
  const patronUID = String(patron?.UID || "");
  const patronName = `${String(patron?.FirstName || "")} ${String(
    patron?.LastName || "",
  )}`.trim();
  if (!patronUID) return { patronUID: "", patronName, books: [] };

  const [policy, calendar, loansSnap] = await Promise.all([
    loadPolicy(db),
    loadCalendar(db),
    loansRef(db, patronUID).orderBy("DueDate", "asc").get(),
  ]);

  const now = Date.now();
  const books: BorrowedBookRow[] = loansSnap.docs.map((doc) => {
    const b = doc.data() as AnyObj;
    const due = toMillis(b.DueDate);
    const renewalCount = Number(b.RenewalCount || 0);
    const stage = stageFor(due, now, policy, calendar);
    const isOverdue = stage !== "Borrowed";

    let reason: string | null = null;
    if (renewalCount >= policy.MaxRenewals) {
      reason = `Renewed ${renewalCount} of ${policy.MaxRenewals} times`;
    } else if (isOverdue) {
      reason = `${stage} — must be returned first`;
    } else if (due !== null && now < renewalOpensAt(due, policy)) {
      reason = `Renewable from ${phDateString(renewalOpensAt(due, policy))}`;
    }

    return {
      BorrowID: doc.id,
      Accession: String(b.Accession || ""),
      BookID: String(b.BookID || ""),
      CollectionTitle: String(b.CollectionTitle || ""),
      CheckoutBy: String(b.CheckoutBy || ""),
      CheckoutDate: toMillis(b.CheckoutDate),
      DueDate: due,
      HasRenewed: renewalCount > 0,
      IsOverdue: isOverdue,
      IneligibleReason: reason,
      RenewsTo:
        due === null
          ? null
          : renewedDueDate(due, policy.RenewalPeriodDays, calendar),
    };
  });

  return { patronUID, patronName, books };
}

// ==========================================
// || A PATRON'S SLOT USAGE                 ||
// ==========================================

export async function patronSlotUsage(patronIdOrUID: string): Promise<{
  patronUID: string;
  loans: number;
  holds: number;
  pending: number;
  total: number;
  max: number;
  loanPeriodDays: number;
  dueDatePreview: number;
  items: PatronSlotItem[];
}> {
  const empty = {
    patronUID: "",
    loans: 0,
    holds: 0,
    pending: 0,
    total: 0,
    max: 0,
    loanPeriodDays: 0,
    dueDatePreview: 0,
    items: [] as PatronSlotItem[],
  };

  let snap = await db.collection("patrons").doc(patronIdOrUID).get();
  if (!snap.exists) {
    const q = await db
      .collection("patrons")
      .where("UID", "==", patronIdOrUID)
      .limit(1)
      .get();
    if (q.empty) return empty;
    snap = q.docs[0];
  }

  const patronUID = String((snap.data() as AnyObj)?.UID || "");
  if (!patronUID) return empty;

  const [policy, calendar, summarySnap, pendingSnap, loansSnap, holdsSnap] =
    await Promise.all([
      loadPolicy(db),
      loadCalendar(db),
      patronCircRef(db, patronUID).get(),
      pendingRequestsQuery(db, patronUID).get(),
      loansRef(db, patronUID).orderBy("DueDate", "asc").get(),
      holdsRef(db, patronUID).orderBy("ShelfExpiresOn", "asc").get(),
    ]);

  const summary = (summarySnap.exists ? summarySnap.data() : {}) as AnyObj;
  const usage = slotUsage(summary, pendingSnap);
  const now = Date.now();

  const items: PatronSlotItem[] = [
    ...loansSnap.docs.map((doc) => {
      const raw = doc.data() as AnyObj;
      const due = toMillis(raw.DueDate);
      return {
        kind: "loan" as const,
        title: String(raw.CollectionTitle || ""),
        accession: String(raw.Accession || ""),
        date: due,
        from: null,
        flagged:
          due !== null && stageFor(due, now, policy, calendar) !== "Borrowed",
      };
    }),
    ...holdsSnap.docs.map((doc) => {
      const raw = doc.data() as AnyObj;
      const from = toMillis(raw.PickupFrom);
      return {
        kind: "hold" as const,
        title: String(raw.CollectionTitle || ""),
        accession: String(raw.Accession || ""),
        date: toMillis(raw.ShelfExpiresOn),
        from,
        flagged: from !== null && from > now,
      };
    }),
    ...pendingSnap.docs.flatMap((doc) => {
      const raw = doc.data() as AnyObj;
      const expires = toMillis(raw.ExpiresAt);
      const books: AnyObj[] = Array.isArray(raw.Books) ? raw.Books : [];
      return books.map((book) => ({
        kind: "pending" as const,
        title: String(book?.CollectionTitle || ""),
        accession: String(book?.Accession || ""),
        date: expires,
        from: null,
        flagged: false,
      }));
    }),
  ];

  return {
    patronUID,
    ...usage,
    items,
    max: policy.MaxActiveLoans,
    loanPeriodDays: policy.LoanPeriodDays,
    dueDatePreview: dueWithGrace(
      policyPhDayEnd(Date.now()) + policy.LoanPeriodDays * POLICY_DAY_MS,
      calendar,
    ),
  };
}
