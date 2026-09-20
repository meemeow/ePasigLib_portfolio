import { CalendarDays, Clock } from "lucide-react";
import { Text } from "@/components/ui/Text";
import {
  CLOSING_TIME,
  OPENING_TIME,
  OPEN_DAYS,
  type LibraryStatus,
} from "@/features/opac/about/api/about-helpers";

interface OperatingHoursCardProps {
  status: LibraryStatus;
}

export function OperatingHoursCard({ status }: OperatingHoursCardProps) {
  return (
    <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6 md:p-5 3xl:p-7">
      <header className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#1D4ED8] ring-1 ring-[#1D4ED8]/20 sm:size-11 md:size-9 3xl:size-11">
          <Clock className="size-4 sm:size-5" />
        </span>
        <Text
          as="h2"
          className="text-xs font-[gothamMedium] text-[#0b1b33] sm:text-base 3xl:text-lg"
        >
          Library Operating Hours
        </Text>
      </header>

      <div className="mt-5 rounded-xl border border-blue-100 bg-[#EFF6FF] px-5 py-4 text-center md:mt-4 md:px-4 md:py-3 3xl:mt-5 3xl:px-5 3xl:py-4">
        <Text className="text-[11px] text-slate-500 sm:text-xs">{OPEN_DAYS}</Text>
        <Text className="mt-1 text-base font-[gothamMedium] tracking-tight text-[#1D4ED8] sm:text-xl md:text-lg 3xl:text-2xl">
          {OPENING_TIME} – {CLOSING_TIME}
        </Text>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xs:grid-cols-2 xs:gap-0 xs:divide-x xs:divide-blue-100 md:mt-4 3xl:mt-5 3xl:max-[2140px]:grid-cols-[45%_55%]">
        <div className="flex flex-col justify-center xs:pr-4">
          <Text
            className={`flex items-center gap-2 text-sm font-[gothamMedium] sm:text-base md:text-sm 3xl:text-lg ${
              status.isClosed ? "text-red-600" : "text-green-600"
            }`}
          >
            <span
              className={`inline-block size-2.5 shrink-0 rounded-full ${
                status.isClosed ? "bg-red-500" : "bg-green-500"
              }`}
            />
            {status.statusText}
          </Text>
          <Text className="mt-1 text-[11px] text-slate-500 sm:text-xs">
            {status.isClosed
              ? `Sundays, public holidays, and daily after ${CLOSING_TIME}`
              : `Open until ${CLOSING_TIME}`}
          </Text>
        </div>

        <div className="flex items-center gap-3 xs:pl-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#1D4ED8] sm:size-9 md:size-8 3xl:size-9">
            <CalendarDays className="size-3.5 sm:size-4" />
          </span>
          <div className="min-w-0">
            <Text className="text-xs font-[gothamMedium] text-[#0b1b33] sm:text-base md:text-sm 3xl:text-lg">
              {status.statusDetail}
            </Text>
            <Text className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
              {status.shortDate}
            </Text>
          </div>
        </div>
      </div>

      <div className="-mx-5 -mb-5 mt-5 flex items-center justify-center gap-2 rounded-b-2xl bg-[#1D4ED8] px-5 py-3 text-white sm:-mx-6 sm:-mb-6 sm:px-6 md:-mx-5 md:-mb-5 md:mt-4 md:px-5 md:py-2.5 3xl:-mx-7 3xl:-mb-7 3xl:mt-5 3xl:px-7 3xl:py-3">
        <CalendarDays className="size-3.5 shrink-0 sm:size-4" />
        <Text className="text-[11px] font-[gothamMedium] sm:text-xs">
          {status.statusDetail}, {status.shortDate}
        </Text>
      </div>
    </article>
  );
}
