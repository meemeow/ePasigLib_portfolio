import { MONTH_NAMES } from "@/lib/format/date";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Input } from "@/components/ui/Input";
import { Search } from "@/components/ui/Search";
import { Text } from "@/components/ui/Text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { FilterPopover, type FilterSection } from "@/components/ui/FilterPopover";
import { SortPopover, type SortOption } from "@/components/ui/SortPopover";
import type {
  CollectionDateFilters,
  CollectionFiltersState,
  CollectionSortColumn,
  CollectionSortState,
  CollectionStatusFilter,
  LibraryLocationMode,
} from "@/features/lms/collections/pages/index/types/collections-types";

interface CollectionsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onConfigure: () => void;
  onPrintBarcodes: () => void;
  canAdd: boolean;
  canConfigure: boolean;

  classCodes: string[];
  materialTypes: string[];

  pendingSort: CollectionSortState;
  setPendingSort: (value: CollectionSortState) => void;
  isSortPopoverOpen: boolean;
  openSort: (open: boolean) => void;
  applySort: () => void;
  activeSortCount: number;

  pendingFilters: CollectionFiltersState;
  setPendingFilters: (value: CollectionFiltersState) => void;
  isFilterPopoverOpen: boolean;
  openFilter: (open: boolean) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  activeFilterCount: number;

  pendingDateFilters: CollectionDateFilters;
  setPendingDateFilters: (value: CollectionDateFilters) => void;
  resetSort: () => void;
}

const COMPACT_AT_XL = "hidden sm:inline xl:hidden 2xl:inline";

const sortOptions: SortOption[] = [
  { id: "CreatedOn", label: "Created On" },
  { id: "ModifiedOn", label: "Date Modified" },
  { id: "CollectionTitle", label: "Title" },
  { id: "MainAuthor", label: "Author" },
];

const searchSortOptions: SortOption[] = [
  { id: "Relevance", label: "Best match" },
  ...sortOptions,
];

const MONTHS = MONTH_NAMES.map((label, index) => ({ id: String(index + 1), label }));

