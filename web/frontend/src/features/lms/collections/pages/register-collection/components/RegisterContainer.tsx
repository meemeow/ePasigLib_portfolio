import type { ReactNode } from "react";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import {
  ArrowLeft,
  CirclePlus,
  Globe,
  Package,
  ShieldCheck,
  Tag,
  Type,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  COLLECTION_TAB_CAPTIONS,
  COLLECTION_TAB_LABELS,
  COLLECTION_TAB_ORDER,
  type CollectionFormTab,
} from "@/features/lms/collections/pages/register-collection/components/CollectionFormTabs";

const STEP_ICONS: Record<CollectionFormTab, LucideIcon> = {
  title: Type,
  classification: Tag,
  publication: Globe,
  physical: Package,
  additional: CirclePlus,
};

const RING_RADIUS = 19;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SPINNER_RADIUS = 24;
const SPINNER_CIRCUMFERENCE = 2 * Math.PI * SPINNER_RADIUS;
const SPINNER_ARC = SPINNER_CIRCUMFERENCE * 0.25;

function PendingOrbit() {
  return (
    <svg
      viewBox="0 0 52 52"
      className="absolute -inset-1 animate-spin [animation-duration:3.5s] motion-reduce:animate-none"
      aria-hidden
    >
      <circle
        cx="26"
        cy="26"
        r={SPINNER_RADIUS}
        fill="none"
        stroke="#128CF1"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={`${SPINNER_ARC} ${SPINNER_CIRCUMFERENCE}`}
        opacity="0.75"
      />
    </svg>
  );
}

function StepRing({ step, total }: { step: number; total: number }) {
  const filled = (step / total) * RING_CIRCUMFERENCE;

  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 44 44"
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="22"
          cy="22"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-white/15"
        />
        <circle
          cx="22"
          cy="22"
          r={RING_RADIUS}
          fill="none"
          stroke="#128CF1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${RING_CIRCUMFERENCE}`}
        />
      </svg>
      <span className="text-[10px] font-[gothamMedium] text-white tabular-nums">
        {step}/{total}
      </span>
    </span>
  );
}

type StepTone = "locked" | "upcoming" | "done";

const STEP_ICON_TONE: Record<StepTone, string> = {
  locked: "border-white/15 text-white/25",
  upcoming: "border-white/25 text-white/60",
  done: "border-white/45 text-white/80",
};

function StepIcon({
  icon: Icon,
  tone,
  pending,
}: {
  icon: LucideIcon;
  tone: StepTone;
  pending: boolean;
}) {
  return (
    <span
      className={`relative flex size-11 shrink-0 items-center justify-center rounded-full border ${STEP_ICON_TONE[tone]}`}
    >
      {pending && <PendingOrbit />}
      <Icon className="size-4" />
    </span>
  );
}

interface RegisterContainerProps {
  activeTab: CollectionFormTab;
  onTabChange: (tab: CollectionFormTab) => void;
  maxUnlockedIndex: number;
  markPendingStep?: boolean;
  isSubmitting: boolean;
  submitLabel: string;
  footerTitle: string;
  footerCaption: string;
  onBack?: () => void;
  onProceed: () => void;
  children: ReactNode;
}

export default function RegisterContainer({
  activeTab,
  onTabChange,
  maxUnlockedIndex,
  markPendingStep = true,
  isSubmitting,
  submitLabel,
  footerTitle,
  footerCaption,
  onBack,
  onProceed,
  children,
}: RegisterContainerProps) {
  const activeIndex = COLLECTION_TAB_ORDER.indexOf(activeTab);

  return (
    <div className="flex h-full min-h-[70vh] w-full flex-col overflow-hidden rounded-xl border bg-white shadow-md">
      <nav
        aria-label="Collection form steps"
        className="flex shrink-0 overflow-x-auto bg-gradient-to-b from-[#01264f] to-[#011b38]"
      >
        {COLLECTION_TAB_ORDER.map((tab, index) => {
          const locked = index > maxUnlockedIndex;
          const active = tab === activeTab;
          const done =
            !active &&
            (markPendingStep
              ? index < maxUnlockedIndex
              : index <= maxUnlockedIndex);
          const tone: StepTone = locked
            ? "locked"
            : done
              ? "done"
              : "upcoming";
          const pending =
            markPendingStep && !active && index === maxUnlockedIndex;

          return (
            <Button
              key={tab}
              type="button"
              variant={null}
              size={null}
              onClick={() => !locked && onTabChange(tab)}
              disabled={locked}
              aria-current={active ? "step" : undefined}
              className={`group relative flex min-w-[190px] flex-1 items-center justify-start whitespace-normal font-normal gap-3 px-4 py-4 text-left transition disabled:opacity-100 disabled:pointer-events-auto sm:px-5 ${
                index > 0 ? "border-l border-white/10" : ""
              } ${
                locked
                  ? "cursor-not-allowed"
                  : active
                    ? "bg-white/[0.07]"
                    : done
                      ? "bg-white/[0.035] hover:bg-white/[0.06]"
                      : "hover:bg-white/5"
              }`}
            >
              {active ? (
                <StepRing
                  step={index + 1}
                  total={COLLECTION_TAB_ORDER.length}
                />
              ) : (
                <StepIcon
                  icon={STEP_ICONS[tab]}
                  tone={tone}
                  pending={pending}
                />
              )}

              <span className="min-w-0 flex-1">
                <Text
                  className={`truncate ${
                    active
                      ? "text-base font-[gothamMedium] text-white"
                      : locked
                        ? "text-base font-[gothamBlack] text-white/25"
                        : done
                          ? "text-base font-[gothamBlack] text-white/85"
                          : "text-base font-[gothamBlack] text-white/60"
                  }`}
                >
                  {active ? COLLECTION_TAB_LABELS[tab] : index + 1}
                </Text>
                <Text
                  className={`truncate text-[11px] ${
                    active
                      ? "text-white/55"
                      : locked
                        ? "text-white/25"
                        : done
                          ? "font-[gothamMedium] text-white/85"
                          : "text-white/50"
                  }`}
                >
                  {active
                    ? COLLECTION_TAB_CAPTIONS[tab]
                    : COLLECTION_TAB_LABELS[tab]}
                </Text>
              </span>

              <span
                className={`absolute inset-x-0 bottom-0 h-[3px] transition ${
                  active ? "bg-[#128CF1]" : "bg-transparent"
                }`}
              />
            </Button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto p-7 pb-4 sm:p-8 sm:pb-6 md:p-10">
        {children}
      </div>

      <div className="flex shrink-0 flex-col gap-4 border-t bg-white px-8 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:h-10 md:w-10">
            <ShieldCheck className="size-4 md:size-5" />
          </div>
          <div>
            <Text className="font-[gothamMedium] text-base text-[#003067] md:text-lg">
              {footerTitle}
            </Text>
            <Text className="text-xs text-gray-500 md:text-sm">
              {footerCaption}
            </Text>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          {activeIndex > 0 && onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isSubmitting}
              className={`w-auto md:w-[130px] ${COMPACT_CONTROL}`}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={onProceed}
            disabled={isSubmitting}
            className={`w-auto md:w-[150px] ${COMPACT_CONTROL}`}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
