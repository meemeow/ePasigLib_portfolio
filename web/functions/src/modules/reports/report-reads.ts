import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { toMillisLoose as toMillis } from "../../core/time";
import {
  PH_OFFSET_MS,
  DAY_MS,
  STATE_LADDER,
} from "../circulation/circulation-policy";
import type {
  BookRequestsReport,
  CirculationReport,
  CollectionReport,
  PatronsReport,
  PublishingReport,
  ReferenceDeskReport,
  ReportPeriod,
  ReportPeriodRequest,
  ReportScope,
  ReportSummary,
  ReportTally,
  VisitsReport,
} from "./report-types";
import { Timestamp, db } from "../../core/firebase";

type AnyObj = Record<string, any>;

const HttpsError = functions.https.HttpsError;

// ==========================================
// || PERIOD                                ||
// ==========================================

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function phStart(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) - PH_OFFSET_MS;
}

export function resolvePeriod(request: ReportPeriodRequest): ReportPeriod {
  const scope: ReportScope = request.scope ?? "all";

  if (scope === "all") {
    return { scope, from: null, to: null, label: "All time" };
  }

  const year = Number(request.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    throw new HttpsError("invalid-argument", "A four-digit year is required.");
  }

  if (scope === "year") {
    return {
      scope,
      from: phStart(year, 1, 1),
      to: phStart(year + 1, 1, 1),
      label: String(year),
    };
  }

  const month = Number(request.month);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new HttpsError("invalid-argument", "Month must be 1-12.");
  }

  if (scope === "month") {
    const from = phStart(year, month, 1);
    const to =
      month === 12 ? phStart(year + 1, 1, 1) : phStart(year, month + 1, 1);
    return { scope, from, to, label: `${MONTHS[month - 1]} ${year}` };
  }

  const day = Number(request.day);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth) {
    throw new HttpsError(
      "invalid-argument",
      `Day must be 1-${daysInMonth} for ${MONTHS[month - 1]} ${year}.`,
    );
  }

  const from = phStart(year, month, day);
  return {
    scope,
    from,
    to: from + DAY_MS,
    label: `${day} ${MONTHS[month - 1]} ${year}`,
  };
}

// ==========================================
// || SHARED                                ||
// ==========================================

function ts(millis: number): admin.firestore.Timestamp {
  return Timestamp.fromMillis(millis);
}


function inPeriod(millis: number | null, period: ReportPeriod): boolean {
  if (period.from === null || period.to === null) return true;
  if (millis === null) return false;
  return millis >= period.from && millis < period.to;
}

