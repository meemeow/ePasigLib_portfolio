import { useState } from "react";
import {
  Barcode,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  Copyright,
  FileDigit,
  Hash,
  ImageOff,
  Layers,
  Library,
  MapPin,
  Ruler,
  Tag,
  Tags,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  TEXT_PRIMARY,
  TEXT_PROSE,
  TEXT_SECONDARY,
} from "@/features/lms/collections/pages/view-collection/constants/type-scale";
import type { CollectionDetail } from "@/features/opac/collections/types/collection-view-types";

const SUMMARY_LIMIT = 500;

const CHIP =
  "rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-[gothamMedium]";

function Entry({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#128CF1]" />
      <div className="min-w-0 flex-1">
        <Text className={`font-[gothamMedium] text-[#003067] ${TEXT_SECONDARY}`}>
          {label}
        </Text>
        <Text className={`break-words text-gray-700 ${TEXT_PRIMARY}`}>
          {value}
        </Text>
      </div>
    </div>
  );
}

function ChipList({
  icon: Icon,
  title,
  items,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-[#128CF1]" />
        <Text className={`font-[gothamMedium] text-[#003067] ${TEXT_SECONDARY}`}>
          {title}
        </Text>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge
            key={item}
            variant={null}
            className={`border-0 bg-[#EAF4FE] font-normal text-[#0F76CC] ${CHIP}`}
          >
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface CollectionViewDetailsProps {
  book: CollectionDetail;
  availability: {
    total: number;
    available: number;
    incoming: number;
    libraryUseOnly: boolean;
  };
}

export default function CollectionViewDetails({
  book,
  availability,
}: CollectionViewDetailsProps) {
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);

  const longDescription = book.description.length > SUMMARY_LIMIT;
  const description =
    longDescription && !showFullDesc
      ? `${book.description.slice(0, SUMMARY_LIMIT).trimEnd()}…`
      : book.description;

  const showCover = Boolean(book.cover) && !coverBroken;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="mx-auto w-40 shrink-0 sm:w-48 lg:mx-0">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            {showCover ? (
              <img
                src={book.cover}
                alt=""
                onError={() => setCoverBroken(true)}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-400">
                <ImageOff className="size-7" strokeWidth={1.5} />
                <span className="px-2 text-center text-xs">
                  No cover available
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <Text
            as="h1"
            className="text-xl font-[gothamBlack] leading-snug text-[#011b38] sm:text-2xl"
          >
            {book.title || "Untitled"}
          </Text>
          {book.secondTitle && (
            <Text className={`mt-1 text-gray-500 ${TEXT_PROSE}`}>
              {book.secondTitle}
            </Text>
          )}
          {book.author && (
            <Text className={`mt-2 text-gray-600 ${TEXT_PRIMARY}`}>
              by {book.author}
            </Text>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {book.classCode && (
              <Badge
                variant={null}
                className={`border-0 bg-[#EAF4FE] font-normal text-[#0F76CC] ${CHIP}`}
              >
                {book.classCode}
              </Badge>
            )}
            {book.materialType && (
              <Badge
                variant={null}
                className={`border-0 bg-gray-100 font-normal text-gray-600 ${CHIP}`}
              >
                {book.materialType}
              </Badge>
            )}
            <Badge
              variant={null}
              className={`border-0 font-normal ${CHIP} ${
                availability.available > 0
                  ? "bg-green-100 text-green-700"
                  : availability.libraryUseOnly
                    ? "bg-amber-100 text-amber-700"
                    : availability.total > 0
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
              }`}
            >
              {availability.available > 0
                ? `${availability.available} on the shelf`
                : availability.libraryUseOnly
                  ? "Library use only"
                  : availability.total > 0
                    ?
                      availability.incoming > 0
                      ? "Available soon"
                      : "All copies out on loan"
                    : "No copies catalogued"}
            </Badge>
          </div>

          {typeof book.borrowCount === "number" && (
            <Text
              className={`mt-3 flex items-center gap-2 text-gray-500 ${TEXT_PROSE}`}
            >
              <BookOpen className="size-4 shrink-0 text-[#128CF1]" />
              {book.borrowCount} {book.borrowCount === 1 ? "borrow" : "borrows"}
            </Text>
          )}

          {book.description && (
            <div className="mt-4">
              <Text
                className={`font-[gothamMedium] text-[#003067] ${TEXT_SECONDARY}`}
              >
                Summary
              </Text>
              <Text
                className={`mt-1 whitespace-pre-line break-words text-gray-700 ${TEXT_PROSE}`}
              >
                {description}
              </Text>
              {longDescription && (
                <Button
                  variant="link"
                  size={null}
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="mt-1 h-auto p-0 text-xs"
                >
                  {showFullDesc ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-gray-200 pt-6 sm:grid-cols-2 xl:grid-cols-3">
        <Entry icon={User} label="Main Author" value={book.author} />
        <Entry icon={Building2} label="Publisher" value={book.publisher} />
        <Entry icon={MapPin} label="Place of Publication" value={book.publicationPlace} />
        <Entry icon={CalendarDays} label="Publication Year" value={book.publicationYear} />
        <Entry icon={Copyright} label="Copyright Year" value={book.copyrightYear} />
        <Entry icon={Layers} label="Edition" value={book.edition} />
        <Entry icon={Library} label="Volume" value={book.volume} />
        <Entry icon={Tag} label="Class Code" value={book.classCode} />
        <Entry icon={Hash} label="Call Number" value={book.callNumber} />
        <Entry icon={Barcode} label="ISBN-13" value={book.isbn13} />
        <Entry icon={Barcode} label="ISBN-10" value={book.isbn10} />
        <Entry icon={BookMarked} label="Material Type" value={book.materialType} />
        <Entry icon={FileDigit} label="Pages" value={book.pageCount} />
        <Entry icon={Ruler} label="Size" value={book.size} />
        <Entry icon={BookOpen} label="Includes" value={book.includesSummary} />
      </div>

      {(book.subjects.length > 0 || book.relatedNames.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ChipList icon={Tags} title="Subjects" items={book.subjects} />
          <ChipList icon={Users} title="Related Names" items={book.relatedNames} />
        </div>
      )}

      {(book.locations.length > 0 || book.otherCopies.length > 0) && (
        <div className="border-t border-gray-200 pt-6">
          <Text className={`font-[gothamMedium] text-[#003067] ${TEXT_PRIMARY}`}>
            Where to find it
          </Text>

          {book.locations.length > 0 && (
            <ul className="mt-3 space-y-2">
              {book.locations.map((copy, index) => (
                <li
                  key={`${copy.branch}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <Text
                      className={`font-[gothamMedium] text-[#003067] ${TEXT_PROSE}`}
                    >
                      {copy.branch || "Pasig Knowledge Center"}
                    </Text>
                    {(copy.section || copy.callNumber) && (
                      <Text className="mt-0.5 truncate text-xs text-gray-500">
                        {[copy.section, copy.callNumber]
                          .filter(Boolean)
                          .join("  ·  ")}
                      </Text>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {copy.forLibraryUse && (
                      <Badge
                        variant={null}
                        className={`border-0 bg-amber-100 font-normal text-amber-700 ${CHIP}`}
                      >
                        Library use only
                      </Badge>
                    )}
                    <Badge
                      variant={null}
                      className={`border-0 font-normal ${CHIP} ${
                        copy.available
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {copy.available ? "On the shelf" : "Out"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {book.otherCopies.length > 0 && (
            <>
              <Text className={`mt-5 text-gray-500 ${TEXT_SECONDARY}`}>
                Held at other libraries — not lent through this catalogue.
              </Text>
              <ul className="mt-2 space-y-2">
                {book.otherCopies.map((copy, index) => (
                  <li
                    key={`${copy.branch}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <Text
                        className={`font-[gothamMedium] text-[#003067] ${TEXT_PROSE}`}
                      >
                        {copy.branch}
                      </Text>
                      {copy.callNumber && (
                        <Text className="mt-0.5 truncate text-xs text-gray-500">
                          {copy.callNumber}
                        </Text>
                      )}
                    </div>
                    <Text className="shrink-0 text-xs text-gray-500">
                      {copy.copiesAvailable}{" "}
                      {copy.copiesAvailable === 1 ? "copy" : "copies"}
                    </Text>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
