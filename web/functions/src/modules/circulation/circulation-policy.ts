import * as admin from "firebase-admin";

import type { LibraryCalendar } from "./library-calendar";
import { unreadIncrements } from "../notifications/notification-common";
import { Timestamp, serverTimestamp } from "../../core/firebase";

// Re-exported so the circulation modules keep importing their vocabulary
// from one place.
export { BATCH_LIMIT, chunk } from "../../core/batch";
export { toDateSafe } from "../../core/time";

type AnyObj = Record<string, any>;

// ==========================================
// || POLICY                                ||
// ==========================================

export interface CirculationPolicy {
  LoanPeriodDays: number;
  MaxRenewals: number;
  RenewalPeriodDays: number;
  RenewalNotBeforeDays: number;
  MaxActiveLoans: number;
  HoldRequestExpiryHours: number;
  PickupWindowDays: number;
  PickupCutoffHour: number;
  LongOverdueDays: number;
  AssumedLostDays: number;
  MaxWeeklySuggestions: number;
  SuggestionWindowDays: number;
  MaxCartItems: number;
  MaxSavedItems: number;
}

export const DEFAULT_POLICY: CirculationPolicy = {
  LoanPeriodDays: 14,
  MaxRenewals: 1,
  RenewalPeriodDays: 7,
  RenewalNotBeforeDays: 3,
  MaxActiveLoans: 3,
  HoldRequestExpiryHours: 24,
  PickupWindowDays: 3,
  PickupCutoffHour: 16,
  LongOverdueDays: 7,
  AssumedLostDays: 14,
  MaxWeeklySuggestions: 3,
  SuggestionWindowDays: 7,
  MaxCartItems: 10,
  MaxSavedItems: 50,
};

export const POLICY_DOC = "circulation_policy";

export const SUGGESTIONS_COLLECTION = "bookRequests";

const POLICY_TTL_MS = 60 * 1000;

let cachedPolicy: CirculationPolicy | null = null;
let cachedPolicyAt = 0;

export async function loadPolicy(
  db: FirebaseFirestore.Firestore,
): Promise<CirculationPolicy> {
  if (cachedPolicy && Date.now() - cachedPolicyAt < POLICY_TTL_MS) {
    return { ...cachedPolicy };
  }

  try {
    const snap = await db.collection("metadata").doc(POLICY_DOC).get();
    const out = { ...DEFAULT_POLICY };
    if (snap.exists) {
      const raw = (snap.data() || {}) as AnyObj;
      for (const key of Object.keys(
        DEFAULT_POLICY,
      ) as (keyof CirculationPolicy)[]) {
        const value = Number(raw[key]);
        if (Number.isFinite(value) && value >= 0) out[key] = value;
      }
    }
    cachedPolicy = out;
    cachedPolicyAt = Date.now();
    return { ...out };
  } catch (error) {
    console.error("Failed to load circulation policy, using defaults:", error);
    return { ...DEFAULT_POLICY };
  }
}

// ==========================================
// || DOCUMENT PATHS                        ||
// ==========================================

export const TRANSACTIONS_DOC = "transactions";
export const CIRCULATIONS_DOC = "circulations";
export const ENTRIES = "entries";
export const PATRONS = "patrons";
export const LOANS = "loans";
export const HOLDS = "holds";
export const RETURNS = "returns";

export function transactionsRef(db: FirebaseFirestore.Firestore) {
  return db.collection("lmslogs").doc(TRANSACTIONS_DOC).collection(ENTRIES);
}

export function patronCircRef(db: FirebaseFirestore.Firestore, patronUID: string) {
  return db
    .collection("lmslogs")
    .doc(CIRCULATIONS_DOC)
    .collection(PATRONS)
    .doc(circKey(patronUID));
}

export function loansRef(db: FirebaseFirestore.Firestore, patronUID: string) {
  return patronCircRef(db, patronUID).collection(LOANS);
}

export function holdsRef(db: FirebaseFirestore.Firestore, patronUID: string) {
  return patronCircRef(db, patronUID).collection(HOLDS);
}

export function returnsRef(db: FirebaseFirestore.Firestore, patronUID: string) {
  return patronCircRef(db, patronUID).collection(RETURNS);
}

export function circKey(patronUID: string): string {
  return `CIRC_PATRN_${patronUID}`;
}

export function borrowId(accession: string): string {
  return String(accession);
}

export function holdId(accession: string): string {
  return String(accession);
}

