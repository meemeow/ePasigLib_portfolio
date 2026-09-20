import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Search } from "@/components/ui/Search";
import { FilterPopover, FilterSection } from "@/components/ui/FilterPopover";
import { SortPopover, SortOption } from "@/components/ui/SortPopover";
import { Text } from "@/components/ui/Text";
import type {
  StaffFilters,
  StaffSortState,
} from "@/features/lms/staffs/pages/index/types/staffs-types";
import { RefreshButton } from "@/components/ui/RefreshButton";

interface StaffsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
  onAdd: () => void;

  pendingSort: StaffSortState;
  setPendingSort: (value: StaffSortState) => void;
  isSortOpen: boolean;
  openSort: (open: boolean) => void;
  applySort: () => void;
  resetSort: () => void;

  pendingFilters: StaffFilters;
  setPendingFilters: (value: StaffFilters) => void;
  isFilterOpen: boolean;
  openFilter: (open: boolean) => void;
  applyFilter: () => void;
  resetFilter: () => void;

  activeFilterCount: number;
  activeSortCount: number;
}

const sortOptions: SortOption[] = [
  { id: "staffCode", label: "Staff Code" },
  { id: "lastName", label: "Last Name" },
  { id: "firstName", label: "First Name" },
  { id: "email", label: "Email" },
];

const availableRoles = [
  { id: "Cataloging", label: "Cataloging" },
  { id: "Circulation", label: "Circulation" },
  { id: "Patron Management", label: "Patron Management" },
  { id: "Announcement Creation", label: "Announcement Creation" },
  { id: "Generate Reports", label: "Generate Reports" },
  { id: "Chat with Patrons", label: "Chat with Patrons" },
];

const availablePositions = [
  { id: "Admin", label: "Admin" },
  { id: "Admin Aide", label: "Admin Aide" },
  { id: "Librarian", label: "Librarian" },
];

export default function StaffsToolbar({
  search,
  onSearchChange,
  onRefresh,
  loading,
  onAdd,
  pendingSort,
  setPendingSort,
  isSortOpen,
  openSort,
  applySort,
  resetSort,
  pendingFilters,
  setPendingFilters,
  isFilterOpen,
  openFilter,
  applyFilter,
  resetFilter,
  activeFilterCount,
  activeSortCount,
}: StaffsToolbarProps) {
  const filterSections: FilterSection[] = [
    {
      id: "positions",
      title: "Positions",
      type: "checkbox",
      options: availablePositions,
      value: pendingFilters.positions,
      onChange: (value) =>
        setPendingFilters({ ...pendingFilters, positions: value as string[] }),
    },
    {
      id: "roles",
      title: "Roles",
      type: "checkbox",
      options: availableRoles,
      value: pendingFilters.roles,
      onChange: (value) =>
        setPendingFilters({ ...pendingFilters, roles: value as string[] }),
    },
    {
      id: "status",
      title: "Status",
      type: "radio",
      options: [
        { id: "All", label: "All" },
        { id: "Active", label: "Active" },
        { id: "Archived", label: "Archived" },
      ],
      value: pendingFilters.status,
      onChange: (value) =>
        setPendingFilters({
          ...pendingFilters,
          status: value as StaffFilters["status"],
        }),
    },
  ];

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-end gap-3 w-full py-3 xl:flex-nowrap xl:justify-start">
      <div className="flex items-center justify-between md:justify-start gap-2 w-full xl:w-auto order-1">
        <div className="flex items-center gap-2">
          <Text className="text-2xl font-[gothamBlack] text-[#011b38] sm:text-3xl">
            LIBRARIANS
          </Text>
          <RefreshButton
            onClick={onRefresh}
            refreshing={loading}
            className="ml-0.5 mt-0.5"
            label="Refresh Librarians"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto order-2 xl:ml-auto">
        <Button
          onClick={onAdd}
          variant="default"
          className={`bg-blue-600 text-white hover:bg-blue-700 w-full sm:flex-1 md:flex-none md:w-auto ${COMPACT_CONTROL}`}
          size="md"
        >
          Register Librarian
        </Button>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto order-3">
        <div className="flex-1 md:flex-none md:w-[330px]">
          <Search
            value={search}
            onChange={onSearchChange}
            placeholder="Search librarians..."
            className={`w-full ${COMPACT_CONTROL}`}
          />
        </div>

        <SortPopover
          triggerClassName={COMPACT_CONTROL}
          options={sortOptions}
          value={pendingSort.column}
          direction={pendingSort.direction}
          onValueChange={(value) =>
            setPendingSort({ ...pendingSort, column: value as any })
          }
          onDirectionChange={(direction) =>
            setPendingSort({ ...pendingSort, direction })
          }
          isOpen={isSortOpen}
          onOpenChange={openSort}
          onApply={applySort}
          onReset={resetSort}
          activeSortCount={activeSortCount}
          title="Sort Librarians"
        />

        <FilterPopover
          triggerClassName={COMPACT_CONTROL}
          sections={filterSections}
          isOpen={isFilterOpen}
          onOpenChange={openFilter}
          onReset={resetFilter}
          onApply={applyFilter}
          activeFilterCount={activeFilterCount}
          title="Filter Librarians"
          leftColumnIds={["positions", "roles"]}
          rightColumnIds={["status"]}
          hasResidencySection={false}
          hasBarangaySection={false}
        />
      </div>
    </div>
  );
}
