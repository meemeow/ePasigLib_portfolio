import { useState } from "react";
import {
  Barcode,
  BookOpen,
  Layers,
  Ruler,
  StickyNote,
  Tags,
  User,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  MARC_BLOCKS,
  type MarcBlock,
  type MarcField,
} from "@/features/lms/collections/pages/view-collection/constants/marc-fields";
import {
  TEXT_CHIP,
  TEXT_HEADING,
  TEXT_PRIMARY,
  TEXT_PROSE,
  TEXT_SECONDARY,
} from "@/features/lms/collections/pages/view-collection/constants/type-scale";
import type { CollectionData } from "@/features/lms/collections/pages/view-collection/types/collections-view-types";

interface ViewCollectionMarcProps {
  collection: CollectionData;
  activeBlock: string;
  onBlockChange: (block: string) => void;
}

const BLOCK_ICONS: Record<string, LucideIcon> = {
  "0xx": Barcode,
  "1xx": User,
  "2xx": BookOpen,
  "3xx": Ruler,
  "4xx": Layers,
  "5xx": StickyNote,
  "6xx7xx": Tags,
};

const SCHEME_BY_TAG: Record<string, string> = {
  "020": "ISBN",
  "082": "DDC",
  "099": "LOCAL",
  "100": "NAME",
  "245": "TITLE",
  "250": "TITLE",
  "260": "IMPRINT",
  "264": "IMPRINT",
  "300": "PHYSICAL",
  "338": "RDA",
  "490": "SERIES",
  "500": "NOTE",
  "520": "NOTE",
  "541": "ACQUISITION",
  "650": "SUBJECT",
  "700": "NAME",
};

const SCHEME_TONES: Record<string, string> = {
  ISBN: "bg-[#EAF4FE] text-[#128CF1]",
  DDC: "bg-[#EAF4FE] text-[#128CF1]",
  LOCAL: "bg-amber-50 text-amber-600",
  NAME: "bg-violet-50 text-violet-600",
  TITLE: "bg-sky-50 text-sky-600",
  IMPRINT: "bg-cyan-50 text-cyan-700",
  PHYSICAL: "bg-emerald-50 text-emerald-600",
  RDA: "bg-teal-50 text-teal-600",
  SERIES: "bg-violet-50 text-violet-600",
  NOTE: "bg-slate-100 text-slate-600",
  ACQUISITION: "bg-rose-50 text-rose-600",
  SUBJECT: "bg-emerald-50 text-emerald-600",
};

const NODE_TONES = [
  { border: "border-[#128CF1]/35", icon: "text-[#128CF1]" },
  { border: "border-emerald-300", icon: "text-emerald-500" },
  { border: "border-violet-300", icon: "text-violet-500" },
  { border: "border-amber-300", icon: "text-amber-500" },
  { border: "border-rose-300", icon: "text-rose-500" },
  { border: "border-cyan-300", icon: "text-cyan-500" },
];

const EMPTY_TONE = { border: "border-gray-300", icon: "text-gray-300" };

const PROSE_THRESHOLD = 90;

function MarcTimelineItem({
  field,
  collection,
  icon: Icon,
  index,
  isLast,
}: {
  field: MarcField;
  collection: CollectionData;
  icon: LucideIcon;
  index: number;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const value = field.value(collection).trim();
  const filled = Boolean(value);
  const tone = filled ? NODE_TONES[index % NODE_TONES.length] : EMPTY_TONE;
  const scheme = SCHEME_BY_TAG[field.tag];
  const schemeTone = SCHEME_TONES[scheme] ?? "bg-slate-100 text-slate-600";

  const isProse = value.length > PROSE_THRESHOLD;

  return (
    <li
      className={`relative flex gap-4 pb-6 last:pb-0 xl:flex-1 xl:shrink-0 xl:basis-0 xl:flex-col xl:items-center xl:gap-4 xl:px-2 xl:pb-0 ${
        field.wide ? "xl:min-w-[280px]" : "xl:min-w-[210px]"
      }`}
    >
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-5 top-11 h-[calc(100%-2.75rem)] w-px -translate-x-1/2 bg-gray-200 xl:left-1/2 xl:top-5 xl:h-px xl:w-full xl:translate-x-0"
        />
      )}

      <span
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white ${tone.border}`}
      >
        <Icon className={`size-[18px] ${tone.icon}`} />
      </span>

      <div
        className={`flex min-w-0 flex-1 flex-col gap-2 rounded-xl border p-4 transition xl:w-full xl:items-center ${
          filled
            ? "border-gray-200 bg-white shadow-sm hover:border-[#128CF1]/40 hover:shadow-md"
            : "border-dashed border-gray-300 bg-gray-50/70"
        }`}
      >
        <Text className={`tabular-nums xl:text-center ${TEXT_SECONDARY}`}>
          <span className="font-[gothamMedium] text-[#128CF1]">
            {field.tag}
          </span>
          {field.indicators && (
            <span className="text-gray-400">
              {" "}
              {field.indicators.split("").join(" ")}
            </span>
          )}{" "}
          <span className="font-[gothamMedium] text-[#128CF1]">
            {field.subfield}
          </span>
        </Text>

        <Text className={`font-[gothamMedium] leading-snug text-[#003067] xl:text-center ${TEXT_PRIMARY}`}>
          {field.label}
        </Text>

        {scheme && (
          <Badge
            variant={null}
            className={`inline-flex w-fit shrink-0 border-0 font-normal rounded px-2 py-0.5 font-[gothamMedium] uppercase tracking-wide ${TEXT_CHIP} ${schemeTone}`}
          >
            {scheme}
          </Badge>
        )}

        {isProse ? (
          <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
            <Text
              className={`w-full break-words font-[gothamLight] leading-relaxed text-[#011b38] ${TEXT_PROSE} ${
                expanded ? "" : "line-clamp-6"
              }`}
            >
              {value}
            </Text>
            <Button
              type="button"
              variant={null}
              size={null}
              onClick={() => setExpanded((open) => !open)}
              className={`shrink-0 font-normal font-[gothamMedium] text-[#128CF1] underline-offset-2 hover:underline ${TEXT_CHIP}`}
            >
              {expanded ? "Show less" : "Show more"}
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center xl:justify-center">
            <Text
              className={`break-words font-[gothamLight] leading-relaxed xl:text-center ${TEXT_PRIMARY} ${
                filled ? "text-[#011b38]" : "text-gray-400"
              }`}
            >
              {value || "N/A"}
            </Text>
          </div>
        )}
      </div>
    </li>
  );
}

