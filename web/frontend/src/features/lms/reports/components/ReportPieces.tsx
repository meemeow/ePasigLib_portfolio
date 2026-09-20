import type { ReactNode } from "react";
import { CalendarRange } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import type { ReportTally } from "@/features/lms/reports/types/report-types";
import { useReports } from "@/features/lms/reports/api/reports-logic";

export type StatKind = "period" | "now";

interface StatTileProps {
  label: string;
  value: number | string;
  kind?: StatKind;
  hint?: string;
  icon?: ReactNode;
}

export function StatTile({
  label,
  value,
  kind = "period",
  hint,
  icon,
}: StatTileProps) {
  const { refreshing } = useReports();

  return (
    <div
      className="flex min-w-0 flex-col gap-1 rounded-xl border border-gray-200 bg-white px-4 py-6 transition-colors hover:border-[#128CF1]/30"
    >
      <div className="flex items-start justify-between gap-2">
        <Text
          as="div"
          className="min-w-0 text-xs font-[gothamMedium] uppercase tracking-wide text-gray-500"
        >
          {label}
        </Text>
        {icon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1] [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>

      {refreshing ? (
        <Skeleton className="h-9 w-20 rounded-lg" />
      ) : (
        <Text
          as="div"
          className="font-[gothamBlack] text-3xl tabular-nums text-[#003067]"
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </Text>
      )}

      {hint ? (
        <Text className="text-xs leading-snug text-gray-500">{hint}</Text>
      ) : null}

      {kind === "now" ? (
        <Text className="text-[10px] font-[gothamMedium] uppercase tracking-wider text-amber-600">
          As of now
        </Text>
      ) : null}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  hasSnapshot?: boolean;
  fullRow?: boolean;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  icon,
  hasSnapshot = false,
  fullRow = false,
  action,
  children,
}: SectionCardProps) {
  const { summary, refreshing } = useReports();

  return (
    <section
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-24px_rgba(0,48,103,0.45)] ${
        fullRow ? "xl:col-span-2" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#003067] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white [&_svg]:size-5">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <Text
              as="h2"
              className="font-[gothamMedium] text-base text-white sm:text-lg"
            >
              {title}
            </Text>
            {description ? (
              <Text className="mt-0.5 text-xs leading-relaxed text-white/70 sm:text-sm">
                {description}
              </Text>
            ) : null}
          </div>
        </div>
        {action}
      </div>

      <div className="p-5 sm:p-6">{children}</div>

      <div className="flex shrink-0 items-center gap-3 border-t bg-white px-5 py-4 sm:px-6">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:size-10">
          <CalendarRange className="size-4 md:size-5" />
        </div>
        <div className="min-w-0">
          {refreshing ? (
            <Skeleton className="h-5 w-44 rounded md:h-6" />
          ) : (
            <Text className="font-[gothamMedium] text-sm text-[#003067] md:text-base">
              Covering {summary?.period.label ?? "the selected period"}
            </Text>
          )}
          <Text className="text-xs leading-snug text-gray-500 md:text-sm">
            {hasSnapshot ? (
              <>
                Includes figures marked{" "}
                <span className="font-[gothamMedium] uppercase tracking-wider text-amber-600">
                  as of now
                </span>
                .
              </>
            ) : (
              "Every figure counted from this period."
            )}
          </Text>
        </div>
      </div>
    </section>
  );
}

export function StatGrid({
  children,
  wide = 4,
}: {
  children: ReactNode;
  wide?: 2 | 3 | 4;
}) {
  const columns =
    wide === 2
      ? "lg:grid-cols-2"
      : wide === 3
        ? "lg:grid-cols-3"
        : "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${columns}`}>
      {children}
    </div>
  );
}

interface TallyListProps {
  rows: ReportTally[];
  emptyMessage: string;
  bars?: boolean;
  unit?: string;
}

export function TallyList({
  rows,
  emptyMessage,
  bars = true,
  unit,
}: TallyListProps) {
  const { refreshing } = useReports();

  if (refreshing) {
    const placeholders = Math.min(Math.max(rows?.length ?? 0, 3), 8);
    return (
      <div className="flex flex-col gap-1">
        {unit ? (
          <div className="flex items-center justify-between px-1 pb-1">
            <Text className="text-[10px] font-[gothamMedium] uppercase tracking-wider text-gray-400">
              {unit}
            </Text>
          </div>
        ) : null}
        {Array.from({ length: placeholders }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <Skeleton
              className="h-5 rounded"
              style={{ width: `${Math.max(70 - index * 8, 24)}%` }}
            />
            <Skeleton className="h-5 w-8 shrink-0 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
        <Text className="text-sm text-gray-500">{emptyMessage}</Text>
      </div>
    );
  }

  const largest = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="flex flex-col gap-1">
      {unit ? (
        <div className="flex items-center justify-between px-1 pb-1">
          <Text className="text-[10px] font-[gothamMedium] uppercase tracking-wider text-gray-400">
            {unit}
          </Text>
        </div>
      ) : null}

      {rows.map((row) => (
        <div
          key={row.label}
          className="relative overflow-hidden rounded-lg px-3 py-2"
        >
          {bars ? (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-lg bg-[#EAF4FE]"
              style={{ width: `${Math.max((row.value / largest) * 100, 2)}%` }}
            />
          ) : null}
          <div className="relative flex items-center justify-between gap-3">
            <Text className="min-w-0 truncate text-sm text-[#011b38]">
              {row.label}
            </Text>
            <Text className="shrink-0 font-[gothamMedium] text-sm tabular-nums text-[#003067]">
              {row.value.toLocaleString()}
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
      {children}
    </div>
  );
}
