import { useState } from "react";
import { Bookmark, BookOpen, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollectionSummary } from "@/features/opac/collections/types/collections-types";
import {
  cartStatusOf,
} from "@/features/opac/collections/api/collections";

export const borrowLabel = (count: number) =>
  `${count} ${count === 1 ? "borrow" : "borrows"}`;

interface CoverProps {
  book: CollectionSummary;
  className?: string;
  fit?: "cover" | "contain";
}

export function CollectionCover({ book, className, fit = "cover" }: CoverProps) {
  const [broken, setBroken] = useState(false);
  const showCover = Boolean(book.cover) && !broken;

  return (
    <div className={cn("relative overflow-hidden bg-gray-100", className)}>
      {showCover ? (
        <img
          src={book.cover}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className={cn(
            "h-full w-full",
            fit === "contain" ? "object-contain" : "object-cover object-top",
          )}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-300">
          <BookOpen className="h-8 w-8 text-gray-500" strokeWidth={1.5} />
          <span className="px-2 text-center text-xs text-gray-600">
            No Cover Available
          </span>
        </div>
      )}
    </div>
  );
}

interface ToggleButtonProps {
  active: boolean;
  disabled: boolean;
  reason?: string;
  onToggle: () => void;
  className?: string;
}

export function CartButton({
  active,
  disabled,
  reason,
  onToggle,
  className,
}: ToggleButtonProps) {
  const Icon = active ? X : ShoppingCart;
  return (
    <button
      type="button"
      disabled={disabled}
      title={reason || (active ? "Remove from cart" : "Add to cart")}
      aria-label={active ? "Remove from cart" : "Add to cart"}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onToggle();
      }}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition xs:h-9 xs:w-9",
        "hover:bg-[#128CF1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "bg-red-50 text-red-500 disabled:hover:bg-red-50"
          : "bg-[#EAF4FE] text-[#128CF1] disabled:hover:bg-[#EAF4FE]",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function BookmarkButton({
  active,
  disabled,
  reason,
  onToggle,
  className,
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={reason || (active ? "Remove from saved" : "Save for later")}
      aria-label={active ? "Remove from saved" : "Save for later"}
      aria-pressed={active}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onToggle();
      }}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/95 shadow-md transition xs:h-8 xs:w-8",
        "hover:bg-[#128CF1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/95",
        active ? "text-[#128CF1]" : "text-gray-400",
        className,
      )}
    >
      <Bookmark
        className="h-4 w-4"
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}

function CategoryBadge({ book }: { book: CollectionSummary }) {
  const label = book.classCode || book.format;
  if (!label) return null;
  return (
    <span className="max-w-full truncate rounded-md bg-[#EAF4FE] px-1.5 py-0.5 text-[10px] font-[gothamMedium] text-[#128CF1] xs:px-2 xs:py-1 xs:text-[11px]">
      {label}
    </span>
  );
}

function FormatBadge({ book }: { book: CollectionSummary }) {
  if (!book.format || !book.classCode) return null;
  return (
    <span className="max-w-full truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-[gothamMedium] text-slate-600 xs:px-2 xs:py-1 xs:text-[11px]">
      {book.format}
    </span>
  );
}

function AvailabilityBadge({ book }: { book: CollectionSummary }) {
  const { label, className } = {
    ok: { label: "Available now", className: "bg-green-50 text-green-700" },
    availableSoon: {
      label: "Available soon",
      className: "bg-[#128CF1]/10 text-[#0e6bb8]",
    },
    allOut: {
      label: "All copies out on loan",
      className: "bg-[#128CF1]/10 text-[#0e6bb8]",
    },
    libraryUse: {
      label: "Library use only",
      className: "bg-amber-50 text-amber-700",
    },
    noCopies: {
      label: "No copies catalogued",
      className: "bg-red-50 text-red-700",
    },
  }[cartStatusOf(book)];

  return (
    <span
      className={cn(
        "max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-[gothamMedium] xs:px-2 xs:py-1 xs:text-[11px]",
        className,
      )}
    >
      {label}
    </span>
  );
}

interface CollectionCardProps {
  book: CollectionSummary;
  pinned: boolean;
  isNew?: boolean;
  inCart: boolean;
  cartDisabled: boolean;
  cartReason?: string;
  bookmarked: boolean;
  bookmarkDisabled: boolean;
  bookmarkReason?: string;
  onPin: () => void;
  onPreview: () => void;
  onPreviewEnd: () => void;
  onToggleCart: () => void;
  onToggleBookmark: () => void;
}

