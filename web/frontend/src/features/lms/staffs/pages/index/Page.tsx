import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "@/components/ui/ValidationModal";
import { useStaffsPage } from "@/features/lms/staffs/pages/index/api/staffs-logic";

import StaffsToolbar from "@/features/lms/staffs/pages/index/components/StaffsHeaderToolbar";
import StaffsTable from "@/features/lms/staffs/pages/index/components/StaffsTable";

export default function Staffs() {
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    loading,
    staffLoading,
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
    isFilterOpen,
    openFilter,
    applyFilter,
    resetFilter,
    pendingSort,
    setPendingSort,
    isSortOpen,
    openSort,
    applySort,
    resetSort,
    search,
    setSearch,
    capitalize,
    activeFilterCount,
    activeSortCount,
  } = useStaffsPage();

  useEffect(() => {
    const state = location.state as { successMessage?: string } | null;
    if (state?.successMessage) {
      setSuccessMessage(state.successMessage);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="overflow-auto px-6 pb-6 pt-2 sm:px-8 sm:pb-10 md:py-6 lg:p-10 font-[gothamLight]">
      <StaffsToolbar
        search={search}
        onSearchChange={setSearch}
        onRefresh={refresh}
        loading={loading || staffLoading}
        onAdd={() => navigate("/lms/staffs/register")}
        pendingSort={pendingSort}
        setPendingSort={setPendingSort}
        isSortOpen={isSortOpen}
        openSort={openSort}
        applySort={applySort}
        resetSort={resetSort}
        pendingFilters={pendingFilters}
        setPendingFilters={setPendingFilters}
        isFilterOpen={isFilterOpen}
        openFilter={openFilter}
        applyFilter={applyFilter}
        resetFilter={resetFilter}
        activeFilterCount={activeFilterCount}
        activeSortCount={activeSortCount}
      />

      <StaffsTable
        staffs={paginated}
        loading={loading || staffLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        onGoToPage={goToPage}
        onNextPage={nextPage}
        onPrevPage={prevPage}
        onView={(id) => navigate(`/lms/staffs/view/${id}`)}
        capitalize={capitalize}
      />

      {successMessage && (
        <Modal
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
          type="success"
        />
      )}
    </div>
  );
}
