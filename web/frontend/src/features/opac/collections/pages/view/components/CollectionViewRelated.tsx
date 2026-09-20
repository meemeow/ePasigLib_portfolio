import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ImageOff, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { TablePagination } from "@/components/ui/Table";
import { Text } from "@/components/ui/Text";
import {
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "@/features/lms/collections/pages/view-collection/constants/type-scale";
import type { RelatedCollectionsResponse } from "@/features/opac/collections/types/collection-view-types";

type RelatedBook = RelatedCollectionsResponse["relatedByAuthor"][number];

const PER_PAGE = 8;
const PER_PAGE_OPTIONS = [8, 16, 24, 48];

function Tile({ book }: { book: RelatedBook }) {
  const navigate = useNavigate();
  const [broken, setBroken] = useState(false);
  const showCover = Boolean(book.CollectionImage) && !broken;

  return (
    <button
      type="button"
      onClick={() => navigate(`/opac/collections/${book.id}`)}
      className="group flex h-full cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-3 text-left transition duration-300 ease-out hover:-translate-y-1 hover:border-[#128CF1]/40 hover:shadow-lg motion-reduce:transition-none"
    >
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-50">
        {showCover ? (
          <img
            src={book.CollectionImage}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-gray-400">
            <ImageOff className="size-6" strokeWidth={1.5} />
            <span className="px-2 text-center text-[11px]">No cover</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <Text
          className={`line-clamp-2 font-[gothamMedium] text-[#003067] ${TEXT_PRIMARY}`}
        >
          {book.CollectionTitle || "Untitled"}
        </Text>
        {book.MainAuthor && (
          <Text className="mt-1 truncate text-xs text-gray-500">
            {book.MainAuthor}
          </Text>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          {book.ClassCode ? (
            <Badge
              variant={null}
              className="border-0 bg-[#EAF4FE] px-2 py-0.5 text-[11px] font-normal font-[gothamMedium] text-[#0F76CC]"
            >
              {book.ClassCode}
            </Badge>
          ) : (
            <span />
          )}
          <Text className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
            <BookOpen className="size-3.5 text-[#128CF1]" />
            {book.BorrowCount || 0}
          </Text>
        </div>
      </div>
    </button>
  );
}

function Section({
  title,
  caption,
  books,
  emptyText,
}: {
  title: string;
  caption: string;
  books: RelatedBook[];
  emptyText: string;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);

  const totalPages = Math.max(1, Math.ceil(books.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const shown = books.slice(startIndex, startIndex + perPage);

  return (
    <section>
      <Text className={`font-[gothamMedium] text-[#003067] ${TEXT_PRIMARY}`}>
        {title}
      </Text>
      <Text className={`mt-0.5 text-gray-500 ${TEXT_SECONDARY}`}>{caption}</Text>

      {books.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center">
          <SearchX className="size-7 text-gray-300" />
          <Text className="text-xs text-gray-500">{emptyText}</Text>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((book) => (
              <Tile key={book.id} book={book} />
            ))}
          </div>

          {totalPages > 1 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={perPage}
              onItemsPerPageChange={(value) => {
                setPerPage(value);
                setPage(1);
              }}
              onGoToPage={setPage}
              onPrevPage={() => setPage(currentPage - 1)}
              onNextPage={() => setPage(currentPage + 1)}
              itemsPerPageOptions={PER_PAGE_OPTIONS}
              summary={`Showing ${startIndex + 1}–${Math.min(
                startIndex + shown.length,
                books.length,
              )} of ${books.length}`}
              className="w-full"
            />
          )}
        </>
      )}
    </section>
  );
}

interface CollectionViewRelatedProps {
  byAuthor: RelatedBook[];
  byPublisher: RelatedBook[];
  author: string;
  publisher: string;
}

export default function CollectionViewRelated({
  byAuthor,
  byPublisher,
  author,
  publisher,
}: CollectionViewRelatedProps) {
  return (
    <div className="space-y-8">
      <Section
        title="More by this author"
        caption={author ? `Other titles catalogued under ${author}.` : "Other titles by the same author."}
        books={byAuthor}
        emptyText="Nothing else by this author is catalogued yet."
      />
      <div className="border-t border-gray-200" />
      <Section
        title="More from this publisher"
        caption={
          publisher
            ? `Other titles published by ${publisher}.`
            : "Other titles from the same publisher."
        }
        books={byPublisher}
        emptyText="Nothing else from this publisher is catalogued yet."
      />
    </div>
  );
}
