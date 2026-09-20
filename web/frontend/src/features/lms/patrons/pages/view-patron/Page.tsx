import { useState } from "react";
import Modal from "@/components/ui/ValidationModal";
import PatronArchiveModal from "@/features/lms/patrons/components/PatronArchiveModal";
import { usePatronsView } from "./api/patrons-view-logic";
import ViewSidebar from "@/features/lms/patrons/pages/view-patron/components/ViewSidebar";
import ViewContainer from "@/features/lms/patrons/pages/view-patron/components/ViewContainer";
import RecordSkeleton from "@/components/ui/RecordSkeleton";
import type { PatronRecord } from "@/features/lms/patrons/pages/view-patron/types/patrons-view-types";

export default function PatronsView() {
  const {
    patron,
    editable,
    initialData,
    formData,
    errors,
    activeTab,
    modificationLogs,
    loadingModificationLogs,
    modificationLogsCurrentPage,
    modificationLogsTotalPages,
    modificationLogsItemsPerPage,
    checkoutHistory,
    loadingCheckoutHistory,
    checkoutHistoryCurrentPage,
    checkoutHistoryTotalPages,
    checkoutHistoryItemsPerPage,
    checkinHistory,
    loadingCheckinHistory,
    checkinHistoryCurrentPage,
    checkinHistoryTotalPages,
    checkinHistoryItemsPerPage,
    error,
    success,
    emailVerified,
    isProcessing,
    cities,
    barangays,
    hasChanges,
    emailEditMode,
    verifyingEmail,
    emailChangedValid,
    canEditPatron,
    canArchivePatron,
    idPreviewUrl,
    setEditable,
    setActiveTab,
    setFormData,
    handleChange,
    handleSave,
    handleArchive,
    handleUnarchive,
    handleCityChange,
    handleVerifyEmail,
    handleCloseModal,
    startEmailEdit,
    cancelEmailEdit,
    refreshModificationLogs,
    goToModificationLogsPage,
    nextModificationLogsPage,
    prevModificationLogsPage,
    handleModificationLogsItemsPerPageChange,
    refreshCheckoutHistory,
    goToCheckoutHistoryPage,
    nextCheckoutHistoryPage,
    prevCheckoutHistoryPage,
    handleCheckoutHistoryItemsPerPageChange,
    refreshCheckinHistory,
    goToCheckinHistoryPage,
    nextCheckinHistoryPage,
    prevCheckinHistoryPage,
    handleCheckinHistoryItemsPerPageChange,
    goBack,
  } = usePatronsView();

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveConfirmChecked, setArchiveConfirmChecked] = useState(false);
  const [archiveAction, setArchiveAction] = useState<"archive" | "unarchive">("archive");
  const [archiveProcessing, setArchiveProcessing] = useState(false);

  const isArchived = (patron as PatronRecord | null)?.Status === "Archived";

  if (!patron) {
    return (
      <div className="overflow-auto px-6 sm:px-8 py-2 pb-6 sm:pb-8 sm:pb-10 xl:p-10 font-[gothamLight]">
        <div className="mx-auto flex w-full flex-col gap-0 xl:gap-8 xl:flex-row">
          <ViewSidebar
            patronName=""
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onReturn={goBack}
          />
          <RecordSkeleton fields={10} />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto px-6 sm:px-8 py-2 pb-6 sm:pb-8 sm:pb-10 xl:p-10 font-[gothamLight]">
      <div className="mx-auto flex w-full flex-col gap-0 xl:gap-8 xl:flex-row">
        <ViewSidebar
          patronName={`${patron.FirstName} ${patron.LastName}`}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onReturn={goBack}
        />

        <ViewContainer
          activeTab={activeTab}
          onTabChange={setActiveTab}
          formData={formData}
          setFormData={setFormData}
          editable={editable}
          setEditable={setEditable}
          errors={errors}
          isArchived={isArchived}
          emailEditMode={emailEditMode}
          verifyingEmail={verifyingEmail}
          emailVerified={emailVerified}
          emailChangedValid={emailChangedValid}
          hasChanges={hasChanges}
          isProcessing={isProcessing}
          cities={cities}
          barangays={barangays}
          canEditPatron={canEditPatron}
          canArchivePatron={canArchivePatron}
          initialData={initialData}
          idPreviewUrl={idPreviewUrl}
          modificationLogs={modificationLogs}
          loadingModificationLogs={loadingModificationLogs}
          modificationLogsCurrentPage={modificationLogsCurrentPage}
          modificationLogsTotalPages={modificationLogsTotalPages}
          modificationLogsItemsPerPage={modificationLogsItemsPerPage}
          goToModificationLogsPage={goToModificationLogsPage}
          nextModificationLogsPage={nextModificationLogsPage}
          prevModificationLogsPage={prevModificationLogsPage}
          handleModificationLogsItemsPerPageChange={handleModificationLogsItemsPerPageChange}
          checkoutHistory={checkoutHistory}
          loadingCheckoutHistory={loadingCheckoutHistory}
          checkoutHistoryCurrentPage={checkoutHistoryCurrentPage}
          checkoutHistoryTotalPages={checkoutHistoryTotalPages}
          checkoutHistoryItemsPerPage={checkoutHistoryItemsPerPage}
          goToCheckoutHistoryPage={goToCheckoutHistoryPage}
          nextCheckoutHistoryPage={nextCheckoutHistoryPage}
          prevCheckoutHistoryPage={prevCheckoutHistoryPage}
          handleCheckoutHistoryItemsPerPageChange={handleCheckoutHistoryItemsPerPageChange}
          checkinHistory={checkinHistory}
          loadingCheckinHistory={loadingCheckinHistory}
          checkinHistoryCurrentPage={checkinHistoryCurrentPage}
          checkinHistoryTotalPages={checkinHistoryTotalPages}
          checkinHistoryItemsPerPage={checkinHistoryItemsPerPage}
          goToCheckinHistoryPage={goToCheckinHistoryPage}
          nextCheckinHistoryPage={nextCheckinHistoryPage}
          prevCheckinHistoryPage={prevCheckinHistoryPage}
          handleCheckinHistoryItemsPerPageChange={handleCheckinHistoryItemsPerPageChange}
          refreshModificationLogs={refreshModificationLogs}
          refreshCheckoutHistory={refreshCheckoutHistory}
          refreshCheckinHistory={refreshCheckinHistory}
          handleChange={handleChange}
          handleCityChange={handleCityChange}
          handleSave={handleSave}
          handleVerifyEmail={handleVerifyEmail}
          startEmailEdit={startEmailEdit}
          cancelEmailEdit={cancelEmailEdit}
          handleArchive={handleArchive}
          handleUnarchive={handleUnarchive}
          setShowArchiveModal={setShowArchiveModal}
          setArchiveAction={setArchiveAction}
          goBack={goBack}
        />
      </div>

      <PatronArchiveModal
        open={showArchiveModal}
        patronName={`${patron.FirstName} ${patron.LastName}`}
        archiveAction={archiveAction}
        archiveConfirmChecked={archiveConfirmChecked}
        setArchiveConfirmChecked={setArchiveConfirmChecked}
        onCancel={() => {
          setShowArchiveModal(false);
          setArchiveConfirmChecked(false);
        }}
        onConfirm={async () => {
          setArchiveProcessing(true);
          const result =
            archiveAction === "archive"
              ? await handleArchive()
              : await handleUnarchive();
          if (!result.ok) console.error(result.message);
          setArchiveProcessing(false);
          setShowArchiveModal(false);
          setArchiveConfirmChecked(false);
        }}
        isProcessing={archiveProcessing}
      />

      {error && <Modal message={error} onClose={handleCloseModal} type="error" />}
      {success && <Modal message={success} onClose={handleCloseModal} type="success" />}
    </div>
  );
}
