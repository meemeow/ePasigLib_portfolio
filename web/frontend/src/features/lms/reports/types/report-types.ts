export type ReportScope = "all" | "year" | "month" | "day";

export interface ReportPeriodChoice {
  scope: ReportScope;
  year: number;
  month: number;
  day: number;
}

export interface ReportPeriod {
  scope: ReportScope;
  from: number | null;
  to: number | null;
  label: string;
}

export interface ReportTally {
  label: string;
  value: number;
}

export interface PatronsReport {
  total: number;
  active: number;
  archived: number;
  verified: number;
  unverified: number;
  rejected: number;
  registered: number;
  standing: ReportTally[];
  residency: ReportTally[];
  byBarangay: ReportTally[];
}

export interface CollectionReport {
  titles: number;
  copies: number;
  available: number;
  borrowed: number;
  archived: number;
  archivedCopies: number;
  withoutCopies: number;
  added: number;
  byClassCode: ReportTally[];
  byMaterialType: ReportTally[];
  bySection: ReportTally[];
}

export interface CirculationReport {
  checkouts: number;
  returns: number;
  renewals: number;
  reservations: number;
  transactions: number;
  onLoanNow: number;
  overdueNow: number;
  dueTodayNow: number;
  onHoldNow: number;
  reservationOutcomes: ReportTally[];
  lateReturns: number;
  topTitles: ReportTally[];
  topBorrowers: ReportTally[];
}

export interface ReferenceDeskReport {
  conversations: number;
  waiting: number;
  active: number;
  closed: number;
  expired: number;
  fromGuests: number;
  fromPatrons: number;
  messages: number;
  rated: number;
  averageRating: number;
  ratingSpread: ReportTally[];
  byConcern: ReportTally[];
}

export interface BookRequestsReport {
  total: number;
  underReview: number;
  approved: number;
  declined: number;
  topTitles: ReportTally[];
}

export interface PublishingReport {
  announcements: number;
  news: number;
  published: number;
  drafts: number;
  archived: number;
  replies: number;
}

export interface VisitsReport {
  logging: boolean;
  total: number;
  uniqueVisitors: number;
  busiestDay: { date: string; count: number } | null;
  byDay: ReportTally[];
}

export interface ReportSummary {
  period: ReportPeriod;
  generatedAt: number;
  patrons: PatronsReport;
  collection: CollectionReport;
  circulation: CirculationReport;
  referenceDesk: ReferenceDeskReport;
  bookRequests: BookRequestsReport;
  publishing: PublishingReport;
  visits: VisitsReport;
}

export type ReportSection =
  | "overview"
  | "circulation"
  | "collection"
  | "patrons"
  | "reference-desk"
  | "visits";

export const MONTH_NAMES = [
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

export function manilaToday(): { year: number; month: number; day: number } {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function defaultPeriod(): ReportPeriodChoice {
  const today = manilaToday();
  return { scope: "all", ...today };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatGeneratedAt(millis: number): string {
  if (!Number.isFinite(millis)) return "—";
  return new Date(millis).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
