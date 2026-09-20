import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Text } from "@/components/ui/Text";
import type { BookRequestGroup } from "@/features/lms/library-desk/types/book-request-types";

const BAR_COLOR = "#128CF1";

const RANK_STEPS = ["#128CF1", "#1075D0", "#0F5FAF", "#0D488E", "#0B316D"];

const COLUMN_LABEL =
  "whitespace-nowrap text-[10px] font-[gothamMedium] uppercase tracking-wide text-gray-400";

interface RequestsChartProps {
  data: BookRequestGroup[];
  totalTitles: number;
}

function ChartHeader({ caption }: { caption: string }) {
  return (
    <div className="bg-[#003067] px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white"
          >
            <BarChart3 className="size-5" />
          </div>
          <div className="min-w-0">
            <Text
              as="h2"
              className="font-[gothamMedium] text-sm text-white min-[401px]:text-base sm:text-lg"
            >
              Most requested titles
            </Text>
            <Text className="text-[11px] text-white/70 min-[401px]:text-xs sm:text-sm">
              Most-asked-for books still awaiting a decision.
            </Text>
          </div>
        </div>
        <Text className="ml-auto mt-2 shrink-0 pr-1 text-xs font-[gothamMedium] text-white min-[401px]:mt-0 sm:text-sm">
          {caption}
        </Text>
      </div>
    </div>
  );
}

export default function RequestsChart({
  data,
  totalTitles,
}: RequestsChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <ChartHeader caption="Nothing awaiting a decision" />
        <div className="p-10 text-center">
          <Text className="text-sm text-gray-500">
            No book requests yet. Titles patrons ask for on the OPAC appear here.
          </Text>
        </div>
      </section>
    );
  }

  const max = Math.max(...data.map((group) => group.Count), 1);

  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <ChartHeader
        caption={
          data.length >= totalTitles
            ? `All ${totalTitles} ${totalTitles === 1 ? "title" : "titles"}`
            : `Top ${data.length} of ${totalTitles}`
        }
      />

      <div aria-hidden className="hidden px-3 pt-3 sm:px-4 xl:block">
        <div className="grid items-center gap-x-3 border-b border-gray-100 px-4 pb-2 xl:grid-cols-[auto_minmax(8rem,18rem)_1fr_minmax(9rem,13rem)_4.5rem]">
          <span />
          <Text className={COLUMN_LABEL}>Requested title</Text>
          <span />
          <Text className={COLUMN_LABEL}>Author</Text>
          <Text className={`${COLUMN_LABEL} text-center`}>Requests</Text>
        </div>
      </div>

      <ul className="divide-y divide-gray-100 px-3 pb-2 sm:px-4">
        {data.map((group, index) => {
          const pct = (group.Count / max) * 100;
          const active = hovered === group.id;
          return (
            <li
              key={group.id}
              onMouseEnter={() => setHovered(group.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(group.id)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 rounded-lg px-4 py-3.5 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[#128CF1]/40 xl:grid-cols-[auto_minmax(8rem,18rem)_1fr_minmax(9rem,13rem)_4.5rem]"
            >
              <span
                aria-hidden
                className="col-start-1 row-start-1 flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-[gothamBlack] text-white xl:row-auto"
                style={{
                  backgroundColor:
                    RANK_STEPS[Math.min(index, RANK_STEPS.length - 1)],
                }}
              >
                {index + 1}
              </span>

              <Text
                className="col-start-2 row-start-1 min-w-0 truncate text-sm font-[gothamMedium] text-[#011b38] xl:row-auto"
                title={group.Title}
              >
                {group.Title}
              </Text>

              <div className="col-span-2 col-start-2 row-start-2 h-4 min-w-0 rounded-sm bg-gray-100 sm:h-6 xl:col-span-1 xl:col-start-3 xl:row-start-1">
                <div
                  className="h-4 rounded-l-sm rounded-r-[4px] transition-[width] duration-300 sm:h-6"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: BAR_COLOR,
                    opacity: active ? 1 : 0.92,
                  }}
                />
              </div>

              <Text
                className="col-span-2 col-start-2 row-start-3 min-w-0 truncate text-sm text-gray-500 xl:col-span-1 xl:col-start-4 xl:row-start-1 xl:text-left"
                title={group.Author ? `by ${group.Author}` : "Unknown author"}
              >
                {group.Author ? (
                  <>
                    by{" "}
                    <span className="font-[gothamMedium] text-gray-700">
                      {group.Author}
                    </span>
                  </>
                ) : (
                  "Unknown author"
                )}
              </Text>

              <Text className="col-start-3 row-start-1 shrink-0 text-right text-[15px] font-[gothamBlack] tabular-nums text-[#011b38] xl:col-start-5 xl:text-center">
                {group.Count}
              </Text>

              {active && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute -top-1 left-1/2 z-10 w-max max-w-xs -translate-x-1/2 -translate-y-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-lg"
                >
                  <Text className="text-xs font-[gothamMedium] text-[#011b38]">
                    {group.Title}
                  </Text>
                  <Text className="text-[11px] text-gray-500">
                    {group.Author || "Unknown author"}
                  </Text>
                  <Text className="mt-1 text-[11px] text-gray-600">
                    {group.Count} request{group.Count === 1 ? "" : "s"} from{" "}
                    {group.Requesters} patron
                    {group.Requesters === 1 ? "" : "s"}
                  </Text>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
