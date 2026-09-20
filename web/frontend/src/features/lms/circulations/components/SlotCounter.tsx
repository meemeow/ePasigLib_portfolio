import { useId } from "react";
import { Text } from "@/components/ui/Text";
import {
  formatMillis,
  formatTimeLeft,
} from "@/features/lms/circulations/api/circulation-records-helpers";
import type {
  PatronSlotItem,
  PatronSlotUsage,
} from "@/features/lms/circulations/types/circulation-transaction-types";

const KINDS = [
  {
    kind: "loan" as const,
    label: "On loan",
    dot: "bg-[#003067]",
    flaggedTone: "text-red-600",
    line: (item: PatronSlotItem) =>
      item.flagged
        ? `Overdue — was due ${formatMillis(item.date)}`
        : `Due ${formatMillis(item.date)}`,
  },
  {
    kind: "hold" as const,
    label: "Ready to collect",
    dot: "bg-[#128CF1]",
    flaggedTone: "text-amber-600",
    line: (item: PatronSlotItem) =>
      item.flagged
        ? `Collectable from ${formatMillis(item.from)}`
        : `Collect by ${formatMillis(item.date)}`,
  },
  {
    kind: "pending" as const,
    label: "Awaiting approval",
    dot: "bg-[#128CF1]/40",
    flaggedTone: "text-amber-600",
    line: (item: PatronSlotItem) => {
      const left = formatTimeLeft(item.date);
      return left === "Expired" ? "Expired — copy not yet released" : left;
    },
  },
];

export default function SlotCounter({ slots }: { slots: PatronSlotUsage }) {
  const panelId = useId();
  const parts = [
    slots.loans > 0 && `${slots.loans} on loan`,
    slots.holds > 0 && `${slots.holds} ready to collect`,
    slots.pending > 0 && `${slots.pending} awaiting approval`,
  ].filter(Boolean);

  const full = slots.total >= slots.max;
  const items = slots.items ?? [];
  const groups = KINDS.map((group) => ({
    ...group,
    rows: items.filter((item) => item.kind === group.kind),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="group relative">
      <div
        tabIndex={groups.length ? 0 : undefined}
        aria-describedby={groups.length ? panelId : undefined}
        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2 outline-none ${
          groups.length
            ? "cursor-help focus-visible:ring-2 focus-visible:ring-[#128CF1]/40"
            : ""
        } ${full ? "border-red-200 bg-red-50" : "border-[#128CF1]/20 bg-[#EAF4FE]"}`}
      >
        <div className="min-w-0">
          <Text
            className={`font-[gothamMedium] text-sm ${
              groups.length
                ? "underline decoration-dotted underline-offset-4"
                : ""
            } ${full ? "text-red-800 decoration-red-300" : "text-[#003067] decoration-[#128CF1]/50"}`}
          >
            {slots.total} of {slots.max} books
          </Text>
          <Text
            className={`mt-0.5 text-xs ${
              full ? "text-red-700" : "text-[#0F76CC]"
            }`}
          >
            {parts.length ? parts.join(" · ") : "Nothing out"}
          </Text>
        </div>

        <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
          {Array.from({ length: slots.max }, (_, index) => (
            <span
              key={index}
              className={`size-2.5 rounded-full ${
                index < slots.loans
                  ? "bg-[#003067]"
                  : index < slots.loans + slots.holds
                    ? "bg-[#128CF1]"
                    : index < slots.total
                      ? "bg-[#128CF1]/40"
                      : "border border-[#128CF1]/40 bg-white"
              }`}
            />
          ))}
        </div>
      </div>

      {groups.length > 0 && (
        <div
          id={panelId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 w-[min(20rem,calc(100vw-3rem))] translate-y-1 rounded-xl border border-gray-200 bg-white p-3 opacity-0 shadow-lg transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
        >
          {groups.map((group, groupIndex) => (
            <div key={group.kind} className={groupIndex ? "mt-3" : ""}>
              <div className="flex items-center gap-1.5">
                <span className={`size-2 shrink-0 rounded-full ${group.dot}`} />
                <Text className="font-[gothamMedium] text-[11px] uppercase tracking-wide text-gray-500">
                  {group.label} ({group.rows.length})
                </Text>
              </div>

              {group.rows.map((item, index) => (
                <div
                  key={`${item.accession}-${index}`}
                  className="mt-1.5 pl-3.5"
                >
                  <Text className="truncate text-xs font-[gothamMedium] text-[#003067]">
                    {item.title || "Untitled"}
                    {item.accession ? (
                      <span className="font-[gothamLight] text-gray-500">
                        {" "}
                        · {item.accession}
                      </span>
                    ) : null}
                  </Text>
                  <Text
                    className={`text-[11px] ${
                      item.flagged ? group.flaggedTone : "text-gray-500"
                    }`}
                  >
                    {group.line(item)}
                  </Text>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
