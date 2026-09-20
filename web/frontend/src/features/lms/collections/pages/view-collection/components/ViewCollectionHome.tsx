import { useState } from "react";
import {
  AlignLeft,
  Barcode,
  Bookmark,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Coins,
  Copyright,
  FileDigit,
  FileText,
  Files,
  Gift,
  Hash,
  ImageOff,
  Layers,
  Library,
  MapPin,
  PenLine,
  Ruler,
  ScrollText,
  ShoppingCart,
  StickyNote,
  Tag,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "@/features/lms/collections/pages/view-collection/constants/type-scale";
import type { CollectionData } from "@/features/lms/collections/pages/view-collection/types/collections-view-types";

interface ViewCollectionHomeProps {
  collectionData: CollectionData;
  showFullDesc: boolean;
  setShowFullDesc: (show: boolean) => void;
}

const SUMMARY_LIMIT = 500;

const FLAG_LIMIT = 16;

const CHIP =
  "rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-[gothamMedium]";

function Entry({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#128CF1]" />
      <div className="min-w-0 flex-1">
        <Text className={`font-[gothamMedium] text-[#003067] ${TEXT_SECONDARY}`}>
          {label}
        </Text>
        {children}
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  asFlag = false,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  asFlag?: boolean;
}) {
  const text = (value || "").trim();
  const flagged = asFlag && text.length > 0 && text.length <= FLAG_LIMIT;

  return (
    <Entry icon={icon} label={label}>
      {flagged ? (
        <Badge
          variant={null}
          className={`mt-1 inline-flex border-0 font-normal bg-emerald-50 text-emerald-700 ${CHIP}`}
        >
          {text}
        </Badge>
      ) : (
        <Text
          className={`break-words font-[gothamLight] ${TEXT_PRIMARY} ${
            text ? "text-gray-700" : "text-gray-400"
          }`}
        >
          {text || "N/A"}
        </Text>
      )}
    </Entry>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const archived = status === "Archived";
  return (
    <Badge
      variant={null}
      className={`inline-block shrink-0 border-0 font-normal ${CHIP} ${
        archived ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      }`}
    >
      {archived ? "Archived" : "Available"}
    </Badge>
  );
}

const EXTRA_FIELDS: Array<{
  icon: LucideIcon;
  label: string;
  read: (record: CollectionData) => string | undefined;
}> = [
  { icon: UserPlus, label: "Joint Author", read: (r) => r.JointAuthor },
  { icon: Layers, label: "Series Title", read: (r) => r.SeriesTitle },
  { icon: StickyNote, label: "General Note", read: (r) => r.GeneralNote },
  { icon: FileDigit, label: "Preliminary Pages", read: (r) => r.PrePage },
  { icon: ShoppingCart, label: "Acquisition", read: (r) => r.Acquisition },
  { icon: Gift, label: "Donor", read: (r) => r.Donor },
  { icon: CalendarCheck, label: "Date Received", read: (r) => r.DateReceived },
  { icon: Coins, label: "Cost Price", read: (r) => r.CostPrice },
];

const COLUMN_RULE = "xl:border-l xl:border-gray-200 xl:pl-6";

function FieldColumn({
  children,
  lead = false,
}: {
  children: React.ReactNode;
  lead?: boolean;
}) {
  return (
    <div className={`space-y-4 ${lead ? "" : COLUMN_RULE}`}>{children}</div>
  );
}

function ChipCard({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div className="max-xl:rounded-xl max-xl:border max-xl:border-gray-200 max-xl:p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-[#128CF1]" />
        <Text className={`font-[gothamMedium] text-[#003067] ${TEXT_SECONDARY}`}>
          {title}
        </Text>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <Badge
              key={`${item}-${index}`}
              variant={null}
              className={`border-0 font-normal ${CHIP} ${tone}`}
            >
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-xs font-[gothamLight] text-gray-400">
            None recorded
          </span>
        )}
      </div>
    </div>
  );
}

