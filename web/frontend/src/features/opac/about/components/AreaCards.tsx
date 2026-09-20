import { Baby, BookOpen, Coffee, Users, type LucideIcon } from "lucide-react";
import { Text } from "@/components/ui/Text";
import { TOTAL_SEATING } from "@/features/opac/about/api/about-helpers";

interface Area {
  id: string;
  title: string;
  seating: number;
  icon: LucideIcon;
}

const AREAS: Area[] = [
  { id: "children", title: "Children's Area", seating: 50, icon: Baby },
  { id: "general", title: "General Services", seating: 78, icon: BookOpen },
  { id: "focus", title: "Focus & Refresh", seating: 60, icon: Coffee },
];

export function AreaCards() {
  return (
    <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6 md:p-5 3xl:p-7">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-white sm:size-11 md:size-9 3xl:size-11">
          <Users className="size-4 sm:size-5" />
        </span>
        <div className="min-w-0">
          <Text
            as="h2"
            className="text-xs font-[gothamMedium] text-[#0b1b33] sm:text-base 3xl:text-lg"
          >
            Total Seating Capacity
          </Text>
          <Text className="mt-1 text-base font-[gothamMedium] leading-none text-[#1D4ED8] sm:text-xl md:text-lg 3xl:text-2xl">
            {TOTAL_SEATING}
          </Text>
        </div>
      </div>

      <div className="mt-5 space-y-5 border-t border-blue-100 pt-5 md:mt-4 3xl:mt-5">
        {AREAS.map((area) => {
          const Icon = area.icon;

          return (
            <div
              key={area.id}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="size-4 shrink-0 text-[#1D4ED8] sm:size-5 md:size-4 3xl:size-5" />
                <Text
                  as="h3"
                  className="truncate text-xs font-[gothamMedium] text-[#0b1b33] sm:text-sm"
                >
                  {area.title}
                </Text>
              </div>

              <Text className="shrink-0 text-[11px] whitespace-nowrap text-slate-500 sm:text-xs">
                Seating:{" "}
                <span className="font-[gothamMedium] text-[#1D4ED8]">
                  {area.seating}
                </span>
              </Text>
            </div>
          );
        })}
      </div>
    </article>
  );
}
