import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { TablePagination } from "@/components/ui/Table";
import { Text } from "@/components/ui/Text";
import {
	CollectionCard,
	CollectionListRow,
} from "@/features/opac/collections/components/CollectionCard";
import type {
	CollectionSummary,
	CollectionsViewMode,
} from "@/features/opac/collections/types/collections-types";

const GRID =
	"grid grid-cols-2 gap-3 xs:gap-4 sm:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5";

function ResultsSkeleton({
	view,
	count,
}: {
	view: CollectionsViewMode;
	count: number;
}) {
	const rows = Array.from({ length: count });
	if (view === "list") {
		return (
			<div className="space-y-2">
				{rows.map((_, index) => (
					<Skeleton key={index} className="h-[6.25rem] w-full rounded-xl" />
				))}
			</div>
		);
	}
	return (
		<div className={GRID}>
			{rows.map((_, index) => (
				<div key={index} className="space-y-2 rounded-2xl border-2 border-[#128CF1]/20 bg-white p-3">
					<Skeleton className="aspect-square w-full rounded-xl" />
					<Skeleton className="h-4 w-4/5" />
					<Skeleton className="h-3 w-3/5" />
					<Skeleton className="h-6 w-1/2" />
				</div>
			))}
		</div>
	);
}

interface CollectionsResultsProps {
	loading: boolean;
	books: CollectionSummary[];
	view: CollectionsViewMode;
	heading: string;
	controls?: ReactNode;
	totalCount: number;
	startIndex: number;
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	perPage: number;
	perPageOptions: number[];
	onPerPageChange: (value: number) => void;
	pinnedId: string | null;
	onPin: (id: string) => void;
	onPreview: (id: string | null) => void;
	isNew: (id: string) => boolean;
	isInCart: (id: string) => boolean;
	cartDisabled: boolean;
	cartReason?: string;
	onToggleCart: (book: CollectionSummary) => void;
	isBookmarked: (id: string) => boolean;
	bookmarkDisabled: boolean;
	bookmarkReason?: string;
	onToggleBookmark: (book: CollectionSummary) => void;
	searchTerm: string;
}

export function CollectionsResults({
	loading,
	books,
	view,
	heading,
	controls,
	totalCount,
	startIndex,
	currentPage,
	totalPages,
	onPageChange,
	perPage,
	perPageOptions,
	onPerPageChange,
	pinnedId,
	onPin,
	onPreview,
	isNew,
	isInCart,
	cartDisabled,
	cartReason,
	onToggleCart,
	isBookmarked,
	bookmarkDisabled,
	bookmarkReason,
	onToggleBookmark,
	searchTerm,
}: CollectionsResultsProps) {
	const cardProps = (book: CollectionSummary) => ({
		book,
		pinned: book.id === pinnedId,
		isNew: isNew(book.id),
		inCart: isInCart(book.id),
		cartDisabled,
		cartReason,
		bookmarked: isBookmarked(book.id),
		bookmarkDisabled,
		bookmarkReason,
		onPin: () => onPin(book.id),
		onPreview: () => onPreview(book.id),
		onPreviewEnd: () => onPreview(null),
		onToggleCart: () => onToggleCart(book),
		onToggleBookmark: () => onToggleBookmark(book),
	});

	return (
		<section className="w-full overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-[0_18px_44px_-28px_rgba(0,34,72,0.65)] backdrop-blur-md">
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#002248]/10 px-3 py-3.5 xs:px-4 sm:px-5 sm:py-4 md:py-5">
				<Text
					as="h2"
					className="min-w-0 truncate text-2xl font-[gothamBlack] tracking-[-0.005em] text-[#002248] md:text-3xl"
				>
					{heading}
				</Text>
				{controls}
			</div>

			{/* The shelf is tinted a shade past the frame so the white cards
			    read as tiles laid on it rather than as cut-outs floating over
			    the page photograph. */}
			<div className="bg-[#E8F1FB]/70 p-3 xs:p-4 sm:p-5">
				{loading ? (
					<ResultsSkeleton view={view} count={perPage} />
				) : books.length === 0 ? (
					<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#002248]/20 bg-white/70 px-4 py-12 text-center sm:px-6 sm:py-16">
						<SearchX className="h-8 w-8 text-gray-300" />
						<Text className="text-sm font-[gothamMedium] text-[#002248]">
							{searchTerm ? `No books found for "${searchTerm}"` : "No books here yet"}
						</Text>
						<Text className="max-w-sm text-xs text-gray-500">
							Try a broader term, or clear the filters above to widen the shelf.
						</Text>
					</div>
				) : view === "list" ? (
					<div className="space-y-2">
						{books.map((book) => (
							<CollectionListRow key={book.id} {...cardProps(book)} />
						))}
					</div>
				) : (
					<div className={GRID}>
						{books.map((book) => (
							<CollectionCard key={book.id} {...cardProps(book)} />
						))}
					</div>
				)}
			</div>

			{!loading && totalCount > 0 && (
				<div className="border-t border-[#002248]/10 px-3 py-2.5 sm:px-5">
					<TablePagination
						currentPage={currentPage}
						totalPages={totalPages}
						itemsPerPage={perPage}
						onItemsPerPageChange={onPerPageChange}
						onGoToPage={onPageChange}
						onPrevPage={() => onPageChange(currentPage - 1)}
						onNextPage={() => onPageChange(currentPage + 1)}
						itemsPerPageOptions={perPageOptions}
						summary={
							<>
								<span className="xs:hidden">
									{startIndex + 1}–
									{Math.min(startIndex + books.length, totalCount)} of{" "}
									{totalCount}
								</span>
								<span className="hidden xs:inline">
									Showing {startIndex + 1}–
									{Math.min(startIndex + books.length, totalCount)} of{" "}
									{totalCount} books
								</span>
							</>
						}
						className="mt-0 w-full rounded-none border-0 bg-transparent px-0 py-0 shadow-none sm:px-0"
					/>
				</div>
			)}
		</section>
	);
}