export function CollectionCard({
  book,
  pinned,
  isNew,
  inCart,
  cartDisabled,
  cartReason,
  bookmarked,
  bookmarkDisabled,
  bookmarkReason,
  onPin,
  onPreview,
  onPreviewEnd,
  onToggleCart,
  onToggleBookmark,
}: CollectionCardProps) {
  return (
    <article
      onClick={onPin}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      className="group h-full cursor-pointer"
    >
      <div
        className={cn(
          "flex h-full flex-col rounded-2xl bg-white p-2.5 text-left xs:p-3",
          "transition-[transform,border-color,box-shadow] duration-300 ease-out",
          "motion-reduce:transition-none",
          "border-2",
          pinned
            ?
              "-translate-y-1 border-[#128CF1] shadow-[0_8px_26px_-4px_rgba(18,140,241,0.48)] group-hover:shadow-[0_14px_36px_-4px_rgba(18,140,241,0.56)]"
            : "border-[#128CF1]/20 shadow-[0_6px_20px_-6px_rgba(18,140,241,0.44)] group-hover:-translate-y-1 group-hover:border-[#128CF1]/55 group-hover:shadow-[0_14px_34px_-8px_rgba(18,140,241,0.54)]",
        )}
      >
        <div className="relative">
          <CollectionCover
            book={book}
            fit="contain"
            className="aspect-square w-full rounded-xl bg-gray-50"
          />
          {isNew && (
            <span className="absolute left-2 top-2 rounded-md bg-[#128CF1] px-2 py-1 text-[10px] font-[gothamBlack] uppercase leading-none tracking-wider text-white shadow-sm">
              New
            </span>
          )}
          <BookmarkButton
            active={bookmarked}
            disabled={bookmarkDisabled}
            reason={bookmarkReason}
            onToggle={onToggleBookmark}
            className="absolute right-2 top-2"
          />
        </div>

        <div className="flex flex-1 flex-col px-0.5 pt-2.5 xs:pt-3">
          <div className="flex flex-col pb-2.5 xs:pb-3">
            <h3>
              <a
                href={`/opac/collections/${book.id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                  )
                    return;
                  event.preventDefault();
                  onPin();
                }}
                onFocus={onPreview}
                onBlur={onPreviewEnd}
                className="line-clamp-3 text-left text-sm font-[gothamBlack] leading-snug text-[#002248] outline-none focus-visible:underline xs:text-[15px]"
              >
                {book.title || "Untitled"}
              </a>
            </h3>
            {book.author && (
              <p className="mt-1 truncate text-xs text-gray-400 xs:text-[13px]">
                {book.author}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1 xs:mt-2 xs:gap-1.5">
              <CategoryBadge book={book} />
              <FormatBadge book={book} />
              <AvailabilityBadge book={book} />
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-1.5 border-t border-gray-100 pt-2.5 xs:gap-2 xs:pt-3">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-[#002248] xs:gap-2 xs:text-[13px]">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#128CF1] xs:h-4 xs:w-4" />
              <span className="truncate">{borrowLabel(book.borrowCount)}</span>
            </span>
            <CartButton
              active={inCart}
              disabled={cartDisabled}
              reason={cartReason}
              onToggle={onToggleCart}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function CollectionListRow({
  book,
  pinned,
  isNew,
  inCart,
  cartDisabled,
  cartReason,
  bookmarked,
  bookmarkDisabled,
  bookmarkReason,
  onPin,
  onPreview,
  onPreviewEnd,
  onToggleCart,
  onToggleBookmark,
}: CollectionCardProps) {
  return (
    <article
      onClick={onPin}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-white p-2.5 xs:gap-4 xs:p-3",
        "transition-[border-color,box-shadow] duration-300 ease-out",
        "motion-reduce:transition-none",
        pinned
          ? "border-[#128CF1] shadow-[0_6px_20px_-4px_rgba(18,140,241,0.48)] hover:shadow-[0_10px_28px_-4px_rgba(18,140,241,0.56)]"
          : "border-[#128CF1]/20 shadow-[0_6px_20px_-6px_rgba(18,140,241,0.44)] hover:border-[#128CF1]/55 hover:shadow-[0_12px_28px_-8px_rgba(18,140,241,0.54)]",
      )}
    >
      <div className="relative shrink-0">
        <CollectionCover
          book={book}
          className="h-16 w-12 rounded-md xs:h-[4.5rem] xs:w-14"
        />
        <BookmarkButton
          active={bookmarked}
          disabled={bookmarkDisabled}
          reason={bookmarkReason}
          onToggle={onToggleBookmark}
          className="absolute -right-1.5 -top-1.5 h-6 w-6 xs:h-7 xs:w-7"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 truncate">
          <a
            href={`/opac/collections/${book.id}`}
            onClick={(event) => {
              event.stopPropagation();
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              )
                return;
              event.preventDefault();
              onPin();
            }}
            onFocus={onPreview}
            onBlur={onPreviewEnd}
            className="max-w-full truncate text-left text-sm font-[gothamMedium] text-[#002248] outline-none focus-visible:underline"
          >
            {book.title || "Untitled"}
          </a>
          {isNew && (
            <span className="shrink-0 rounded-md bg-[#128CF1] px-1.5 py-0.5 text-[9px] font-[gothamBlack] uppercase leading-none tracking-wider text-white">
              New
            </span>
          )}
        </h3>
        {book.author && (
          <p className="mt-0.5 truncate text-xs text-gray-500">{book.author}</p>
        )}
        <p className="mt-1 truncate text-xs text-gray-400">
          {[book.classCode, book.publisher, book.year, book.format]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
      </div>

      <p className="hidden shrink-0 items-center gap-1.5 text-xs text-gray-500 sm:flex">
        <BookOpen className="h-3.5 w-3.5 text-gray-400" />
        {borrowLabel(book.borrowCount)}
      </p>

      <CartButton
        active={inCart}
        disabled={cartDisabled}
        reason={cartReason}
        onToggle={onToggleCart}
      />
    </article>
  );
}
