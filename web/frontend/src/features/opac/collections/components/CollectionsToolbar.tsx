import { Search, X } from "lucide-react";
import {
	FilterPopover,
	type FilterSection,
} from "@/components/ui/FilterPopover";
import { SortPopover } from "@/components/ui/SortPopover";
import { cn } from "@/lib/utils";
import {
	SEARCH_SORT_OPTIONS,
	SORT_OPTIONS,
} from "@/features/opac/collections/api/collections-logic";
import type {
	AvailabilityFilter,
	CollectionsFilters,
	CollectionsSortColumn,
	CollectionsSortState,
} from "@/features/opac/collections/types/collections-types";

const AVAILABILITY_OPTIONS: Array<{ id: AvailabilityFilter; label: string }> = [
	{ id: "all", label: "Any availability" },
	{ id: "available", label: "Available now" },
	{ id: "availableSoon", label: "Available soon" },
	{ id: "allOut", label: "All copies out on loan" },
	{ id: "libraryUse", label: "For library use only" },
];

interface CollectionsToolbarProps {
	value: string;
	onChange: (value: string) => void;
	onClear: () => void;
	searching: boolean;

	pendingFilters: CollectionsFilters;
	onPendingFiltersChange: (filters: CollectionsFilters) => void;
	filterOpen: boolean;
	onFilterOpenChange: (open: boolean) => void;
	onApplyFilters: () => void;
	onResetFilters: () => void;
	activeFilterCount: number;

	pendingSort: CollectionsSortState;
	onPendingSortChange: (sort: CollectionsSortState) => void;
	sortOpen: boolean;
	onSortOpenChange: (open: boolean) => void;
	onApplySort: () => void;
	onResetSort: () => void;
	activeSortCount: number;

	tone?: "default" | "onNavy";
}

const TRIGGER =
	"h-9 flex-1 gap-1.5 rounded-lg border-gray-200 px-3 text-xs min-[400px]:h-10 min-[400px]:flex-none min-[400px]:shrink-0 min-[400px]:gap-2 min-[400px]:px-3.5 min-[400px]:text-sm";

export function CollectionsToolbar({
	value,
	onChange,
	onClear,
	searching,
	pendingFilters,
	onPendingFiltersChange,
	filterOpen,
	onFilterOpenChange,
	onApplyFilters,
	onResetFilters,
	activeFilterCount,
	pendingSort,
	onPendingSortChange,
	sortOpen,
	onSortOpenChange,
	onApplySort,
	onResetSort,
	activeSortCount,
	tone = "default",
}: CollectionsToolbarProps) {
	const navy = tone === "onNavy";

	const trigger = (active: boolean) =>
		cn(
			TRIGGER,
			navy &&
				(active
					? "border-white bg-white text-[#002248] hover:bg-white"
					: "border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"),
		);

	const filterSections: FilterSection[] = [
		{
			id: "availability",
			title: "Availability",
			type: "radio",
			options: AVAILABILITY_OPTIONS,
			value: pendingFilters.availability,
			onChange: (next) =>
				onPendingFiltersChange({
					...pendingFilters,
					availability: next as AvailabilityFilter,
				}),
		},
	];

	return (
		<div className="flex w-full flex-wrap items-center gap-2 min-[400px]:flex-nowrap">
			<div className="relative w-full min-w-0 min-[400px]:w-auto min-[400px]:flex-1">
				<Search
					className={cn(
						"pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
						navy ? "text-white/60" : "text-gray-400",
					)}
				/>
				<input
					type="search"
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder="Search books by title, author, subject or keyword..."
					autoComplete="off"
					aria-label="Search books"
					className={cn(
						"h-10 w-full rounded-lg border pl-9 pr-10 text-sm outline-none transition",
						"[&::-webkit-search-cancel-button]:hidden",
						navy
							?
								"border-white/25 bg-white/10 text-white placeholder:text-white/55 focus:border-white/70 focus:ring-2 focus:ring-white/20"
							: "border-gray-200 bg-white text-[#002248] placeholder:text-gray-400 focus:border-[#128CF1] focus:ring-2 focus:ring-[#128CF1]/20",
					)}
				/>
				{value.length > 0 && (
					<button
						type="button"
						onClick={onClear}
						aria-label="Clear search"
						className={cn(
							"absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 transition",
							navy
								? "text-white/70 hover:bg-white/15 hover:text-white"
								: "text-gray-400 hover:bg-gray-100 hover:text-[#002248]",
						)}
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>

			<div className="flex w-full items-center gap-2 min-[400px]:w-auto">
			<SortPopover
				options={searching ? SEARCH_SORT_OPTIONS : SORT_OPTIONS}
				value={pendingSort.column}
				direction={pendingSort.direction}
				onValueChange={(next) =>
					onPendingSortChange({
						...pendingSort,
						column: next as CollectionsSortColumn,
					})
				}
				onDirectionChange={(direction) =>
					onPendingSortChange({ ...pendingSort, direction })
				}
				isOpen={sortOpen}
				onOpenChange={onSortOpenChange}
				onApply={onApplySort}
				onReset={onResetSort}
				activeSortCount={activeSortCount}
				title="Sort Books"
				labelClassName="inline min-[400px]:hidden sm:inline"
				triggerClassName={trigger(activeSortCount > 0)}
			/>

			<FilterPopover
				sections={filterSections}
				isOpen={filterOpen}
				onOpenChange={onFilterOpenChange}
				onReset={onResetFilters}
				onApply={onApplyFilters}
				activeFilterCount={activeFilterCount}
				title="Filter Books"
				leftColumnIds={[]}
				rightColumnIds={["availability"]}
				hasResidencySection={false}
				hasBarangaySection={false}
				contentClassName="w-[260px] sm:w-[260px]"
				labelClassName="inline min-[400px]:hidden sm:inline"
				triggerClassName={trigger(activeFilterCount > 0)}
			/>
			</div>
		</div>
	);
}