export default function CollectionsToolbar({
  search,
  onSearchChange,
  onRefresh,
  onAdd,
  onConfigure,
  onPrintBarcodes,
  canAdd,
  canConfigure,
  classCodes,
  materialTypes,
  pendingSort,
  setPendingSort,
  isSortPopoverOpen,
  openSort,
  applySort,
  activeSortCount,
  pendingFilters,
  setPendingFilters,
  isFilterPopoverOpen,
  openFilter,
  resetFilters,
  applyFilters,
  activeFilterCount,
  pendingDateFilters,
  setPendingDateFilters,
  resetSort,
}: CollectionsToolbarProps) {
  const filterSections: FilterSection[] = [
    {
      id: "classCodes",
      title: "Class Code",
      type: "checkbox",
      options: classCodes.map((code) => ({ id: code, label: code })),
      value: pendingFilters.classCodes,
      onChange: (value) =>
        setPendingFilters({ ...pendingFilters, classCodes: value as string[] }),
    },
    {
      id: "materialTypes",
      title: "Material Type",
      type: "checkbox",
      options: materialTypes.map((type) => ({ id: type, label: type })),
      value: pendingFilters.materialTypes,
      onChange: (value) =>
        setPendingFilters({
          ...pendingFilters,
          materialTypes: value as string[],
        }),
    },
    {
      id: "libraryLocationMode",
      title: "Library Location",
      type: "radio",
      options: [
        { id: "All", label: "All" },
        { id: "PKC", label: "PKC" },
        { id: "Other", label: "Other Library" },
      ],
      value: pendingFilters.libraryLocationMode,
      onChange: (value) =>
        setPendingFilters({
          ...pendingFilters,
          libraryLocationMode: value as LibraryLocationMode,
        }),
    },
    {
      id: "Status",
      title: "Status",
      type: "radio",
      options: [
        { id: "All", label: "All" },
        { id: "Available", label: "Available" },
        { id: "Archived", label: "Archived" },
      ],
      value: pendingFilters.Status,
      onChange: (value) =>
        setPendingFilters({
          ...pendingFilters,
          Status: value as CollectionStatusFilter,
        }),
    },
  ];

  const setDateField = (
    field: keyof CollectionDateFilters,
    value: string,
  ): void => setPendingDateFilters({ ...pendingDateFilters, [field]: value });

  const dateContent = (
    <div className="space-y-3">
      <div className="text-[10px] font-[gothamMedium] tracking-wider text-gray-500 uppercase">
        Date Ranges
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="text-[10px] font-[gothamMedium] tracking-wider text-gray-400 uppercase">
            Publication Year
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="From"
              value={pendingDateFilters.pubYearStart}
              onChange={(e) => setDateField("pubYearStart", e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="To"
              value={pendingDateFilters.pubYearEnd}
              onChange={(e) => setDateField("pubYearEnd", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-[gothamMedium] tracking-wider text-gray-400 uppercase">
            Copyright Year
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="From"
              value={pendingDateFilters.copyrightStart}
              onChange={(e) => setDateField("copyrightStart", e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="To"
              value={pendingDateFilters.copyrightEnd}
              onChange={(e) => setDateField("copyrightEnd", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[10px] font-[gothamMedium] tracking-wider text-gray-400 uppercase">
          Date Created
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={pendingDateFilters.createdStartMonth}
            onValueChange={(value) => setDateField("createdStartMonth", value)}
          >
            <SelectTrigger className="h-8 w-full border-gray-200 bg-white text-sm">
              <SelectValue placeholder="From month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.id} value={month.id} className="text-sm">
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="From year"
            value={pendingDateFilters.createdStartYear}
            onChange={(e) => setDateField("createdStartYear", e.target.value)}
            className="h-8 text-sm"
          />
          <Select
            value={pendingDateFilters.createdEndMonth}
            onValueChange={(value) => setDateField("createdEndMonth", value)}
          >
            <SelectTrigger className="h-8 w-full border-gray-200 bg-white text-sm">
              <SelectValue placeholder="To month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.id} value={month.id} className="text-sm">
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="To year"
            value={pendingDateFilters.createdEndYear}
            onChange={(e) => setDateField("createdEndYear", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-3 py-3 md:flex-row md:flex-wrap md:items-center md:justify-end xl:flex-nowrap xl:justify-start">
      <div className="order-1 flex w-full items-center justify-between gap-2 md:justify-start xl:w-auto">
        <div className="flex items-center gap-2">
          <Text className="text-2xl font-[gothamBlack] text-[#011b38] sm:text-3xl">
            COLLECTIONS
          </Text>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="icon"
            className="ml-0.5 mt-0.5 h-7 w-7"
            aria-label="Refresh"
          >
            <RefreshCcw className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="order-2 flex w-full flex-col gap-2 sm:flex-row md:w-auto xl:ml-auto">
        {canAdd && (
          <Button
            onClick={onAdd}
            variant="default"
            size="md"
            className={`w-full bg-blue-600 text-white hover:bg-blue-700 sm:flex-1 md:w-auto md:flex-none ${COMPACT_CONTROL}`}
          >
            Add Collection
          </Button>
        )}
        <Button
          onClick={onPrintBarcodes}
          variant="outline"
          size="md"
          className={`w-full sm:flex-1 md:w-auto md:flex-none ${COMPACT_CONTROL}`}
        >
          Print Barcodes
        </Button>
        {canConfigure && (
          <Button
            onClick={onConfigure}
            variant="outline"
            size="md"
            className={`w-full sm:flex-1 md:w-auto md:flex-none ${COMPACT_CONTROL}`}
          >
            Configure CC &amp; MT
          </Button>
        )}
      </div>

      <div className="order-3 flex w-full items-center gap-2 md:w-auto">
        <div className="relative flex-1 md:w-[330px] md:flex-none">
          <Search
            value={search}
            onChange={onSearchChange}
            placeholder="Search collections..."
            className={`w-full ${COMPACT_CONTROL}`}
          />
        </div>

        <SortPopover
          options={search.trim() ? searchSortOptions : sortOptions}
          value={pendingSort.column}
          direction={pendingSort.direction}
          onValueChange={(value) =>
            setPendingSort({
              ...pendingSort,
              column: value as CollectionSortColumn,
            })
          }
          onDirectionChange={(direction) =>
            setPendingSort({ ...pendingSort, direction })
          }
          labelClassName={COMPACT_AT_XL}
          triggerClassName={COMPACT_CONTROL}
          isOpen={isSortPopoverOpen}
          onOpenChange={openSort}
          onApply={applySort}
          onReset={resetSort}
          activeSortCount={activeSortCount}
          title="Sort Collections"
        />

        <FilterPopover
          sections={filterSections}
          labelClassName={COMPACT_AT_XL}
          triggerClassName={COMPACT_CONTROL}
          isOpen={isFilterPopoverOpen}
          onOpenChange={openFilter}
          onReset={resetFilters}
          onApply={applyFilters}
          activeFilterCount={activeFilterCount}
          title="Filter Collections"
          leftColumnIds={["classCodes", "libraryLocationMode"]}
          rightColumnIds={["materialTypes", "Status"]}
          hasResidencySection={false}
          hasBarangaySection={false}
          extraContent={dateContent}
          contentClassName="sm:w-[520px]"
        />
      </div>
    </div>
  );
}
