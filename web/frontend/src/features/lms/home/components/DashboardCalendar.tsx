import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { buildMonthGrid } from "@/features/lms/home/api/home-helpers";

const WEEKDAYS = [
  { short: "Sun", full: "Sunday" },
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
];

const startOfThisMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export default function DashboardCalendar() {
  const [month, setMonth] = useState(startOfThisMonth);

  const cells = useMemo(() => buildMonthGrid(month), [month]);

  const title = month.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) =>
    setMonth((current) => {
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });

  const isThisMonth = month.getTime() === startOfThisMonth().getTime();

  return (
    <section className="flex h-full flex-col rounded-2xl border border-blue-100 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5 xl:px-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-4">
          <Text className="whitespace-nowrap text-base font-[gothamMedium] text-[#011b38] sm:text-lg">
            {title}
          </Text>
          {!isThisMonth && (
            <Button
              variant="link"
              onClick={() => setMonth(startOfThisMonth())}
              className="h-auto whitespace-nowrap p-0 text-sm font-semibold text-[#128CF1] hover:text-[#002248] hover:no-underline"
            >
              Back to today
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="my-auto grid grid-cols-7 grid-rows-[auto_repeat(6,3.25rem)] overflow-hidden rounded-lg border border-[#002248]/30">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday.short}
            className="border-b border-[#002248]/30 px-1 py-2 text-center text-[10px] uppercase tracking-wider text-gray-400"
          >
            <abbr title={weekday.full} className="no-underline">
              {weekday.short}
            </abbr>
          </div>
        ))}

        {cells.map((cell) => (
          <div
            key={cell.key}
            className="flex items-start justify-end border-b border-r border-[#002248]/30 p-1.5 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0"
          >
            {cell.isToday ? (
              <Text className="flex size-6 items-center justify-center rounded-full bg-[#128CF1] text-xs font-[gothamMedium] text-white">
                {cell.day}
              </Text>
            ) : (
              <Text
                className={`flex size-6 items-center justify-center text-xs ${
                  cell.inMonth ? "text-[#011b38]" : "text-gray-300"
                }`}
              >
                {cell.day}
              </Text>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
