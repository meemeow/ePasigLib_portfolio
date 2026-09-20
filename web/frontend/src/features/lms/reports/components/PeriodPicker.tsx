import { Button } from "@/components/ui/Button";
import { SegmentedRail, segmentClasses } from "@/components/ui/SegmentedRail";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  daysInMonth,
  MONTH_NAMES,
  type ReportPeriodChoice,
  type ReportScope,
} from "@/features/lms/reports/types/report-types";

const SCOPES: { id: ReportScope; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "year", label: "Year" },
  { id: "month", label: "Month" },
  { id: "day", label: "Day" },
];

interface PeriodPickerProps {
  value: ReportPeriodChoice;
  onChange: (value: ReportPeriodChoice) => void;
  years: number[];
  disabled?: boolean;
}

export default function PeriodPicker({
  value,
  onChange,
  years,
  disabled = false,
}: PeriodPickerProps) {
  const yearOptions = years.length > 0 ? years : [value.year];

  const set = (patch: Partial<ReportPeriodChoice>) => {
    const next = { ...value, ...patch };
    const limit = daysInMonth(next.year, next.month);
    if (next.day > limit) next.day = limit;
    onChange(next);
  };

  const control = `${COMPACT_CONTROL} w-full sm:w-auto`;

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <SegmentedRail
        activeKey={value.scope}
        ariaLabel="Report period"
        className="flex w-full flex-wrap items-center gap-1 rounded-full border bg-white p-1 shadow-sm sm:w-auto"
      >
        {SCOPES.map((scope) => (
          <Button
            key={scope.id}
            type="button"
            variant={null}
            size={null}
            aria-pressed={value.scope === scope.id}
            data-segment-active={value.scope === scope.id}
            disabled={disabled}
            onClick={() => set({ scope: scope.id })}
            className={`flex-1 bg-transparent sm:flex-none ${segmentClasses(
              value.scope === scope.id,
            )} ${value.scope === scope.id ? "hover:bg-transparent" : ""}`}
          >
            {scope.label}
          </Button>
        ))}
      </SegmentedRail>

      {value.scope !== "all" && (
        <Select
          value={String(value.year)}
          onValueChange={(next) => set({ year: Number(next) })}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label="Year"
            className={`${control} border-gray-200 bg-white text-sm`}
          >
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)} className="text-sm">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(value.scope === "month" || value.scope === "day") && (
        <Select
          value={String(value.month)}
          onValueChange={(next) => set({ month: Number(next) })}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label="Month"
            className={`${control} border-gray-200 bg-white text-sm`}
          >
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, index) => (
              <SelectItem
                key={name}
                value={String(index + 1)}
                className="text-sm"
              >
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.scope === "day" && (
        <Select
          value={String(value.day)}
          onValueChange={(next) => set({ day: Number(next) })}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label="Day"
            className={`${control} border-gray-200 bg-white text-sm`}
          >
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            {Array.from(
              { length: daysInMonth(value.year, value.month) },
              (_, index) => index + 1,
            ).map((day) => (
              <SelectItem key={day} value={String(day)} className="text-sm">
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
