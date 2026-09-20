import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  BarChart3,
  MousePointerClick,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import {
  hasAvailableCopy,
  hasLibraryUseCopy,
  hasLendableCopy,
  hasIncomingCopy,
} from "@/features/opac/collections/api/collections";
import {
  CollectionCover,
  borrowLabel,
} from "@/features/opac/collections/components/CollectionCard";
import type { CollectionSummary } from "@/features/opac/collections/types/collections-types";

function availabilityNote(book: CollectionSummary): { label: string; tone: string } {
  if (hasAvailableCopy(book))
    return {
      label: "Available now",
      tone: "bg-green-50 text-green-700 border-green-200",
    };
  if (hasLendableCopy(book))
    return {
      label: hasIncomingCopy(book)
        ? "Available soon"
        : "All copies out on loan",
      tone: "bg-[#128CF1]/10 text-[#0e6bb8] border-[#128CF1]/30",
    };
  if (hasLibraryUseCopy(book))
    return {
      label: "For library use only",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    };
  return {
    label: "No copies catalogued",
    tone: "bg-red-50 text-red-700 border-red-200",
  };
}

function rankBucket(rank: number): number {
  if (rank <= 5) return 5;
  if (rank <= 10) return 10;
  return 20;
}

export function CollectionDetailPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <MousePointerClick className="h-8 w-8 text-gray-300" strokeWidth={1.5} />
      <Text className="text-[13px] leading-relaxed text-gray-400">
        Hover a book to see its details here, or click to keep them open.
      </Text>
    </div>
  );
}

interface MetaRowProps {
  label: string;
  value: string;
}

function MetaRow({ label, value }: MetaRowProps) {
  if (!value) return null;
  return (
    <p className="text-[13px] leading-relaxed">
      <span className="font-[gothamMedium] text-[#002248]">{label}: </span>
      <span className="text-gray-600">{value}</span>
    </p>
  );
}

interface CollectionDetailPanelProps {
  book: CollectionSummary;
  inCart: boolean;
  cartDisabled: boolean;
  cartReason?: string;
  onToggleCart: () => void;
  bookmarked: boolean;
  bookmarkDisabled: boolean;
  bookmarkReason?: string;
  onToggleBookmark: () => void;
  onClose: () => void;
  closeable: boolean;
  borrowRank: number | null;
  entrance?: "side" | "fade";
}

export function CollectionDetailPanel({
  book,
  inCart,
  cartDisabled,
  cartReason,
  onToggleCart,
  bookmarked,
  bookmarkDisabled,
  bookmarkReason,
  onToggleBookmark,
  onClose,
  closeable,
  borrowRank,
  entrance = "side",
}: CollectionDetailPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const availability = availabilityNote(book);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col animate-in fade-in-0 ease-out motion-reduce:animate-none",
        entrance === "side"
          ? "slide-in-from-right-3 duration-500"
          :
            "duration-300",
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3 sm:gap-x-5 xl:gap-x-3">
        <CollectionCover
          book={book}
          className="order-1 h-[13rem] w-[9rem] shrink-0 rounded-lg shadow-sm 2xl:h-[14rem] 2xl:w-[10rem] 3xl:h-[15rem] 3xl:w-[10.5rem]"
        />

        <div className="order-2 ml-auto flex flex-col items-end gap-3 sm:order-3 sm:ml-0 xl:order-2 xl:ml-auto">
          {closeable && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-[#002248]"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>

        <div className="order-3 mt-4 flex w-full min-w-0 flex-col xs:mt-5 sm:order-2 sm:mt-0 sm:w-auto sm:flex-1 xl:order-3 xl:mt-5 xl:w-full xl:flex-none">
          <Text
            as="h2"
            className="text-lg font-[gothamBlack] leading-snug text-[#002248] xs:text-xl"
          >
            {book.title || "Untitled"}
          </Text>

          <div className="mt-3 space-y-1.5">
            <MetaRow label="Author" value={book.author} />
            <MetaRow label="Publisher" value={book.publisher} />
            <MetaRow label="Year" value={book.year} />
            <MetaRow label="Format" value={book.format} />
            <MetaRow label="Collection" value={book.classCode} />
          </div>

          <div className="mt-5 rounded-lg bg-[#F1F7FD] px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-[gothamMedium] text-[#002248]">
              <BarChart3 className="h-4 w-4 text-[#128CF1]" strokeWidth={2.5} />
              {borrowLabel(book.borrowCount)}
            </p>
            {borrowRank !== null && (
              <p className="mt-0.5 pl-6 text-[11px] text-gray-500">
                Top {rankBucket(borrowRank)} most borrowed
              </p>
            )}
          </div>

          {/* The rank chip rides with availability rather than beside the
             close button: stacked up there it widened that column enough to
             wrap the whole header at the panel width. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-[gothamMedium]",
                availability.tone,
              )}
            >
              {availability.label}
            </span>

            {borrowRank !== null && (
              <span className="flex items-center gap-1.5 rounded-full border border-transparent bg-[#DCEAF9] px-2.5 py-1 text-[11px] font-[gothamMedium] text-[#0F5FA8]">
                <BarChart3 className="h-3 w-3" strokeWidth={2.5} />
                Top Borrowed
              </span>
            )}
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="md"
        onClick={onToggleCart}
        disabled={cartDisabled}
        title={cartReason}
        className={cn(
          "mt-4 w-full justify-center rounded-lg border-gray-200 text-sm",
          inCart
            ? "border-[#128CF1] bg-[#128CF1]/10 text-[#0e6bb8]"
            : "text-[#002248]",
        )}
      >
        <ShoppingCart className="h-4 w-4" />
        {inCart ? "Remove from Cart" : "Add to Cart"}
      </Button>

      <Button
        variant="outline"
        size="md"
        onClick={onToggleBookmark}
        disabled={bookmarkDisabled}
        title={bookmarkReason}
        className={cn(
          "mt-2 w-full justify-center rounded-lg border-gray-200 text-sm",
          bookmarked
            ? "border-[#128CF1] bg-[#128CF1]/10 text-[#0e6bb8]"
            : "text-[#002248]",
        )}
      >
        <Bookmark
          className="h-4 w-4"
          fill={bookmarked ? "currentColor" : "none"}
        />
        {bookmarked ? "Saved" : "Save for Later"}
      </Button>

      {book.description && (
        <div className="mt-5">
          <Text as="h3" className="text-sm font-[gothamMedium] text-[#002248]">
            Description
          </Text>
          <p
            className={cn(
              "mt-2 text-[13px] leading-relaxed text-gray-600",
              !expanded && "line-clamp-5",
            )}
          >
            {book.description}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="mt-1 text-[13px] text-[#128CF1] hover:underline"
          >
            {expanded ? "Read less" : "Read more"}
          </button>
        </div>
      )}

      <Button
        size="md"
        asChild
        className="mt-5 w-full justify-center rounded-lg bg-[#128CF1] text-sm text-white hover:bg-[#0e6bb8] hover:no-underline"
      >
        <Link to={`/opac/collections/${book.id}`}>
          <Search className="h-4 w-4" />
          Check Full Details
        </Link>
      </Button>
    </div>
  );
}
