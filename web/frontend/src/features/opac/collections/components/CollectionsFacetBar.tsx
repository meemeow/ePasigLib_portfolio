import { LayoutGrid, List } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import {
	ALL_FACET,
	type CollectionsFilters,
	type CollectionsViewMode,
} from "@/features/opac/collections/types/collections-types";

interface FacetSelectProps {
	label: string;
	value: string;
	options: string[];
	onChange: (value: string) => void;
}

function FacetSelect({ label, value, options, onChange }: FacetSelectProps) {
	const empty = options.length === 0;
	return (
		<Select value={value} onValueChange={onChange} disabled={empty}>
			<SelectTrigger
				size="sm"
				aria-label={label}
				title={empty ? `The catalogue records no ${label.toLowerCase()} yet` : undefined}
				className={cn(
					"h-8 w-auto min-w-[6.5rem] border-gray-200 bg-white text-xs text-[#002248] shadow-sm xs:h-9 xs:min-w-[7.5rem] xs:text-sm",
					value !== ALL_FACET && "border-[#128CF1]/40 bg-[#128CF1]/10",
				)}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent className="max-h-[20.5rem]">
				<SelectItem value={ALL_FACET} className="text-sm">
					{label}
				</SelectItem>
				{options.map((option) => (
					<SelectItem key={option} value={option} className="text-sm">
						{option}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

interface CollectionsFacetBarProps {
	filters: CollectionsFilters;
	onFacetChange: (key: "format" | "year", value: string) => void;
	facets: { formats: string[]; years: string[] };
	view: CollectionsViewMode;
	onViewChange: (view: CollectionsViewMode) => void;
}

export function CollectionsFacetBar({
	filters,
	onFacetChange,
	facets,
	view,
	onViewChange,
}: CollectionsFacetBarProps) {
	return (
		<div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-start">
			<div className="-mx-1 flex min-w-0 items-center gap-2 overflow-x-auto px-1 py-0.5">
				<FacetSelect
					label="All Formats"
					value={filters.format}
					options={facets.formats}
					onChange={(format) => onFacetChange("format", format)}
				/>
				<FacetSelect
					label="All Year"
					value={filters.year}
					options={facets.years}
					onChange={(year) => onFacetChange("year", year)}
				/>
			</div>

			<div role="group" aria-label="View" className="flex shrink-0 items-center gap-2">
				{(
					[
						{ mode: "grid" as const, Icon: LayoutGrid, label: "Grid view" },
						{ mode: "list" as const, Icon: List, label: "List view" },
					]
				).map(({ mode, Icon, label }) => (
					<button
						key={mode}
						type="button"
						onClick={() => onViewChange(mode)}
						aria-label={label}
						aria-pressed={view === mode}
						className={cn(
							"flex h-8 w-8 items-center justify-center rounded-lg border transition-colors xs:h-9 xs:w-9",
							view === mode
								? "border-[#128CF1] bg-[#128CF1] text-white"
								: "border-gray-200 bg-white text-gray-400 hover:text-[#002248]",
						)}
					>
						<Icon className="h-4 w-4 xs:h-[18px] xs:w-[18px]" />
					</button>
				))}
			</div>
		</div>
	);
}
