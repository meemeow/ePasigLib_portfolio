import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/use-auth";

import PatronsToolbar from "@/features/lms/patrons/pages/index/components/PatronsHeaderToolbar";
import PatronsTable from "@/features/lms/patrons/pages/index/components/PatronsTable";
import { usePatronsPage } from "@/features/lms/patrons/pages/index/api/patrons-logic";

export default function Patrons() {
  const navigate = useNavigate();
  const { staffRoles } = useAuth();

  const {
    loading,
    patronLoading,
    paginated,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    pendingFilters,
    setPendingFilters,
    isPopoverOpen,
    handleOpenPopover,
    handleResetFilters,
    handleSetFilter,
    pendingSort,
    setPendingSort,
    isSortPopoverOpen,
    openSort,
    applySort,
    search,
    setSearch,
    pasigBarangays,
    unverifiedCount,
    refreshUnverifiedCount,
    capitalize,
    formatTimestamp,
    activeFilterCount,
    activeSortCount,
  } = usePatronsPage();

  return (
    <div className="overflow-auto px-6 pb-6 pt-2 sm:px-8 sm:pb-10 md:py-6 lg:p-10 font-[gothamLight]">
      <PatronsToolbar
        search={search}
        onSearchChange={setSearch}
        onRefresh={refresh}
        loading={loading || patronLoading}
        onRegister={() => navigate("/lms/patrons/register")}
        onVerify={() => navigate("/lms/patrons/verifyIDs")}
        unverifiedCount={unverifiedCount}
        canRegister={!!staffRoles?.PatronAdd}
        canVerify={!!staffRoles?.VerifyIDs}
        pendingSort={pendingSort}
        setPendingSort={setPendingSort}
        isSortPopoverOpen={isSortPopoverOpen}
        openSort={openSort}
        applySort={applySort}
        pendingFilters={pendingFilters}
        setPendingFilters={setPendingFilters}
        isPopoverOpen={isPopoverOpen}
        handleOpenPopover={handleOpenPopover}
        handleResetFilters={handleResetFilters}
        handleSetFilter={handleSetFilter}
        pasigBarangays={pasigBarangays}
        activeFilterCount={activeFilterCount}
        activeSortCount={activeSortCount}
        refreshUnverifiedCount={refreshUnverifiedCount}
      />

      <PatronsTable
        patrons={paginated}
        loading={loading || patronLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        onGoToPage={goToPage}
        onNextPage={nextPage}
        onPrevPage={prevPage}
        onView={(id) => navigate(`/lms/patrons/view/${id}`)}
        capitalize={capitalize}
        formatTimestamp={formatTimestamp}
      />
    </div>
  );
}
