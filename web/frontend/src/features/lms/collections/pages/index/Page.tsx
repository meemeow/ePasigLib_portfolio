import { useMemo } from "react";
import Modal from "@/components/ui/ValidationModal";
import ArchiveModal from "@/features/lms/collections/components/BookArchiveModal";
import BarcodeModal from "@/features/lms/collections/components/BarcodeModal";
import ClassCodeMaterialTypes from "@/features/lms/collections/components/ClassCodeMaterialTypesModal";
import CollectionsToolbar from "@/features/lms/collections/pages/index/components/CollectionsHeaderToolbar";
import CollectionsTable from "@/features/lms/collections/pages/index/components/CollectionsTable";
import { useCollectionsPage } from "@/features/lms/collections/pages/index/api/collections-logic";

export default function Collections() {
  const {
    canAdd,
    canEdit,
    canArchive,
    canConfigureClassCodeMaterialTypes,
    loading,
    tableLoading,
    paginated,
    totalPages,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    search,
    setSearch,
    pendingFilters,
    setPendingFilters,
    isPopoverOpen,
    handleOpenPopover,
    handleResetFilters,
    handleSetFilter,
    activeFilterCount,
    pendingSort,
    setPendingSort,
    isSortPopoverOpen,
    openSort,
    applySort,
    resetSort,
    activeSortCount,
    pendingDateFilters,
    setPendingDateFilters,
    classCodes,
    materialTypes,
    setClassCodes,
    setMaterialTypes,
    showClassCodeMaterialTypesModal,
    setShowClassCodeMaterialTypesModal,
    handleOpenClassCodeMaterialTypesModal,
    selectedCollections,
    selectedCollectionIds,
    handleCheckboxChange,
    handleSelectAll,
    showBarcodeModal,
    setShowBarcodeModal,
    handlePrintBarcodes,
    showArchiveModal,
    setShowArchiveModal,
    archiveConfirmChecked,
    setArchiveConfirmChecked,
    archiveAction,
    collectionToArchive,
    handleArchiveToggleClick,
    confirmArchiveToggle,
    archiveProcessing,
    modalMessage,
    setModalMessage,
    formatTimestamp,
    handleNavigateToView,
    handleNavigateToEdit,
    handleNavigateToAdd,
  } = useCollectionsPage();

  const barcodeCollections = useMemo(
    () => Array.from(selectedCollections.values()),
    [selectedCollections],
  );

  return (
    <div className="overflow-auto px-6 pb-6 pt-2 sm:px-8 sm:pb-10 md:py-6 lg:p-10 font-[gothamLight]">
      <CollectionsToolbar
        search={search}
        onSearchChange={setSearch}
        onRefresh={refresh}
        onAdd={handleNavigateToAdd}
        onConfigure={handleOpenClassCodeMaterialTypesModal}
        onPrintBarcodes={handlePrintBarcodes}
        canAdd={canAdd}
        canConfigure={canConfigureClassCodeMaterialTypes}
        classCodes={classCodes}
        materialTypes={materialTypes}
        pendingSort={pendingSort}
        setPendingSort={setPendingSort}
        isSortPopoverOpen={isSortPopoverOpen}
        openSort={openSort}
        applySort={applySort}
        resetSort={resetSort}
        activeSortCount={activeSortCount}
        pendingFilters={pendingFilters}
        setPendingFilters={setPendingFilters}
        isFilterPopoverOpen={isPopoverOpen}
        openFilter={handleOpenPopover}
        resetFilters={handleResetFilters}
        applyFilters={handleSetFilter}
        activeFilterCount={activeFilterCount}
        pendingDateFilters={pendingDateFilters}
        setPendingDateFilters={setPendingDateFilters}
      />

      <CollectionsTable
        collections={paginated}
        loading={loading || tableLoading}
        selectedIds={selectedCollectionIds}
        onToggleAll={handleSelectAll}
        onToggleOne={handleCheckboxChange}
        canEdit={canEdit}
        canArchive={canArchive}
        onView={handleNavigateToView}
        onEdit={handleNavigateToEdit}
        onArchiveToggle={handleArchiveToggleClick}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        onGoToPage={goToPage}
        onNextPage={nextPage}
        onPrevPage={prevPage}
        formatDate={formatTimestamp}
      />

      <ArchiveModal
        open={showArchiveModal && !!collectionToArchive}
        collectionTitle={collectionToArchive?.CollectionTitle || ""}
        archiveAction={archiveAction}
        archiveConfirmChecked={archiveConfirmChecked}
        setArchiveConfirmChecked={setArchiveConfirmChecked}
        onCancel={() => setShowArchiveModal(false)}
        onConfirm={confirmArchiveToggle}
        isProcessing={archiveProcessing}
      />

      <BarcodeModal
        open={showBarcodeModal}
        collections={barcodeCollections}
        onClose={() => setShowBarcodeModal(false)}
      />

      {showClassCodeMaterialTypesModal && (
        <ClassCodeMaterialTypes
          open={showClassCodeMaterialTypesModal}
          classCodes={classCodes}
          materialTypes={materialTypes}
          onClose={() => setShowClassCodeMaterialTypesModal(false)}
          onUpdated={({
            classCodes: nextClassCodes,
            materialTypes: nextMaterialTypes,
          }: {
            classCodes: string[];
            materialTypes: string[];
          }) => {
            setClassCodes(nextClassCodes);
            setMaterialTypes(nextMaterialTypes);
          }}
        />
      )}

      {modalMessage && (
        <Modal
          message={modalMessage}
          type={modalMessage.startsWith("Failed") ? "error" : "success"}
          onClose={() => setModalMessage(null)}
        />
      )}
    </div>
  );
}