export function returnId(accession: string, when: Date | number): string {
  const ms = typeof when === "number" ? when : when.getTime();
  const t = new Date(ms + PH_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
  const time = `${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())}`;
  return `${accession}_${day}-${time}`;
}

async function allocateSequentialId(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  counterDoc: string,
  prefix: string,
  count: number,
): Promise<{ ids: string[]; commit: () => void }> {
  const metaRef = db.collection("metadata").doc(counterDoc);
  const snap = await tx.get(metaRef);
  const start = snap.exists ? Number((snap.data() as AnyObj)?.nextUID) || 1 : 1;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(`${prefix}${String(start + i).padStart(7, "0")}`);
  }
  return {
    ids,
    commit: () => tx.set(metaRef, { nextUID: start + count }, { merge: true }),
  };
}

export async function allocateReservationId(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  count = 1,
): Promise<{ ids: string[]; commit: () => void }> {
  return allocateSequentialId(tx, db, "reservation", "CIRC_RSRVN_", count);
}

export async function allocateTransactionId(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  count = 1,
): Promise<{ ids: string[]; commit: () => void }> {
  return allocateSequentialId(tx, db, "transaction", "CIRC_TRNSC_", count);
}

// ==========================================
// || DATES                                 ||
// ==========================================

export const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const RESERVATION_RETENTION_DAYS = 90;

export const SETTLED_RESERVATION_STATUSES = [
  "Cancelled",
  "Rejected",
  "Fulfilled",
  "Expired",
] as const;

export function reservationPurgeAt(
  now: number = Date.now(),
): admin.firestore.Timestamp {
  return Timestamp.fromMillis(
    now + RESERVATION_RETENTION_DAYS * DAY_MS,
  );
}

