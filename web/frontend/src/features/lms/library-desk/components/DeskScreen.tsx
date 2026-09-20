import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import RecordsTable, {
  type RecordColumn,
} from "@/components/ui/RecordsTable";
import DeskToolbar from "@/features/lms/library-desk/components/DeskToolbar";
import { SECTION_CONFIG } from "@/features/lms/library-desk/api/desk-sections";
import type { DeskRecordsHook } from "@/features/lms/library-desk/api/desk-list-logic";
import type {
  DeskSection,
} from "@/features/lms/library-desk/types/desk-types";
import type {
  SectionRow,
} from "@/features/lms/library-desk/types/desk-types";

interface DeskScreenProps<S extends DeskSection> {
  list: DeskRecordsHook<S>;
  columns: RecordColumn<SectionRow[S]>[];
  onCreate: () => void;
  canCreate: boolean;
  extraAction?: ReactNode;
  availableTags?: string[];
  children?: ReactNode;
}

export default function DeskScreen<S extends DeskSection>({
  list,
  columns,
  onCreate,
  canCreate,
  extraAction,
  availableTags,
  children,
}: DeskScreenProps<S>) {
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
      <DeskToolbar
        section={list.section}
        totalCount={list.totalCount}
        loading={list.tableLoading}
        search={list.search}
        onSearchChange={list.setSearch}
        onRefresh={list.refresh}
        onCreate={onCreate}
        canCreate={canCreate}
        extraAction={extraAction}
        availableTags={availableTags}
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
        rows={list.paginated}
        columns={columns}
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