function tally(counts: Map<string, number>, limit?: number): ReportTally[] {
  const rows = [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return limit === undefined ? rows : rows.slice(0, limit);
}

function bump(counts: Map<string, number>, key: string, by = 1): void {
  const clean = key.trim();
  if (!clean) return;
  counts.set(clean, (counts.get(clean) ?? 0) + by);
}

function windowed(
  base: FirebaseFirestore.Query,
  field: string,
  period: ReportPeriod,
): FirebaseFirestore.Query {
  if (period.from === null || period.to === null) return base;
  return base
    .where(field, ">=", ts(period.from))
    .where(field, "<", ts(period.to));
}

// ==========================================
// || SECTIONS                              ||
// ==========================================

const STANDING_RUNGS: string[] = (() => {
  const rungs = ["Verified"];
  for (
    let next = STATE_LADDER[rungs[0]];
    next && !rungs.includes(next);
    next = STATE_LADDER[next]
  ) {
    rungs.push(next);
  }
  return rungs;
})();

async function readPatrons(
  db: FirebaseFirestore.Firestore,
  period: ReportPeriod,
): Promise<PatronsReport> {
  const snap = await db.collection("patrons").get();

  const residency = new Map<string, number>();
  const barangay = new Map<string, number>();
  const standing = new Map<string, number>();
  let active = 0;
  let archived = 0;
  let verified = 0;
  let unverified = 0;
  let rejected = 0;
  let registered = 0;

  for (const doc of snap.docs) {
    const p = doc.data() as AnyObj;

    if (String(p.Status ?? "Active") === "Archived") archived++;
    else active++;

    const state = String(p.State ?? "").trim();
    if (state === "Rejected") {
      rejected++;
    } else if (STANDING_RUNGS.includes(state)) {
      verified++;
      bump(standing, state);
    } else {
      unverified++;
    }

    if (inPeriod(toMillis(p.CreatedOn), period)) registered++;

    const pasig = String(p.City ?? "") === "City of Pasig";
    bump(residency, pasig ? "Pasig Resident" : "Non-Pasig Resident");
    if (pasig) bump(barangay, String(p.Barangay ?? "Unspecified"));
  }

  return {
    total: snap.size,
    active,
    archived,
    verified,
    unverified,
    rejected,
    registered,
    standing: STANDING_RUNGS.map((label) => ({
      label,
      value: standing.get(label) ?? 0,
    })),
    residency: tally(residency),
    byBarangay: tally(barangay, 10),
  };
}

async function readCollection(
  db: FirebaseFirestore.Firestore,
  period: ReportPeriod,
): Promise<CollectionReport> {
  const [titles, onLoan] = await Promise.all([
    db.collection("collections").get(),
    db.collectionGroup("loans").count().get(),
  ]);

  const byClassCode = new Map<string, number>();
  const byMaterialType = new Map<string, number>();
  const bySection = new Map<string, number>();
  let archived = 0;
  let added = 0;
  let copies = 0;
  let available = 0;
  let archivedCopies = 0;
  let withoutCopies = 0;

  for (const doc of titles.docs) {
    const c = doc.data() as AnyObj;
    if (String(c.Status ?? "") === "Archived") archived++;
    if (inPeriod(toMillis(c.CreatedOn), period)) added++;
    bump(byClassCode, String(c.ClassCode ?? "Unclassified"));
    bump(byMaterialType, String(c.MaterialType ?? "Unspecified"));

    const list: AnyObj[] = Array.isArray(c.Copies) ? c.Copies : [];
    if (list.length === 0) withoutCopies++;

    for (const copy of list) {
      copies++;
      if (String(copy?.Availability ?? "") === "Archived") archivedCopies++;
      else available++;
      bump(bySection, String(copy?.Section ?? "Unassigned"));
    }
  }

  return {
    titles: titles.size,
    copies,
    available,
    borrowed: onLoan.data().count,
    archived,
    archivedCopies,
    withoutCopies,
    added,
    byClassCode: tally(byClassCode, 12),
    byMaterialType: tally(byMaterialType, 12),
    bySection: tally(bySection, 12),
  };
}

async function readCirculation(
  db: FirebaseFirestore.Firestore,
  period: ReportPeriod,
  now: number,
): Promise<CirculationReport> {
  const entries = db.collection("lmslogs").doc("transactions").collection("entries");
  const dayStart = Math.floor((now + PH_OFFSET_MS) / DAY_MS) * DAY_MS - PH_OFFSET_MS;

  const [txSnap, onLoan, overdue, dueToday, onHold] = await Promise.all([
    windowed(entries, "ProcessedOn", period).get(),
    db.collectionGroup("loans").count().get(),
    db
      .collectionGroup("loans")
      .where("DueDate", "<", ts(dayStart))
      .count()
      .get(),
    db
      .collectionGroup("loans")
      .where("DueDate", ">=", ts(dayStart))
      .where("DueDate", "<", ts(dayStart + DAY_MS))
      .count()
      .get(),
    db.collectionGroup("holds").count().get(),
  ]);

  const outcomes = new Map<string, number>();
  const titles = new Map<string, number>();
  const borrowers = new Map<string, number>();
  let checkouts = 0;
  let returns = 0;
  let renewals = 0;
  let reservations = 0;
  let lateReturns = 0;

  for (const doc of txSnap.docs) {
    const t = doc.data() as AnyObj;
    const type = String(t.Type ?? "");

    if (type === "Checkout") {
      checkouts++;
      bump(titles, String(t.CollectionTitle ?? ""));
      bump(borrowers, String(t.TargetName ?? ""));
    } else if (type === "Checkin") {
      returns++;
      const violations = String(t.Violations ?? "None");
      if (violations && violations !== "None") lateReturns++;
    } else if (type === "Renewal") {
      renewals++;
    } else if (type === "Reservation") {
      reservations++;
      bump(outcomes, String(t.Status ?? "Pending"));
    }
  }

  return {
    checkouts,
    returns,
    renewals,
    reservations,
    transactions: txSnap.size,
    onLoanNow: onLoan.data().count,
    overdueNow: overdue.data().count,
    dueTodayNow: dueToday.data().count,
    onHoldNow: onHold.data().count,
    reservationOutcomes: tally(outcomes),
    lateReturns,
    topTitles: tally(titles, 10),
    topBorrowers: tally(borrowers, 10),
  };
}

async function readReferenceDesk(
  db: FirebaseFirestore.Firestore,
  period: ReportPeriod,
): Promise<ReferenceDeskReport> {
  const snap = await windowed(db.collection("chats"), "StartedOn", period).get();

  const concerns = new Map<string, number>();
  const spread = new Map<string, number>();
  let waiting = 0;
  let active = 0;
  let closed = 0;
  let expired = 0;
  let fromGuests = 0;
  let messages = 0;
  let rated = 0;
  let ratingTotal = 0;

  for (const doc of snap.docs) {
    const c = doc.data() as AnyObj;
    const status = String(c.Status ?? "waiting");

    if (status === "closed") {
      closed++;
      if (String(c.ClosedByRole ?? "") === "system") expired++;
    } else if (status === "active") active++;
    else waiting++;

    if (c.IsGuest === true || c.GuestInfo) fromGuests++;
    messages += Number(c.MessageCount) || 0;

    const rating = Number(c.Rating) || 0;
    if (rating > 0) {
      rated++;
      ratingTotal += rating;
      bump(spread, `${rating} star${rating === 1 ? "" : "s"}`);
    }

    bump(concerns, String(c.Concern ?? "Unspecified"));
  }

  return {
    conversations: snap.size,
    waiting,
    active,
    closed,
    expired,
    fromGuests,
    fromPatrons: snap.size - fromGuests,
    messages,
    rated,
    averageRating: rated === 0 ? 0 : Math.round((ratingTotal / rated) * 10) / 10,
    ratingSpread: tally(spread),
    byConcern: tally(concerns),
  };
}

async function readBookRequests(
  db: FirebaseFirestore.Firestore,
  period: ReportPeriod,
): Promise<BookRequestsReport> {
  const snap = await windowed(
    db.collection("bookRequests"),
    "CreatedOn",
    period,
  ).get();

  const titles = new Map<string, number>();
  let underReview = 0;
  let approved = 0;
  let declined = 0;

  for (const doc of snap.docs) {
    const r = doc.data() as AnyObj;
    const status = String(r.Status ?? "Under Review");
    if (status === "Approved") approved++;
    else if (status === "Declined") declined++;
    else underReview++;
    bump(titles, String(r.Title ?? ""));
  }

  return {
    total: snap.size,
    underReview,
    approved,
    declined,
    topTitles: tally(titles, 10),
  };
}

async function readPublishing(
  db: FirebaseFirestore.Firestore,
  period: ReportPeriod,
): Promise<PublishingReport> {
  const snap = await windowed(db.collection("updates"), "CreatedOn", period).get();

  let announcements = 0;
  let news = 0;
  let published = 0;
  let drafts = 0;
  let archived = 0;
  let replies = 0;

  for (const doc of snap.docs) {
    const u = doc.data() as AnyObj;
    if (String(u.Type ?? "") === "News") news++;
    else announcements++;

    const status = String(u.Status ?? "Published");
    if (status === "Draft") drafts++;
    else if (status === "Archived") archived++;
    else published++;

    replies += Array.isArray(u.Replies) ? u.Replies.length : 0;
  }

  return { announcements, news, published, drafts, archived, replies };
}

async function readVisits(
  db: FirebaseFirestore.Firestore,
  period: ReportPeriod,
): Promise<VisitsReport> {
  const days = await db.collection("visits").get();

  const wanted = days.docs.filter((dayDoc) => {
    if (period.from === null || period.to === null) return true;
    const at = Date.parse(`${dayDoc.id.split("_")[0]}T00:00:00+08:00`);
    return !Number.isNaN(at) && at >= period.from && at < period.to;
  });

  const perDay = await Promise.all(
    wanted.map(async (dayDoc) => ({
      date: dayDoc.id.split("_")[0],
      patrons: await dayDoc.ref.collection("patrons").get(),
    })),
  );

  const byDay = new Map<string, number>();
  const visitors = new Set<string>();
  let total = 0;

  for (const { date, patrons } of perDay) {
    for (const patronDoc of patrons.docs) {
      const p = patronDoc.data() as AnyObj;
      const count = p.visits ? Object.keys(p.visits).length : 0;
      if (count === 0) continue;
      total += count;
      visitors.add(patronDoc.id);
      bump(byDay, date, count);
    }
  }

  const ranked = tally(byDay);

  return {
    logging: days.size > 0,
    total,
    uniqueVisitors: visitors.size,
    busiestDay: ranked[0]
      ? { date: ranked[0].label, count: ranked[0].value }
      : null,
    byDay: [...byDay.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

// ==========================================
// || THE READ                              ||
// ==========================================

export async function fetchReportSummary(
  data: AnyObj,
): Promise<ReportSummary> {
  const period = resolvePeriod({
    scope: String(data?.scope ?? "all") as ReportScope,
    year: data?.year === undefined ? undefined : Number(data.year),
    month: data?.month === undefined ? undefined : Number(data.month),
    day: data?.day === undefined ? undefined : Number(data.day),
  });

  const now = Date.now();

  const [
    patrons,
    collection,
    circulation,
    referenceDesk,
    bookRequests,
    publishing,
    visits,
  ] = await Promise.all([
    readPatrons(db, period),
    readCollection(db, period),
    readCirculation(db, period, now),
    readReferenceDesk(db, period),
    readBookRequests(db, period),
    readPublishing(db, period),
    readVisits(db, period),
  ]);

  return {
    period,
    generatedAt: now,
    patrons,
    collection,
    circulation,
    referenceDesk,
    bookRequests,
    publishing,
    visits,
  };
}

export async function fetchReportYears(): Promise<{ years: number[] }> {

  const [tx, patrons, chats] = await Promise.all([
    db
      .collection("lmslogs")
      .doc("transactions")
      .collection("entries")
      .orderBy("ProcessedOn", "asc")
      .limit(1)
      .get(),
    db.collection("patrons").orderBy("CreatedOn", "asc").limit(1).get(),
    db.collection("chats").orderBy("StartedOn", "asc").limit(1).get(),
  ]);

  const earliest = [
    toMillis(tx.docs[0]?.get("ProcessedOn")),
    toMillis(patrons.docs[0]?.get("CreatedOn")),
    toMillis(chats.docs[0]?.get("StartedOn")),
  ].filter((v): v is number => v !== null);

  const thisYear = new Date(Date.now() + PH_OFFSET_MS).getUTCFullYear();
  const firstYear =
    earliest.length === 0
      ? thisYear
      : new Date(Math.min(...earliest) + PH_OFFSET_MS).getUTCFullYear();

  const years: number[] = [];
  for (let year = thisYear; year >= firstYear; year--) years.push(year);
  return { years };
}
