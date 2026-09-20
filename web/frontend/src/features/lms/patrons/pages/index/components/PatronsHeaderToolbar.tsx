import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Search } from "@/components/ui/Search";
import { FilterPopover, FilterSection } from "@/components/ui/FilterPopover";
import { SortPopover, SortOption } from "@/components/ui/SortPopover";
import type {
  Filters,
  SortState,
} from "@/features/lms/patrons/pages/index/types/patrons-types";
import { Text } from "@/components/ui/Text";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

interface PatronsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
  onRegister: () => void;
  onVerify: () => void;
  unverifiedCount: number;
  canRegister: boolean;
  canVerify: boolean;

  pendingSort: SortState;
  setPendingSort: (value: SortState) => void;
  isSortPopoverOpen: boolean;
  openSort: (open: boolean) => void;
  applySort: () => void;

  pendingFilters: Filters;
  setPendingFilters: (value: Filters) => void;
  isPopoverOpen: boolean;
  handleOpenPopover: (open: boolean) => void;
  handleResetFilters: () => void;
  handleSetFilter: () => void;
  pasigBarangays: string[];

  activeFilterCount: number;
  activeSortCount: number;

  refreshUnverifiedCount?: () => void;
}

const sortOptions: SortOption[] = [
  { id: "CreatedOn", label: "Created On" },
  { id: "LastName", label: "Last Name" },
  { id: "FirstName", label: "First Name" },
  { id: "PatronUID", label: "Patron UID" },
  { id: "LastBorrowedDate", label: "Last Borrowed Date" },
];

export default function PatronsToolbar({
  search,
  onSearchChange,
  onRefresh,
  loading,
  onRegister,
  onVerify,
  unverifiedCount,
  canRegister,
  canVerify,
  pendingSort,
  setPendingSort,
  isSortPopoverOpen,
  openSort,
  applySort,
  pendingFilters,
  setPendingFilters,
  isPopoverOpen,
  handleOpenPopover,
  handleResetFilters,
  handleSetFilter,
  pasigBarangays,
  activeFilterCount,
  activeSortCount,
  refreshUnverifiedCount,
}: PatronsToolbarProps) {
  const location = useLocation();

  useEffect(() => {
    if (refreshUnverifiedCount) {
      refreshUnverifiedCount();
    }
  }, [location.pathname, refreshUnverifiedCount]);

  const filterSections: FilterSection[] = [
    {
      id: "state",
      title: "State",
      type: "checkbox",
      options: [
        { id: "Unverified", label: "Unverified" },
        { id: "Verified", label: "Verified" },
        { id: "Rejected", label: "Rejected" },
        { id: "Watchlisted", label: "Watchlisted" },
        { id: "Warning", label: "Warning" },
        { id: "Suspended", label: "Suspended" },
      ],
      value: pendingFilters.state,
      onChange: (value) =>
        setPendingFilters({ ...pendingFilters, state: value as string[] }),
    },
    {
      id: "residency",
      title: "Residency",
      type: "radio",
      options: [
        { id: "All", label: "All" },
        { id: "Non-Pasig Resident", label: "Non-Pasig Resident" },
        { id: "Pasig Resident", label: "Pasig Resident" },
      ],
      value: pendingFilters.residency,
      onChange: (value) =>
        setPendingFilters({
          ...pendingFilters,
          residency: value as Filters["residency"],
          barangay: value === "Pasig Resident" ? pendingFilters.barangay : "",
        }),
    },
    {
      id: "barangay",
      title: "Barangay",
      type: "select",
      options: pasigBarangays.map((b) => ({ id: b, label: b })),
      value: pendingFilters.barangay,
      onChange: (value) =>
        setPendingFilters({ ...pendingFilters, barangay: value as string }),
      placeholder: "Select Barangay",
      disabled: pendingFilters.residency !== "Pasig Resident",
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
          status: value as Filters["status"],
        }),
    },
    {
      id: "ageRange",
      title: "Age Range",
      type: "radio",
      options: [
        { id: "All", label: "All" },
        { id: "Under 18", label: "Under 18" },
        { id: "18-25", label: "18-25" },
        { id: "26-40", label: "26-40" },
        { id: "41-60", label: "41-60" },
        { id: "60+", label: "60+" },
      ],
      value: pendingFilters.ageRange,
      onChange: (value) =>
        setPendingFilters({
          ...pendingFilters,
          ageRange: value as Filters["ageRange"],
        }),
    },
  ];

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-end gap-3 w-full py-3 xl:flex-nowrap xl:justify-start">
      <div className="flex items-center justify-between md:justify-start gap-2 w-full xl:w-auto order-1">
        <div className="flex items-center gap-2">
          <Text className="text-2xl font-[gothamBlack] text-[#011b38] sm:text-3xl">
            PATRONS
          </Text>
          <RefreshButton
            onClick={onRefresh}
            refreshing={loading}
            className="ml-0.5 mt-0.5"
            label="Refresh Patrons"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto order-2 xl:ml-auto">
        {canRegister && (
          <Button
            onClick={onRegister}
            variant="default"
            className={`bg-blue-600 text-white hover:bg-blue-700 w-full sm:flex-1 md:flex-none md:w-auto ${COMPACT_CONTROL}`}
            size="md"
          >
            Register Patron
          </Button>
        )}

        {canVerify && (
          <Button
            onClick={onVerify}
            variant="outline"
            className={`w-full sm:flex-1 md:flex-none md:w-auto relative ${COMPACT_CONTROL}`}
            size="md"
          >
            Verify Patron Accounts
            {unverifiedCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                {unverifiedCount > 9 ? "9+" : unverifiedCount}
              </span>
            )}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto order-3">
        <div className="flex-1 md:flex-none md:w-[330px]">
          <Search
            value={search}
            onChange={onSearchChange}
            placeholder="Search patrons..."
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
          isOpen={isSortPopoverOpen}
          onOpenChange={openSort}
          onApply={applySort}
          onReset={() =>
            setPendingSort({ column: "CreatedOn", direction: "asc" })
          }
          activeSortCount={activeSortCount}
          title="Sort Patrons"
        />

        <FilterPopover
          triggerClassName={COMPACT_CONTROL}
          sections={filterSections}
          isOpen={isPopoverOpen}
          onOpenChange={handleOpenPopover}
          onReset={handleResetFilters}
          onApply={handleSetFilter}
          activeFilterCount={activeFilterCount}
          title="Filter Patrons"
          leftColumnIds={["state", "residency"]}
          rightColumnIds={["ageRange", "status"]}
          hasResidencySection={true}
          hasBarangaySection={true}
          barangaySectionId="barangay"
          residencySectionId="residency"
        />
      </div>
    </div>
  );
}
