import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Search } from "@/components/ui/Search";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import {
  FilterPopover,
  type FilterSection,
} from "@/components/ui/FilterPopover";
import { SortPopover } from "@/components/ui/SortPopover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { SECTION_CONFIG } from "@/features/lms/library-desk/api/desk-sections";
import { CHAT_STATE_OPTIONS } from "@/features/lms/library-desk/types/chat-types";
import type {
  DeskSection,
  DeskSortState,
  SectionFilters,
} from "@/features/lms/library-desk/types/desk-types";

interface DeskToolbarProps<S extends DeskSection> {
  section: S;
  totalCount: number;
  loading: boolean;

  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;

  onCreate: () => void;
  canCreate: boolean;

  extraAction?: ReactNode;

  availableTags?: string[];

  pendingSort: DeskSortState<S>;
  setPendingSort: (value: DeskSortState<S>) => void;
  isSortOpen: boolean;
  openSort: (open: boolean) => void;
  applySort: () => void;
  resetSort: () => void;
  activeSortCount: number;

  pendingFilters: SectionFilters[S];
  setPendingFilters: (value: SectionFilters[S]) => void;
  isFilterOpen: boolean;
  openFilter: (open: boolean) => void;
  applyFilter: () => void;
  resetFilter: () => void;
  activeFilterCount: number;
}

