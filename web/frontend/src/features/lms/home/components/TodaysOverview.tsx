import { CalendarClock, ClipboardCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { formatCount } from "@/features/lms/home/api/home-helpers";
import type { DashboardSummary } from "@/features/lms/home/types/home-types";

const SCALE = {
  figure: {
    normal: "text-xl min-[401px]:text-2xl",
    squeezed:
      "text-xl min-[401px]:text-2xl min-[1536px]:text-xl min-[1801px]:text-2xl",
  },
  label: {
    normal: "text-[11px] min-[401px]:text-xs sm:text-sm",
    squeezed:
      "text-[11px] min-[401px]:text-xs min-[1280px]:text-sm min-[1536px]:text-[11px] min-[1801px]:text-sm",
  },
  hint: {
    normal: "text-[10px] min-[401px]:text-[11px] sm:text-xs",
    squeezed:
      "text-[10px] min-[401px]:text-[11px] min-[1280px]:text-xs min-[1536px]:text-[10px] min-[1801px]:text-xs",
  },
  icon: {
    normal: "size-8 min-[401px]:size-9 sm:size-10",
    squeezed:
      "size-8 min-[401px]:size-9 min-[1280px]:size-10 min-[1536px]:size-9 min-[1801px]:size-10",
  },
  cell: {
    normal: "sm:px-5",
    squeezed:
      "min-[640px]:px-3 min-[1280px]:px-5 min-[1536px]:px-3 min-[1801px]:px-5",
  },
} as const;

interface TodaysOverviewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  railOpen: boolean;
}

export default function TodaysOverview({
  summary,
  loading,
  error,
  onRetry,
  railOpen,
}: TodaysOverviewProps) {
  const pending = summary?.pendingApprovals;

  const scale = (part: keyof typeof SCALE) =>
    railOpen ? SCALE[part].squeezed : SCALE[part].normal;

  const cells = [
    {
      id: "approvals",
      icon: <ClipboardCheck className="size-5" />,
      value: pending?.total,
      label: "Pending Approvals",
      hint:
        pending &&
        `${pending.reservations.books} ${
          pending.reservations.books === 1 ? "title" : "titles"
        } across ${pending.reservations.requests} ${
          pending.reservations.requests === 1 ? "request" : "requests"
        }`,
    },
    {
      id: "due",
      icon: <CalendarClock className="size-5" />,
      value: summary?.booksDueToday,
      label: "Books Due Today",
      hint: "Across all borrowers",
    },
    {
      id: "patrons",
      icon: <UserPlus className="size-5" />,
      value: summary?.newPatronsThisMonth,
      label: "New Patrons This Month",
      hint: "Welcome them!",
    },
  ];

  return (
    <section className="flex flex-1 flex-col rounded-2xl border border-blue-100 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5 xl:px-7">
      <div className="flex items-center justify-between gap-2">
        <Text className="text-base font-[gothamMedium] text-[#011b38] min-[401px]:text-lg">
          Today's Overview
        </Text>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Text className="text-sm text-gray-600">
            Could not load today's overview.
          </Text>
          <Button
            variant="link"
            onClick={onRetry}
            className="h-auto p-0 font-normal"
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-3 mb-2 grid flex-1 2xl:mt-2 2xl:mb-1 grid-cols-1 content-center items-start gap-4 divide-blue-100 sm:grid-cols-4 sm:gap-x-0 sm:gap-y-5 md:grid-cols-3 md:gap-0 md:divide-x">
          {cells.map((cell) => {
            const value = formatCount(cell.value);
            return (
              <div
                key={cell.id}
                className={`flex items-center justify-between gap-3 px-2.5 sm:col-span-2 sm:justify-center md:col-span-1 md:col-start-auto md:justify-start md:first:pl-0 md:last:pr-0 ${
                  cell.id === "patrons" ? "sm:col-start-2" : ""
                } ${scale("cell")}`}
              >
                <span
                  className={`order-2 mr-1.5 flex shrink-0 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1] sm:order-1 sm:mr-0 ${scale("icon")}`}
                >
                  {cell.icon}
                </span>
                <div className="order-1 min-w-0 sm:order-2">
                  {loading && value === null ? (
                    <Skeleton className="h-8 w-14" />
                  ) : (
                    <Text
                      className={`font-[gothamBlack] leading-tight text-[#011b38] ${scale("figure")}`}
                    >
                      {value ?? "—"}
                    </Text>
                  )}
                  <Text
                    className={`font-[gothamMedium] text-[#003067] ${scale("label")}`}
                  >
                    {cell.label}
                  </Text>
                  {cell.hint ? (
                    <Text className={`text-gray-500 ${scale("hint")}`}>
                      {cell.hint}
                    </Text>
                  ) : loading ? (
                    <Skeleton className="mt-1 h-2.5 w-28" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
