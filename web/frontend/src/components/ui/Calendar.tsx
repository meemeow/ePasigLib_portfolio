import { MONTH_NAMES as MONTHS } from "@/lib/format/date";
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  onClose?: () => void;
  maxDate?: Date;
  minDate?: Date;
  initialMonth?: Date;
  allowedDates?: string[];
}


const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const getYearRange = (centerYear: number, range: number = 6) => {
  const start = centerYear - range;
  const end = start + 11;
  const years = [];
  for (let i = start; i <= end; i++) {
    years.push(i);
  }
  return years;
};

const yearHasSelectableDays = (year: number, minDate: Date | undefined, maxDate: Date | undefined) => {
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m, d);
      if (maxDate && date > maxDate) continue;
      if (minDate && date < minDate) continue;
      return true;
    }
  }
  return false;
};

const toYMD = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function Calendar({
  selected,
  onSelect,
  onClose,
  maxDate,
  minDate,
  initialMonth,
  allowedDates,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    initialMonth || new Date()
  );
  const [viewMode, setViewMode] = React.useState<"days" | "months" | "years">("days");
  const [yearViewOffset, setYearViewOffset] = React.useState(0);

  const effectiveMinDate = minDate || (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return d;
  })();

  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

  const daysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const isSelected = (date: Date) => {
    if (!selected) return false;
    return isSameDay(date, selected);
  };

  const allowed = React.useMemo(
    () => (allowedDates ? new Set(allowedDates) : null),
    [allowedDates],
  );

  const isDisabledDate = (date: Date) => {
    if (maxDate && date > maxDate) return true;
    if (effectiveMinDate && date < effectiveMinDate) return true;
    if (allowed && !allowed.has(toYMD(date))) return true;
    return false;
  };

  const isMonthDisabled = (month: number, year: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (!isDisabledDate(date)) return false;
    }
    return true;
  };

  const isYearDisabled = (year: number) => {
    for (let m = 0; m < 12; m++) {
      if (!isMonthDisabled(m, year)) return false;
    }
    return true;
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentYear, currentMonthIndex, day);
    if (isDisabledDate(date)) return;
    if (onSelect) {
      onSelect(date);
    }
    if (onClose) {
      setTimeout(onClose, 200);
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(new Date(currentYear, monthIndex, 1));
    setViewMode("days");
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(new Date(year, currentMonthIndex, 1));
    setViewMode("months");
  };

  const handleHeaderClick = () => {
    if (viewMode === "days") {
      setViewMode("months");
    } else if (viewMode === "months") {
      setViewMode("years");
      setYearViewOffset(0);
    } else {
      setViewMode("months");
    }
  };

  const handlePrev = () => {
    if (viewMode === "days") {
      setCurrentMonth(
        new Date(currentYear, currentMonthIndex - 1, 1)
      );
    } else if (viewMode === "months") {
      setCurrentMonth(
        new Date(currentYear - 1, currentMonthIndex, 1)
      );
    } else {
      setYearViewOffset(yearViewOffset - 12);
    }
  };

  const handleNext = () => {
    if (viewMode === "days") {
      setCurrentMonth(
        new Date(currentYear, currentMonthIndex + 1, 1)
      );
    } else if (viewMode === "months") {
      setCurrentMonth(
        new Date(currentYear + 1, currentMonthIndex, 1)
      );
    } else {
      setYearViewOffset(yearViewOffset + 12);
    }
  };

  const canGoPrev = () => {
    if (viewMode === "days") {
      const prevMonth = new Date(currentYear, currentMonthIndex - 1, 1);
      const daysInPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= daysInPrevMonth; d++) {
        const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), d);
        if (!isDisabledDate(date)) return true;
      }
      return false;
    } else if (viewMode === "months") {
      const year = currentYear - 1;
      return !isYearDisabled(year);
    } else {
      const prevOffset = yearViewOffset - 12;
      const centerYear = currentYear + prevOffset;
      const yearRange = getYearRange(centerYear, 6);
      return yearRange.some(year => yearHasSelectableDays(year, effectiveMinDate, maxDate));
    }
  };

  const canGoNext = () => {
    if (viewMode === "days") {
      const nextMonth = new Date(currentYear, currentMonthIndex + 1, 1);
      const daysInNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= daysInNextMonth; d++) {
        const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), d);
        if (!isDisabledDate(date)) return true;
      }
      return false;
    } else if (viewMode === "months") {
      const year = currentYear + 1;
      return !isYearDisabled(year);
    } else {
      const nextOffset = yearViewOffset + 12;
      const centerYear = currentYear + nextOffset;
      const yearRange = getYearRange(centerYear, 6);
      return yearRange.some(year => yearHasSelectableDays(year, effectiveMinDate, maxDate));
    }
  };

  const renderDaysView = () => {
    const totalDays = daysInMonth(currentMonth);
    const startDay = firstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-9 w-9" />
      );
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonthIndex, day);
      const disabled = isDisabledDate(date);
      const selected = isSelected(date);
      const today = isToday(date);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          disabled={disabled}
          className={cn(
            "h-9 w-9 rounded-md text-sm transition-colors",
            "hover:bg-[#002248] hover:text-white",
            "focus:outline-none focus:ring-2 focus:ring-[#128CF1]",
            disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-inherit",
            selected && "bg-[#002248] text-white",
            today && !selected && "border border-[#002248] text-[#002248] font-medium",
            !selected && !today && !disabled && "text-gray-900",
            !selected && !today && disabled && "text-gray-400"
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const renderMonthsView = () => {
    const months = [];
    const year = currentYear;

    for (let i = 0; i < 12; i++) {
      const disabled = isMonthDisabled(i, year);
      const isCurrentMonth = i === currentMonthIndex;

      months.push(
        <button
          key={i}
          type="button"
          onClick={() => handleMonthSelect(i)}
          disabled={disabled}
          className={cn(
            "h-12 w-full rounded-md text-sm transition-colors",
            "hover:bg-[#002248] hover:text-white",
            "focus:outline-none focus:ring-2 focus:ring-[#128CF1]",
            disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-inherit",
            isCurrentMonth && !disabled && "bg-[#002248] text-white font-medium",
            !disabled && !isCurrentMonth && "text-gray-900"
          )}
        >
          {MONTHS[i].slice(0, 3)}
        </button>
      );
    }

    return months;
  };

  const renderYearsView = () => {
    const years = [];
    const centerYear = currentYear + yearViewOffset;
    const yearRange = getYearRange(centerYear, 6);

    for (const year of yearRange) {
      const disabled = isYearDisabled(year);
      const isCurrentYear = year === currentYear;

      years.push(
        <button
          key={year}
          type="button"
          onClick={() => handleYearSelect(year)}
          disabled={disabled}
          className={cn(
            "h-12 w-full rounded-md text-sm transition-colors",
            "hover:bg-[#002248] hover:text-white",
            "focus:outline-none focus:ring-2 focus:ring-[#128CF1]",
            disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-inherit",
            isCurrentYear && !disabled && "bg-[#002248] text-white font-medium",
            !disabled && !isCurrentYear && "text-gray-900"
          )}
        >
          {year}
        </button>
      );
    }

    return years;
  };

  const getHeaderText = () => {
    if (viewMode === "days") {
      return `${MONTHS[currentMonthIndex]} ${currentYear}`;
    } else if (viewMode === "months") {
      return `${currentYear}`;
    } else {
      const centerYear = currentYear + yearViewOffset;
      const start = centerYear - 6;
      const end = start + 11;
      return `${start} – ${end}`;
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev()}
          className={cn(
            "p-1 rounded-md transition-colors",
            canGoPrev() ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-5 w-5 text-[#002248]" />
        </button>

        <button
          type="button"
          onClick={handleHeaderClick}
          className="text-sm font-medium text-[#002248] hover:underline transition-colors px-2 py-1 rounded hover:bg-gray-100"
        >
          {getHeaderText()}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext()}
          className={cn(
            "p-1 rounded-md transition-colors",
            canGoNext() ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-5 w-5 text-[#002248]" />
        </button>
      </div>

      {viewMode === "days" && (
        <>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="h-9 w-9 flex items-center justify-center text-xs font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderDaysView()}
          </div>

          {(() => {
            const today = new Date();
            const todayDisabled = isDisabledDate(today);
            if (todayDisabled) return null;
            return (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    if (!isDisabledDate(today)) {
                      if (onSelect) onSelect(today);
                      if (onClose) setTimeout(onClose, 200);
                    }
                  }}
                  className="text-xs text-[#128CF1] hover:underline transition-colors"
                >
                  Today
                </button>
              </div>
            );
          })()}
        </>
      )}

      {viewMode === "months" && (
        <div className="grid grid-cols-3 gap-2 py-2">
          {renderMonthsView()}
        </div>
      )}

      {viewMode === "years" && (
        <div className="grid grid-cols-3 gap-2 py-2">
          {renderYearsView()}
        </div>
      )}
    </div>
  );
}
