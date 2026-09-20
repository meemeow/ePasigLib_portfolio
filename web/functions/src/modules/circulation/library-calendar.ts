import { DAY_MS, PH_OFFSET_MS, phDateString, phDayStart } from "./circulation-policy";

type AnyObj = Record<string, any>;

// ==========================================
// || THE CALENDAR                          ||
// ==========================================

const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "New Year's Day",
  "04-09": "Araw ng Kagitingan (Day of Valor)",
  "05-01": "Labor Day",
  "06-12": "Independence Day",

  "07-02": "Araw ng Pasig",

  "08-21": "Ninoy Aquino Day",
  "11-01": "All Saints' Day",
  "11-02": "All Souls' Day",
  "11-30": "Bonifacio Day",
  "12-08": "Feast of the Immaculate Conception of Mary",
  "12-24": "Christmas Eve",
  "12-25": "Christmas Day",
  "12-30": "Rizal Day",
  "12-31": "Last Day of the Year",
};

const MOVABLE_HOLIDAYS: Record<string, Record<string, string>> = {
  "2026": {
    "2026-02-17": "Chinese New Year",
    "2026-03-20": "Eid'l Fitr",
    "2026-04-02": "Maundy Thursday",
    "2026-04-03": "Good Friday",
    "2026-04-04": "Black Saturday",
    "2026-05-27": "Eid'l Adha",
    "2026-08-31": "National Heroes Day",
  },
  "2027": {
    "2027-02-06": "Chinese New Year",
    "2027-03-25": "Maundy Thursday",
    "2027-03-26": "Good Friday",
    "2027-03-27": "Black Saturday",
    "2027-08-30": "National Heroes Day",
  },
};

const DEFAULT_CLOSED_WEEKDAYS = [0];

export interface LibraryCalendar {
  closedWeekdays: number[];
  closures: Record<string, string>;
}

// ==========================================
// || LOADING                               ||
// ==========================================

const CALENDAR_DOC = "library_calendar";
const CALENDAR_TTL_MS = 5 * 60 * 1000;

let cached: { calendar: LibraryCalendar; at: number } | null = null;

function holidaysForYear(year: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [monthDay, name] of Object.entries(FIXED_HOLIDAYS)) {
    out[`${year}-${monthDay}`] = name;
  }
  Object.assign(out, MOVABLE_HOLIDAYS[String(year)] || {});
  return out;
}

export function calendarFrom(data: AnyObj | undefined): LibraryCalendar {
  const year = new Date(Date.now() + PH_OFFSET_MS).getUTCFullYear();
  const closures: Record<string, string> = {
    ...holidaysForYear(year),
    ...holidaysForYear(year + 1),
  };
  let closedWeekdays = [...DEFAULT_CLOSED_WEEKDAYS];

  const raw = (data || {}) as AnyObj;

  if (Array.isArray(raw.ClosedWeekdays)) {
    const parsed = raw.ClosedWeekdays.map(Number).filter(
      (day: number) => Number.isInteger(day) && day >= 0 && day <= 6,
    );
    if (parsed.length === raw.ClosedWeekdays.length) closedWeekdays = parsed;
  }

  const extra = (raw.Closures || {}) as AnyObj;
  for (const [day, reason] of Object.entries(extra)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    if (reason === "") delete closures[day];
    else closures[day] = String(reason);
  }

  return { closedWeekdays, closures };
}

export async function loadCalendar(
  db: FirebaseFirestore.Firestore,
  options?: {
    fresh?: boolean;
  },
): Promise<LibraryCalendar> {
  if (!options?.fresh && cached && Date.now() - cached.at < CALENDAR_TTL_MS) {
    return { ...cached.calendar, closures: { ...cached.calendar.closures } };
  }

  let calendar: LibraryCalendar;
  try {
    const snap = await db.collection("metadata").doc(CALENDAR_DOC).get();
    calendar = calendarFrom(snap.exists ? snap.data() : {});
  } catch (error) {
    console.error("Could not read the library calendar:", error);
    calendar = calendarFrom({});
  }

  cached = { calendar, at: Date.now() };
  return { ...calendar, closures: { ...calendar.closures } };
}

export function clearCalendarCache(): void {
  cached = null;
}

// ==========================================
// || DAY ARITHMETIC                        ||
// ==========================================

function phWeekday(millis: number): number {
  return new Date(millis + PH_OFFSET_MS).getUTCDay();
}

export function isOpenDay(millis: number, calendar: LibraryCalendar): boolean {
  if (calendar.closedWeekdays.includes(phWeekday(millis))) return false;
  return !(phDateString(millis) in calendar.closures);
}

export function closureReason(
  millis: number,
  calendar: LibraryCalendar,
): string | null {
  if (calendar.closedWeekdays.includes(phWeekday(millis))) return "Closed";
  return calendar.closures[phDateString(millis)] ?? null;
}

export function nextOpenDay(millis: number, calendar: LibraryCalendar): number {
  let day = phDayStart(millis);
  for (let i = 0; i < 14; i++) {
    if (isOpenDay(day, calendar)) return day;
    day += DAY_MS;
  }
  return day;
}

export function addOpenDays(
  from: number,
  count: number,
  calendar: LibraryCalendar,
): number {
  let day = phDayStart(from);
  let left = Math.max(0, Math.floor(count));
  for (let guard = 0; guard < left * 7 + 14 && left > 0; guard++) {
    day += DAY_MS;
    if (isOpenDay(day, calendar)) left--;
  }
  return day;
}

export function pickupWindow(
  from: number,
  minDays: number,
  maxDays: number,
  calendar: LibraryCalendar,
): string[] {
  const dates: string[] = [];
  const start = addOpenDays(from, Math.max(1, minDays), calendar);
  const end = addOpenDays(from, Math.max(minDays, maxDays), calendar);

  for (let day = start; day <= end; day += DAY_MS) {
    if (isOpenDay(day, calendar)) dates.push(phDateString(day));
  }
  return dates;
}

export function describeDay(
  millis: number,
  calendar: LibraryCalendar,
): string {
  const reason = closureReason(millis, calendar);
  const day = phDateString(millis);
  return reason && reason !== "Closed" ? `${day} (${reason})` : day;
}

export function closuresForYear(year: number): Record<string, string> {
  return holidaysForYear(year);
}

export { FIXED_HOLIDAYS, MOVABLE_HOLIDAYS, DEFAULT_CLOSED_WEEKDAYS };
