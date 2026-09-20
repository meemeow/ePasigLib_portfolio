import { RefreshButton } from "@/components/ui/RefreshButton";
import { Search } from "@/components/ui/Search";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
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
import {
  CHECKOUT_STATUS_OPTIONS,
  REQUESTED_DAYS_OPTIONS,
  RESERVATION_STATUS_OPTIONS,
  SECTION_CONFIG,
  VIOLATION_OPTIONS,
} from "@/features/lms/circulations/api/circulation-sections";
import type {
  CirculationSection,
  CirculationSortState,
  SectionFilters,
} from "@/features/lms/circulations/types/circulation-records-types";

interface RecordsToolbarProps<S extends CirculationSection> {
  section: S;
  totalCount: number;
  loading: boolean;

  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;

  pendingSort: CirculationSortState<S>;
  setPendingSort: (value: CirculationSortState<S>) => void;
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

export default function RecordsToolbar<S extends CirculationSection>({
  section,
  totalCount,
  loading,
  search,
  onSearchChange,
  onRefresh,
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
}: RecordsToolbarProps<S>) {
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
      options:
        section === "reservationHistory"
          ? RESERVATION_STATUS_OPTIONS
          : CHECKOUT_STATUS_OPTIONS,
      value: draft.status as string[],
      onChange: (value) => patch({ status: value as string[] }),
    });
    leftColumnIds.push("status");
  }

  if (Array.isArray(draft.requestedDays)) {
    sections.push({
      id: "requestedDays",
      title: "Requested Days",
      type: "checkbox",
      options: REQUESTED_DAYS_OPTIONS,
      value: (draft.requestedDays as number[]).map(String),
      onChange: (value) =>
        patch({ requestedDays: (value as string[]).map(Number) }),
    });
    leftColumnIds.push("requestedDays");
  }

  const toggles: { id: string; label: string; key: string }[] = [];
  if (typeof draft.overdueOnly === "boolean") {
    toggles.push({
      id: "overdueOnly",
      label: "Overdue only",
      key: "overdueOnly",
    });
  }
  if (typeof draft.hasMultipleBooks === "boolean") {
    toggles.push({
      id: "hasMultipleBooks",
      label: "More than one book",
      key: "hasMultipleBooks",
    });
  }
  if (toggles.length > 0) {
    sections.push({
      id: "toggles",
      title: "Only show",
      type: "checkbox",
      options: toggles.map((t) => ({ id: t.id, label: t.label })),
      value: toggles.filter((t) => draft[t.key] === true).map((t) => t.id),
      onChange: (value) => {
        const on = new Set(value as string[]);
        patch(Object.fromEntries(toggles.map((t) => [t.key, on.has(t.id)])));
      },
    });
    leftColumnIds.push("toggles");
  }

  if (typeof draft.violations === "string") {
    sections.push({
      id: "violations",
      title: "Violations",
      type: "radio",
      options: VIOLATION_OPTIONS,
      value: draft.violations as string,
      onChange: (value) => patch({ violations: value as string }),
    });
    rightColumnIds.push("violations");
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
        value={String(draft.dateField || config.defaultFilters.dateField)}
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
          id="records-filter-date-from"
          type="date"
          label="From"
          labelClassName="text-[10px] uppercase tracking-wider text-gray-400 sm:text-[10px]"
          value={String(draft.dateFrom || "")}
          max={String(draft.dateTo || "") || undefined}
          onChange={(e) => patch({ dateFrom: e.target.value })}
          className="h-8 rounded-md border-gray-200 px-2 text-sm shadow-none sm:text-sm"
        />
        <Input
          id="records-filter-date-to"
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

  const recordCount = (className: string) => (
    <Text className={`text-sm font-[gothamMedium] text-[#003067] ${className}`}>
      {totalCount.toLocaleString()} {totalCount === 1 ? "record" : "records"}
    </Text>
  );

  return (
    <div className="flex w-full flex-col gap-1 py-3 md:flex-row md:flex-wrap md:items-center md:justify-end min-[1360px]:flex-nowrap min-[1360px]:justify-start">
      <div className="order-1 w-full min-w-0 min-[1360px]:w-auto">
        <div className="flex items-center gap-2">
          <Text className="text-2xl font-[gothamBlack] text-[#011b38] uppercase sm:text-3xl">
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

      <div className="order-3 flex w-full items-center gap-2 md:w-auto min-[1360px]:ml-auto">
        <div className="flex-1 md:w-[330px] md:flex-none">
          <Search
            value={search}
            onChange={onSearchChange}
            placeholder={config.searchPlaceholder}
            className={`w-full ${COMPACT_CONTROL}`}
          />
        </div>

        <SortPopover
          triggerClassName={COMPACT_CONTROL}
          options={config.sortOptions}
          value={String(pendingSort.column)}
          direction={pendingSort.direction}
          onValueChange={(value) =>
            setPendingSort({
              ...pendingSort,
              column: value as CirculationSortState<S>["column"],
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
  );
}