export function phDateString(date: Date | number): string {
  const ms = typeof date === "number" ? date : date.getTime();
  const shifted = new Date(ms + PH_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function phDayStart(value: Date | number): number {
  const ms = typeof value === "number" ? value : value.getTime();
  return Math.floor((ms + PH_OFFSET_MS) / DAY_MS) * DAY_MS - PH_OFFSET_MS;
}

export function phDayEnd(value: Date | number): number {
  return phDayStart(value) + DAY_MS - 1;
}

export function dayStringToMillis(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - PH_OFFSET_MS;
}


export function isWeekend(millis: number): boolean {
  const shifted = new Date(millis + PH_OFFSET_MS);
  const day = shifted.getUTCDay();
  return day === 0 || day === 6;
}

export function formatDateLong(value: Date | number | string): string {
  const date =
    typeof value === "string" ? new Date(dayStringToMillis(value) ?? Date.parse(value)) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const shifted = new Date(date.getTime() + PH_OFFSET_MS);
  return `${MONTHS[shifted.getUTCMonth()]} ${shifted.getUTCDate()}, ${shifted.getUTCFullYear()}`;
}

// ==========================================
// || LOAN STAGES                           ||
// ==========================================

export type LoanStage = "Borrowed" | "Overdue" | "LongOverdue" | "AssumedLost";

export const LOAN_STAGE_ORDER: LoanStage[] = [
  "Borrowed",
  "Overdue",
  "LongOverdue",
  "AssumedLost",
];

function daysLateFor(
  due: number,
  now: number,
  calendar?: LibraryCalendar,
): number {
  const dueDay = phDayStart(due);
  const today = phDayStart(now);
  if (today <= dueDay) return 0;
  if (!calendar) return Math.floor((today - dueDay) / DAY_MS);

  let late = 0;
  for (let day = dueDay + DAY_MS; day <= today; day += DAY_MS) {
    const weekday = new Date(day + PH_OFFSET_MS).getUTCDay();
    if (calendar.closedWeekdays.includes(weekday)) continue;
    if (phDateString(day) in calendar.closures) continue;
    late++;
  }
  return late;
}

export function renewalOpensAt(
  due: number,
  policy: CirculationPolicy,
): number {
  return phDayStart(due) - policy.RenewalNotBeforeDays * DAY_MS;
}

export function stageFor(
  dueDate: Date | number | null,
  now: number,
  policy: CirculationPolicy,
  calendar?: LibraryCalendar,
): LoanStage {
  if (dueDate === null) return "Borrowed";
  const due = typeof dueDate === "number" ? dueDate : dueDate.getTime();
  const daysLate = daysLateFor(due, now, calendar);
  if (daysLate <= 0) return "Borrowed";
  if (daysLate >= policy.AssumedLostDays) return "AssumedLost";
  if (daysLate >= policy.LongOverdueDays) return "LongOverdue";
  return "Overdue";
}

export function stageAdvanced(current: string, next: LoanStage): boolean {
  const a = LOAN_STAGE_ORDER.indexOf(current as LoanStage);
  const b = LOAN_STAGE_ORDER.indexOf(next);
  return b > (a < 0 ? 0 : a);
}

// ==========================================
// || PATRON STATE LADDER                   ||
// ==========================================

export const STATE_LADDER: Record<string, string> = {
  Verified: "Watchlisted",
  Watchlisted: "Warning",
  Warning: "Suspended",
};

export const BORROWING_STATES = ["Verified", "Watchlisted", "Warning"];

export function nextState(current: string): string {
  return STATE_LADDER[current] || current;
}

export function notifyStandingChange(
  before: string,
  after: string,
): { title: string; content: string; type: string } {
  if (after === "Suspended") {
    return {
      title: "Account Suspended",
      content:
        `Your account standing has moved from "${before}" to "Suspended" because of an overdue book.\n` +
        "A suspended account cannot borrow, reserve or renew, and this is permanent — there is no path back up the ladder.\n" +
        "Any books you still have out remain the library's property. Please return them.",
      type: "violation",
    };
  }
  return {
    title: "Account Standing Changed",
    content:
      `Because of an overdue book, your account standing moved from "${before}" to "${after}".\n` +
      `Progression: ${BORROWING_STATES.join(" → ")} → Suspended.\n` +
      "Suspension is permanent and cannot be reversed, so please return any overdue items before your standing reaches it.",
    type: "violation",
  };
}

// ==========================================
// || COPY AVAILABILITY                     ||
// ==========================================

export type Availability =
  | "Available"
  | "Pending"
  | "Reserved"
  | "Borrowed"
  | "Lost";

export const COPY_TRAPPED_STATES = ["Pending", "Reserved", "Borrowed"] as const;

export function isLendable(copy: AnyObj | null | undefined): boolean {
  if (!copy) return false;
  const flag = copy.ForLibraryUse;
  if (flag === true) return false;
  const text = String(flag).toLowerCase();
  return text !== "true" && text !== "yes";
}

export function isAvailable(copy: AnyObj | null | undefined): boolean {
  return isLendable(copy) && String(copy?.Availability || "") === "Available";
}

export function isTrapped(copy: AnyObj | null | undefined): boolean {
  return (COPY_TRAPPED_STATES as readonly string[]).includes(
    String(copy?.Availability || ""),
  );
}

// ==========================================
// || NOTIFICATIONS                         ||
// ==========================================

export async function notifyPatron(
  db: FirebaseFirestore.Firestore,
  patronDocId: string,
  notification: {
    title: string;
    content: string;
    type: string;
    pressable?: boolean;
    targetId?: string;
  },
): Promise<void> {
  try {
    const patronRef = db.collection("patrons").doc(patronDocId);
    const batch = db.batch();
    batch.set(patronRef.collection("notifications").doc(), {
      ...notification,
      pressable: notification.pressable ?? false,
      isUpdate: false,
      date: serverTimestamp(),
      read: false,
    });
    batch.set(patronRef, unreadIncrements(notification.type, 1), {
      merge: true,
    });
    await batch.commit();
  } catch (error) {
    console.error(`Failed to notify patron ${patronDocId}:`, error);
  }
}

export async function resolvePatronDocId(
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<string | null> {
  const clean = String(uid ?? "").trim();
  if (!clean) return null;
  try {
    const direct = await db.collection("patrons").doc(clean).get();
    if (direct.exists) return direct.id;
    const found = await db
      .collection("patrons")
      .where("UID", "==", clean)
      .limit(1)
      .get();
    return found.empty ? null : found.docs[0].id;
  } catch (error) {
    console.error(`Could not resolve patron ${clean}:`, error);
    return null;
  }
}

export async function notifyPatronByUid(
  db: FirebaseFirestore.Firestore,
  uid: string,
  notification: {
    title: string;
    content: string;
    type: string;
    pressable?: boolean;
    targetId?: string;
  },
): Promise<void> {
  const docId = await resolvePatronDocId(db, uid);
  if (!docId) return;
  await notifyPatron(db, docId, notification);
}