export default function ViewCollectionMarc({
  collection,
  activeBlock,
  onBlockChange,
}: ViewCollectionMarcProps) {
  const active: MarcBlock =
    MARC_BLOCKS.find((block) => block.id === activeBlock) ?? MARC_BLOCKS[0];

  const filledCount = active.fields.filter((field) =>
    field.value(collection).trim(),
  ).length;

  const Icon = BLOCK_ICONS[active.id] ?? BookOpen;

  return (
    <div className="flex h-full min-h-[70vh] w-full flex-col overflow-hidden rounded-xl border bg-white shadow-md">
      <nav
        aria-label="MARC tag blocks"
        className="flex shrink-0 overflow-x-auto bg-gradient-to-b from-[#01264f] to-[#011b38]"
      >
        {MARC_BLOCKS.map((block, index) => {
          const isActive = block.id === active.id;

          return (
            <Button
              key={block.id}
              type="button"
              variant={null}
              size={null}
              onClick={() => onBlockChange(block.id)}
              aria-current={isActive ? "step" : undefined}
              className={`group relative flex min-h-[72px] min-w-[130px] flex-1 items-center justify-start whitespace-normal font-normal gap-3 px-4 py-4 text-left transition sm:min-h-0 sm:px-5 sm:py-5 ${
                index > 0 ? "border-l border-white/10" : ""
              } ${
                isActive
                  ? "bg-white/[0.07]"
                  : "bg-white/[0.035] hover:bg-white/[0.06]"
              }`}
            >
              <span className="min-w-0 flex-1">
                <Text
                  className={`truncate ${TEXT_PRIMARY} ${
                    isActive
                      ? "font-[gothamMedium] text-white"
                      : "font-[gothamLight] text-white/85"
                  }`}
                >
                  {block.label}
                </Text>
                <Text
                  className={`truncate ${TEXT_SECONDARY} ${
                    isActive ? "text-white/70" : "text-white/60"
                  }`}
                >
                  {block.title}
                </Text>
              </span>

              <span
                className={`absolute inset-x-0 bottom-0 h-[3px] transition ${
                  isActive ? "bg-[#128CF1]" : "bg-transparent"
                }`}
              />
            </Button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto bg-[#F7F9FC] p-6 sm:p-8 md:p-10">
        <div className="space-y-8 xl:space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-gray-200 pb-4">
            <div className="flex items-start gap-3">
              <div className="my-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:h-10 md:w-10">
                <Icon className="size-4 md:size-5" />
              </div>
              <div className="space-y-1">
                <Text className={`font-[gothamMedium] text-[#003067] ${TEXT_HEADING}`}>
                  {active.title}
                </Text>
                <Text className={`text-gray-500 ${TEXT_SECONDARY}`}>
                  {active.caption}
                </Text>
              </div>
            </div>
            <Text className={`font-[gothamMedium] text-gray-400 ${TEXT_SECONDARY}`}>
              {filledCount} of {active.fields.length} recorded
            </Text>
          </div>

          <ol className="flex flex-col xl:flex-row xl:overflow-x-auto xl:pb-5">
            {active.fields.map((field, index) => (
              <MarcTimelineItem
                key={`${field.tag}-${field.subfield}-${field.label}`}
                field={field}
                collection={collection}
                icon={Icon}
                index={index}
                isLast={index === active.fields.length - 1}
              />
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
