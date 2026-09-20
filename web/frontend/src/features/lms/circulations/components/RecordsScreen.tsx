import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import RecordsToolbar from "@/features/lms/circulations/components/RecordsToolbar";
import RecordsTable, {
  type RecordColumn,
} from "@/components/ui/RecordsTable";
import { SECTION_CONFIG } from "@/features/lms/circulations/api/circulation-sections";
import type { CirculationRecordsHook } from "@/features/lms/circulations/api/circulation-records-logic";
import type {
  CirculationSection,
  SectionRow,
} from "@/features/lms/circulations/types/circulation-records-types";

interface RecordsScreenProps<S extends CirculationSection> {
  list: CirculationRecordsHook<S>;
  columns: RecordColumn<SectionRow[S]>[];
  children?: ReactNode;
}

export default function RecordsScreen<S extends CirculationSection>({
  list,
  columns,
  children,
}: RecordsScreenProps<S>) {
  const config = SECTION_CONFIG[list.section];

  if (list.loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <RecordsToolbar
        section={list.section}
        totalCount={list.totalCount}
        loading={list.tableLoading}
        search={list.search}
        onSearchChange={list.setSearch}
        onRefresh={list.refresh}
        pendingSort={list.pendingSort}
        setPendingSort={list.setPendingSort}
        isSortOpen={list.isSortOpen}
        openSort={list.openSort}
        applySort={list.applySort}
        resetSort={list.resetSort}
        activeSortCount={list.activeSortCount}
        pendingFilters={list.pendingFilters}
        setPendingFilters={list.setPendingFilters}
        isFilterOpen={list.isFilterOpen}
        openFilter={list.openFilter}
        applyFilter={list.applyFilter}
        resetFilter={list.resetFilter}
        activeFilterCount={list.activeFilterCount}
      />

      <RecordsTable
        rows={list.paginated as (SectionRow[S] & { id: string })[]}
        columns={columns as RecordColumn<SectionRow[S] & { id: string }>[]}
        loading={list.tableLoading}
        errorMessage={list.errorMessage}
        emptyMessage={config.emptyMessage}
        onRetry={list.refresh}
        currentPage={list.currentPage}
        totalPages={list.totalPages}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={list.setItemsPerPage}
        onGoToPage={list.goToPage}
        onNextPage={list.nextPage}
        onPrevPage={list.prevPage}
      />

      {children}
    </div>
  );
}
