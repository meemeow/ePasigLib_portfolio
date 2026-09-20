import {
  CirculationPolicy,
  DAY_MS,
  PH_OFFSET_MS,
  phDayEnd,
  phDayStart,
} from "./circulation-policy";
import {
  addOpenDays,
  isOpenDay,
  nextOpenDay,
  type LibraryCalendar,
} from "./library-calendar";

function phHour(millis: number): number {
  return new Date(millis + PH_OFFSET_MS).getUTCHours();
}

export interface PickupWindow {
  from: number;
  until: number;
}

export function pickupWindowFor(
  approvedAt: number,
  policy: CirculationPolicy,
  calendar: LibraryCalendar,
): PickupWindow {
  const sameDay =
    isOpenDay(approvedAt, calendar) &&
    phHour(approvedAt) < policy.PickupCutoffHour;

  const from = sameDay
    ? phDayStart(approvedAt)
    : nextOpenDay(phDayStart(approvedAt) + DAY_MS, calendar);

  const until = phDayEnd(
    addOpenDays(from, Math.max(0, policy.PickupWindowDays - 1), calendar),
  );

  return { from, until };
}

export function dueWithGrace(
  millis: number,
  calendar: LibraryCalendar,
): number {
  return phDayEnd(nextOpenDay(millis, calendar));
}

export function renewedDueDate(
  due: number,
  days: number,
  calendar: LibraryCalendar,
): number {
  return dueWithGrace(phDayEnd(due) + days * DAY_MS, calendar);
}
