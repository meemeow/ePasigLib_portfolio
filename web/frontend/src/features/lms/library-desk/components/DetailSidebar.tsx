import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Eye,
  MapPin,
  Pencil,
  Send,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import StatusBadge from "@/features/lms/library-desk/components/StatusBadge";
import { formatMillis } from "@/features/lms/library-desk/api/desk-helpers";
import type { UpdateStatus } from "@/features/lms/library-desk/types/updates-types";

export interface DetailFact {
  label: string;
  value: string;
  icon?: ReactNode;
}

interface DetailSidebarProps {
  status?: UpdateStatus;
  badge?: ReactNode;
  title: string;
  kindLabel: string;
  artwork?: string;
  artworkWidth?: string;
  artworkTop?: string;
  facts: DetailFact[];
  actions?: ReactNode;
  onBack: () => void;
  sideBySideAt?: "lg" | "xl";
}

export default function DetailSidebar({
  status,
  badge,
  title,
  kindLabel,
  artwork,
  artworkWidth = "w-64",
  artworkTop = "-top-14",
  facts,
  actions,
  onBack,
  sideBySideAt = "xl",
}: DetailSidebarProps) {
  const beside = sideBySideAt === "lg";
  const asideWidth = beside ? "lg:w-[380px]" : "xl:w-[380px]";
  const wideGrid = `${
    beside
      ? ""
      : "lg:max-xl:grid lg:max-xl:grid-cols-[minmax(0,1fr)_22rem] lg:max-[1175px]:grid-cols-[minmax(0,1fr)_18rem] lg:max-xl:items-start lg:max-xl:gap-x-5"
  } md:max-lg:grid md:max-lg:grid-cols-[minmax(0,1fr)_18rem] md:max-lg:items-start md:max-lg:gap-x-5`;
  const wideHeader = `${
    beside ? "" : "lg:max-xl:col-start-1 lg:max-xl:row-start-1 lg:max-xl:min-w-0"
  } md:max-lg:col-start-1 md:max-lg:row-start-1 md:max-lg:min-w-0`;
  const wideFacts = `${
    beside
      ? ""
      : "lg:max-xl:col-start-2 lg:max-xl:row-start-1 lg:max-xl:row-span-2 lg:max-xl:mt-0 lg:max-xl:self-center lg:max-xl:px-5"
  } md:max-lg:col-start-2 md:max-lg:row-start-1 md:max-lg:row-span-2 md:max-lg:mt-0 md:max-lg:self-center md:max-lg:px-5`;
  const wideActions = `${
    beside
      ? ""
      : "lg:max-xl:col-start-1 lg:max-xl:row-start-2 lg:max-xl:flex-row lg:max-xl:[&>*]:flex-1"
  } md:max-lg:col-start-1 md:max-lg:row-start-2 md:max-lg:flex-row md:max-lg:[&>*]:flex-1`;

  const titleSize = beside ? "lg:text-2xl" : "xl:text-2xl";
  const factLabelSize = beside ? "lg:text-xs" : "xl:text-xs";
  const factValueSize = beside ? "lg:text-sm" : "xl:text-sm";
  const factDiscSize = beside ? "lg:size-9" : "xl:size-9";
  const factGlyphSize = beside ? "lg:[&_svg]:size-5" : "xl:[&_svg]:size-5";
  const factRowPad = beside ? "lg:py-3.5" : "xl:py-3.5";
  const artworkInHeader = `${
    beside ? "" : "lg:max-xl:hidden"
  } md:max-lg:hidden`;

  return (
    <aside className={`w-full shrink-0 ${asideWidth}`}>
      <Button
        variant="outline"
        onClick={onBack}
        className="mt-3 mb-3 w-full md:mt-0"
      >
        <ArrowLeft className="size-4" />
        Return
      </Button>

      <div className="relative isolate overflow-hidden rounded-2xl border border-[#128CF1]/15 bg-gradient-to-br from-[#F1F7FE] via-[#DCEBFB] to-white p-5 shadow-sm md:max-lg:pr-7 lg:max-xl:pr-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-1 top-2 grid grid-cols-4 gap-1"
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className="size-1.5 rounded-full bg-[#128CF1]/25"
            />
          ))}
        </div>

        {artwork && (
          <img
            src={artwork}
            alt=""
            aria-hidden
            className={`pointer-events-none absolute right-76 -top-4 -z-10 hidden ${artworkWidth} select-none md:max-lg:right-60 md:max-lg:block lg:max-[1175px]:right-60 ${
              beside ? "" : "lg:max-xl:block"
            }`}
          />
        )}

        <div className={wideGrid}>
          <div className={`relative pt-12 ${wideHeader}`}>
            {artwork && (
              <img
                src={artwork}
                alt=""
                aria-hidden
                className={`pointer-events-none absolute -right-24 -z-10 ${artworkTop} ${artworkWidth} select-none ${artworkInHeader}`}
              />
            )}
            <Text className="text-sm font-[gothamMedium] text-[#128CF1]">
              {kindLabel}
            </Text>
            <Text
              as="h2"
              className={`mt-1 max-w-[17rem] text-xl font-[gothamBlack] leading-snug text-[#011b38] ${titleSize}`}
            >
              {title || "Untitled"}
            </Text>
            <div className="mt-3">
              {badge ?? (status && <StatusBadge status={status} />)}
            </div>
          </div>

          <div
            className={`relative mt-4 rounded-xl border border-gray-100 bg-white px-4 shadow-sm ${wideFacts}`}
          >
          <dl>
            {facts.map((fact, index) => (
              <div key={fact.label} className="flex items-center gap-3">
                {fact.icon && (
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#334155] [&_svg]:size-4 ${factDiscSize} ${factGlyphSize}`}
                  >
                    {fact.icon}
                  </span>
                )}
                <div
                  className={`min-w-0 flex-1 py-3 ${factRowPad} ${
                    index > 0 ? "border-t border-gray-100" : ""
                  }`}
                >
                  <dt
                    className={`text-[11px] font-[gothamMedium] text-[#003067] ${factLabelSize}`}
                  >
                    {fact.label}
                  </dt>
                  <dd className={`text-xs text-[#011b38] ${factValueSize}`}>
                    {fact.value}
                  </dd>
                </div>
              </div>
              ))}
            </dl>
          </div>

          {actions && (
            <div
              className={`relative mt-4 flex flex-col gap-2 ${wideActions}`}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export const FACT_ICONS = {
  author: <User />,
  created: <CalendarDays />,
  postedBy: <Send />,
  modifiedBy: <Pencil />,
  modified: <Clock />,
  location: <MapPin />,
  views: <Eye />,
} as const;

export function dateFact(
  label: string,
  value: number | null,
  icon?: ReactNode,
): DetailFact {
  return { label, value: formatMillis(value), icon };
}