export default function ViewCollectionHome({
  collectionData,
  showFullDesc,
  setShowFullDesc,
}: ViewCollectionHomeProps) {
  const editionChips = [
    collectionData.SecondTitle,
    collectionData.Edition,
    collectionData.Volume,
  ].filter((part): part is string => Boolean(part && part.trim()));

  const summary = (
    collectionData.Description ||
    collectionData.TitleDescription ||
    ""
  ).trim();
  const isLongSummary = summary.length > SUMMARY_LIMIT;
  const shownSummary =
    isLongSummary && !showFullDesc
      ? `${summary.slice(0, SUMMARY_LIMIT)}…`
      : summary;

  const relatedNames = (collectionData.RelatedNames || []).filter(Boolean);
  const subjects = (collectionData.Subjects || []).filter(Boolean);

  const [showExtras, setShowExtras] = useState(false);
  const recordedExtras = EXTRA_FIELDS.filter((field) =>
    (field.read(collectionData) || "").trim(),
  ).length;

  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
    <svg
        aria-hidden="true"
        viewBox="0 0 720 200"
        fill="none"
        preserveAspectRatio="none"
        className="pointer-events-none absolute right-0 top-0 h-28 w-[440px] -scale-x-100 sm:h-38 sm:w-[640px]"
      >
        <path
          d="M0 0H700C650 30 580 92 520 92C496 92 474 76 450 76C420 76 392 80 360 104C312 140 288 92 240 116C192 140 168 176 120 168C72 160 48 122 0 138Z"
          fill="#128CF1"
          fillOpacity="0.05"
        />
        <path
          d="M0 0H620C584 22 540 54 500 54C479 54 461 42 440 42C414 42 382 46 360 64C316 100 292 56 244 78C196 100 172 134 124 126C76 118 46 84 0 98Z"
          fill="#128CF1"
          fillOpacity="0.08"
        />
      </svg>

      <div className="relative">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="h-44 w-32 shrink-0 overflow-hidden rounded-lg border border-[#128CF1]/25 bg-[#128CF1]/5 shadow-sm max-md:self-center">
            {collectionData.CollectionImage ? (
              <img
                src={collectionData.CollectionImage}
                alt={`Cover of ${collectionData.CollectionTitle}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center">
                <ImageOff className="size-6 text-[#128CF1]/40" />
                <span className="text-[10px] font-[gothamMedium] text-[#128CF1]/70">
                  No cover
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="max-md:text-center">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-md:flex-col max-md:items-center">
                <Text
                  as="h2"
                  className="min-w-0 font-[gothamBlack] text-xl text-[#002248] sm:text-2xl"
                >
                  {collectionData.CollectionTitle}
                </Text>
                <StatusBadge status={collectionData.Status} />
              </div>
              {editionChips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-md:justify-center">
                  {editionChips.map((part, index) => (
                    <Badge
                      key={`${part}-${index}`}
                      variant={null}
                      className={`border-0 font-normal ${CHIP} bg-blue-50 text-blue-700`}
                    >
                      {part}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Entry icon={PenLine} label="Written By">
              <div className={`space-y-1 ${TEXT_PRIMARY}`}>
                {collectionData.MainAuthor ? (
                  <Text className={`font-[gothamLight] text-gray-700 ${TEXT_PRIMARY}`}>
                    {collectionData.MainAuthor}{" "}
                    <Badge
                      variant={null}
                      className={`inline border-0 font-normal ${CHIP} bg-blue-50 text-blue-700`}
                    >
                      Main Author
                    </Badge>
                  </Text>
                ) : (
                  <Text className={`font-[gothamLight] text-gray-400 ${TEXT_PRIMARY}`}>
                    N/A
                  </Text>
                )}
                {collectionData.Author && (
                  <Text className={`font-[gothamLight] text-gray-700 ${TEXT_PRIMARY}`}>
                    {collectionData.Author}{" "}
                    <Badge
                      variant={null}
                      className={`inline border-0 font-normal ${CHIP} bg-gray-100 text-gray-600`}
                    >
                      Author
                    </Badge>
                  </Text>
                )}
              </div>
            </Entry>

            <Entry icon={ScrollText} label="Summary">
              <Text className={`text-gray-700 ${TEXT_PRIMARY}`}>
                {summary ? (
                  <span className="font-[gothamLight]">{shownSummary}</span>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
                {isLongSummary && (
                  <Button
                    type="button"
                    variant={null}
                    size={null}
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="inline-block font-normal ml-2 text-xs font-[gothamMedium] text-[#128CF1] underline-offset-2 hover:underline"
                  >
                    {showFullDesc ? "Show less" : "Show more"}
                  </Button>
                )}
              </Text>
            </Entry>
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div className="max-xl:space-y-6 xl:contents">
              <FieldColumn lead>
                <Field
                  icon={Library}
                  label="Class Code"
                  value={collectionData.ClassCode}
                />
                <Field
                  icon={Bookmark}
                  label="Call Number"
                  value={collectionData.CallNumber}
                />
                <Field
                  icon={Hash}
                  label="Cutters Table"
                  value={collectionData.CuttersTable}
                />
                <Field
                  icon={Copyright}
                  label="Copyright Year"
                  value={collectionData.CopyrightYear}
                />
              </FieldColumn>

              <FieldColumn>
                <Field
                  icon={Building2}
                  label="Publisher"
                  value={collectionData.Publisher}
                />
                <Field
                  icon={MapPin}
                  label="Publication Place"
                  value={collectionData.PublicationPlace}
                />
                <Field
                  icon={CalendarDays}
                  label="Publication Year"
                  value={collectionData.PublicationYear}
                />
              </FieldColumn>
            </div>

            <div className="max-xl:space-y-6 xl:contents">
              <FieldColumn>
                <Field
                  icon={FileText}
                  label="Material Type"
                  value={collectionData.MaterialType}
                />
                <Field icon={Ruler} label="Size" value={collectionData.Size} />
                <Field
                  icon={Files}
                  label="Page Count"
                  value={collectionData.PageCount}
                />
              </FieldColumn>

              <FieldColumn>
                <Field
                  icon={Barcode}
                  label="ISBN10"
                  value={collectionData.ISBN10}
                />
                <Field
                  icon={Barcode}
                  label="ISBN13"
                  value={collectionData.ISBN13}
                />
                <Field
                  icon={AlignLeft}
                  label="Includes Summary"
                  value={
                    collectionData.IncludesSummary || collectionData.Inclusion
                  }
                  asFlag
                />
              </FieldColumn>
            </div>
          </div>

          <aside className={`space-y-4 ${COLUMN_RULE}`}>
            <ChipCard
              icon={Users}
              title="Related Names"
              items={relatedNames}
              tone="bg-blue-100 text-blue-800"
            />
            <ChipCard
              icon={Tag}
              title="Subject"
              items={subjects}
              tone="bg-green-100 text-green-800"
            />
          </aside>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <Button
            type="button"
            variant={null}
            size={null}
            onClick={() => setShowExtras((open) => !open)}
            aria-expanded={showExtras}
            aria-controls="collection-extra-fields"
            className="flex w-full justify-start font-normal items-center gap-2 rounded-lg px-1 py-1.5 text-left transition hover:bg-gray-50"
          >
            <ChevronDown
              className={`size-4 shrink-0 text-[#128CF1] transition-transform ${
                showExtras ? "rotate-180" : ""
              }`}
            />
            <span
              className={`font-[gothamMedium] text-[#003067] ${TEXT_SECONDARY}`}
            >
              Series, Notes &amp; Acquisition
            </span>
            <Badge
              variant={null}
              className={`border-0 font-normal ${CHIP} bg-gray-100 text-gray-600`}
            >
              {recordedExtras} of {EXTRA_FIELDS.length} recorded
            </Badge>
          </Button>

          {showExtras && (
            <div
              id="collection-extra-fields"
              className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 px-1 sm:grid-cols-2 xl:grid-cols-4"
            >
              {EXTRA_FIELDS.map((field) => (
                <Field
                  key={field.label}
                  icon={field.icon}
                  label={field.label}
                  value={field.read(collectionData)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
