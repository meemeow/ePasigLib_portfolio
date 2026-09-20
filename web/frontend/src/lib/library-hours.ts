const OPEN_HOUR = 7;
const CLOSE_HOUR = 18;

export const OPENING_TIME = "07:00 AM";
export const CLOSING_TIME = "06:00 PM";
export const OPEN_DAYS = "Monday – Saturday";

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

const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

function phParts(now: Date) {
  const shifted = new Date(now.getTime() + PH_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
  };
}

function phDayStart(ms: number): number {
  const DAY = 24 * 60 * 60 * 1000;
  return Math.floor((ms + PH_OFFSET_MS) / DAY) * DAY - PH_OFFSET_MS;
}

export type RuntimeClosures = Record<string, string>;

export function phDateKey(date: Date): string {
  const { year, month, date: day } = phParts(date);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function holidayOn(
  date: Date,
  closures: RuntimeClosures = {},
): string | null {
  const key = phDateKey(date);
  if (key in closures) return closures[key] || null;

  const { year, month, date: day } = phParts(date);
  const monthDay = `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return (
    MOVABLE_HOLIDAYS[String(year)]?.[`${year}-${monthDay}`] ??
    FIXED_HOLIDAYS[monthDay] ??
    null
  );
}

export function msUntilStatusChange(now: Date = new Date()): number {
  const HOUR = 60 * 60 * 1000;
  const t = now.getTime();
  const midnight = phDayStart(t);
  const boundaries = [
    midnight + OPEN_HOUR * HOUR,
    midnight + CLOSE_HOUR * HOUR,
    midnight + 24 * HOUR,
  ];
  for (const at of boundaries) if (at > t) return at - t;
  return 24 * HOUR;
}

export interface LibraryStatus {
  isClosed: boolean;
  statusText: "Open" | "Closed";
  statusDetail: string;
  holidayName: string | null;
  formattedDate: string;
  shortDate: string;
}

export function libraryStatus(
  now: Date = new Date(),
  closures: RuntimeClosures = {},
): LibraryStatus {
  const holidayName = holidayOn(now, closures);

  const { weekday, hour } = phParts(now);
  const isSunday = weekday === 0;
  const beforeOpening = hour < OPEN_HOUR;
  const afterClosing = hour >= CLOSE_HOUR;
  const isClosed = isSunday || holidayName !== null || beforeOpening || afterClosing;

  const statusDetail = holidayName
    ? `Closed for ${holidayName}`
    : isSunday
      ? "Closed on Sundays"
      : beforeOpening
        ? `Opens at ${OPENING_TIME}`
        : afterClosing
          ? `Closed until ${OPENING_TIME}`
          : `Open until ${CLOSING_TIME}`;

  return {
    isClosed,
    statusText: isClosed ? "Closed" : "Open",
    statusDetail,
    holidayName,
    formattedDate: now.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    shortDate: now.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}