export default function DeskToolbar<S extends DeskSection>({
  section,
  totalCount,
  loading,
  search,
  onSearchChange,
  onRefresh,
  onCreate,
  canCreate,
  extraAction,
  availableTags = [],
  pendingSort,
  setPendingSort,
  isSortOpen,
  openSort,
  applySort,
  resetSort,
  activeSortCount,
  pendingFilters,
  setPendingFilters,
  isFilterOpen,
  openFilter,
  applyFilter,
  resetFilter,
  activeFilterCount,
}: DeskToolbarProps<S>) {
  const config = SECTION_CONFIG[section];
  const draft = pendingFilters as SectionFilters[S] & Record<string, unknown>;

  const patch = (changes: Record<string, unknown>) =>
    setPendingFilters({ ...draft, ...changes } as SectionFilters[S]);

  const sections: FilterSection[] = [];
  const leftColumnIds: string[] = [];
  const rightColumnIds: string[] = [];

  if (Array.isArray(draft.status)) {
    sections.push({
      id: "status",
      title: "Status",
      type: "checkbox",
      options: config.statusOptions,
      value: draft.status as string[],
      onChange: (value) => patch({ status: value as string[] }),
    });
    leftColumnIds.push("status");
  }

  if (typeof draft.state === "string") {
    sections.push({
      id: "state",
      title: "Queue",
      type: "radio",
      options: CHAT_STATE_OPTIONS,
      value: draft.state as string,
      onChange: (value) => patch({ state: value as string }),
    });
    leftColumnIds.push("state");
  }

  if (Array.isArray(draft.concern) && availableTags.length > 0) {
    sections.push({
      id: "concern",
      title: "Concern",
      type: "checkbox",
      options: availableTags.map((concern) => ({
        id: concern,
        label: concern,
      })),
      value: draft.concern as string[],
      onChange: (value) => patch({ concern: value as string[] }),
    });
    rightColumnIds.push("concern");
  }

  if (Array.isArray(draft.tags) && availableTags.length > 0) {
    sections.push({
      id: "tags",
      title: "Tags",
      type: "checkbox",
      options: availableTags.map((tag) => ({ id: tag, label: tag })),
      value: draft.tags as string[],
      onChange: (value) => patch({ tags: value as string[] }),
    });
    rightColumnIds.push("tags");
  }

  const dateRange = (
    <div className="space-y-2">
      <Text
        as="div"
        className="text-[10px] font-[gothamMedium] uppercase tracking-wider text-gray-500"
      >
        Date range
      </Text>
      <Select
        value={String(draft.dateField || config.dateFieldOptions[0]?.id || "")}
        onValueChange={(value) => patch({ dateField: value })}
      >
        <SelectTrigger className="h-8 border-gray-200 bg-white text-sm">
          <SelectValue placeholder="Date field" />
        </SelectTrigger>
        <SelectContent>
          {config.dateFieldOptions.map((option) => (
            <SelectItem key={option.id} value={option.id} className="text-sm">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <Input
          id="updates-filter-date-from"
          type="date"
          label="From"
          labelClassName="text-[10px] uppercase tracking-wider text-gray-400 sm:text-[10px]"
          value={String(draft.dateFrom || "")}
          max={String(draft.dateTo || "") || undefined}
          onChange={(e) => patch({ dateFrom: e.target.value })}
          className="h-8 rounded-md border-gray-200 px-2 text-sm shadow-none sm:text-sm"
        />
        <Input
          id="updates-filter-date-to"
          type="date"
          label="To"
          labelClassName="text-[10px] uppercase tracking-wider text-gray-400 sm:text-[10px]"
          value={String(draft.dateTo || "")}
          min={String(draft.dateFrom || "") || undefined}
          onChange={(e) => patch({ dateTo: e.target.value })}
          className="h-8 rounded-md border-gray-200 px-2 text-sm shadow-none sm:text-sm"
        />
      </div>
    </div>
  );

  const NOUNS: Record<DeskSection, [string, string]> = {
    announcements: ["announcement", "announcements"],
    news: ["news item", "news items"],
    conversations: ["conversation", "conversations"],
  };

  const recordCount = (className: string) => (
    <Text className={`text-sm font-[gothamMedium] text-[#003067] ${className}`}>
      {totalCount.toLocaleString()}{" "}
      {NOUNS[section as DeskSection][totalCount === 1 ? 0 : 1]}
    </Text>
  );

  return (
    <div className="flex w-full flex-col gap-1 py-3 md:flex-row md:flex-wrap md:items-center md:justify-end min-[1360px]:flex-nowrap min-[1360px]:justify-start">
      <div className="order-1 w-full min-w-0 min-[1360px]:w-auto">
        <div className="flex items-center gap-2">
          <Text className="text-2xl font-[gothamBlack] uppercase text-[#011b38] sm:text-3xl">
            {config.label}
          </Text>
          <RefreshButton
            onClick={onRefresh}
            refreshing={loading}
            className="ml-0.5 mt-0.5"
            label={`Refresh ${config.label}`}
          />
        </div>
        {recordCount("ml-1 my-1 md:hidden min-[1360px]:block")}
      </div>

      {recordCount(
        "relative -top-2 order-2 ml-1 hidden md:mr-auto md:block min-[1360px]:hidden",
      )}

      <div className="order-3 flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap min-[1360px]:ml-auto">
        {canCreate && (
          <Button
            onClick={onCreate}
            size="md"
            className={`order-1 w-full bg-blue-600 text-white hover:bg-blue-700 md:order-none md:w-auto ${COMPACT_CONTROL}`}
          >
            {config.createLabel}
          </Button>
        )}

        {extraAction && (
          <div className="order-1 w-full md:order-none md:w-auto">
            {extraAction}
          </div>
        )}

        <div className="order-2 min-w-0 flex-1 md:order-none md:w-[300px] md:flex-none">
          <Search
            value={search}
            onChange={onSearchChange}
            placeholder={config.searchPlaceholder}
            containerClassName="w-full md:w-full"
            className={COMPACT_CONTROL}
          />
        </div>

        <div className="order-3 flex items-center gap-2 md:order-none">
          <SortPopover
            triggerClassName={COMPACT_CONTROL}
            options={config.sortOptions}
            value={String(pendingSort.column)}
            direction={pendingSort.direction}
            onValueChange={(value) =>
              setPendingSort({
                ...pendingSort,
                column: value as DeskSortState<S>["column"],
              })
            }
            onDirectionChange={(direction) =>
              setPendingSort({ ...pendingSort, direction })
            }
            isOpen={isSortOpen}
            onOpenChange={openSort}
            onApply={applySort}
            onReset={resetSort}
            activeSortCount={activeSortCount}
            title={`Sort ${config.label}`}
          />

          <FilterPopover
            triggerClassName={COMPACT_CONTROL}
            sections={sections}
            isOpen={isFilterOpen}
            onOpenChange={openFilter}
            onReset={resetFilter}
            onApply={applyFilter}
            activeFilterCount={activeFilterCount}
            title={`Filter ${config.label}`}
            leftColumnIds={leftColumnIds}
            rightColumnIds={rightColumnIds}
            hasResidencySection={false}
            hasBarangaySection={false}
            extraContent={dateRange}
          />
        </div>
      </div>
    </div>
  );
}
