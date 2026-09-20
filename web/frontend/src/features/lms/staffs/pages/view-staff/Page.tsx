import { useState } from "react";
import Modal from "@/components/ui/ValidationModal";
import StaffArchiveModal from "@/features/lms/staffs/components/StaffArchiveModal";
import { useStaffsView } from "./api/staffs-view-logic";
import ViewSidebar from "@/features/lms/staffs/pages/view-staff/components/ViewSidebar";
import ViewContainer from "@/features/lms/staffs/pages/view-staff/components/ViewContainer";
import RecordSkeleton from "@/components/ui/RecordSkeleton";
import type { StaffRoleKeys } from "@/features/lms/staffs/pages/view-staff/types/staffs-view-types";

export default function StaffsView() {
  const {
    staff,
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
    canEditStaff,
    canArchiveStaff,
    setEditable,
    setActiveTab,
    setFormData,
    handleChange,
    handleGroupToggle,
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
    goBack,
  } = useStaffsView();

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveConfirmChecked, setArchiveConfirmChecked] = useState(false);
  const [archiveAction, setArchiveAction] = useState<"archive" | "unarchive">(
    "archive",
  );
  const [archiveProcessing, setArchiveProcessing] = useState(false);

  const isArchived = staff?.Status === "Archived";

  if (!staff) {
    return (
      <div className="overflow-auto px-6 sm:px-8 py-2 pb-6 sm:pb-8 sm:pb-10 xl:p-10 font-[gothamLight]">
        <div className="mx-auto flex w-full flex-col gap-0 xl:gap-8 xl:flex-row">
          <ViewSidebar
            staffName=""
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onReturn={goBack}
          />
          <RecordSkeleton fields={10} />
        </div>
      </div>
    );
  }

  const handleGroupToggleWrapper = (fields: string[], checked: boolean) => {
    handleGroupToggle(fields as StaffRoleKeys[], checked);
  };

  return (
    <div className="overflow-auto px-6 sm:px-8 py-2 pb-6 sm:pb-8 sm:pb-10 xl:p-10 font-[gothamLight]">
      <div className="mx-auto flex w-full flex-col gap-0 xl:gap-8 xl:flex-row">
        <ViewSidebar
          staffName={`${staff.FirstName} ${staff.LastName}`}
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
          canEditStaff={canEditStaff}
          canArchiveStaff={canArchiveStaff}
          initialData={initialData}
          modificationLogs={modificationLogs}
          loadingModificationLogs={loadingModificationLogs}
          modificationLogsCurrentPage={modificationLogsCurrentPage}
          modificationLogsTotalPages={modificationLogsTotalPages}
          modificationLogsItemsPerPage={modificationLogsItemsPerPage}
          goToModificationLogsPage={goToModificationLogsPage}
          nextModificationLogsPage={nextModificationLogsPage}
          prevModificationLogsPage={prevModificationLogsPage}
          handleModificationLogsItemsPerPageChange={
            handleModificationLogsItemsPerPageChange
          }
          handleChange={handleChange}
          handleGroupToggle={handleGroupToggleWrapper}
          handleCityChange={handleCityChange}
          handleSave={handleSave}
          handleVerifyEmail={handleVerifyEmail}
          startEmailEdit={startEmailEdit}
          cancelEmailEdit={cancelEmailEdit}
          handleArchive={handleArchive}
          handleUnarchive={handleUnarchive}
          setShowArchiveModal={setShowArchiveModal}
          setArchiveAction={setArchiveAction}
          refreshModificationLogs={refreshModificationLogs}
          goBack={goBack}
        />
      </div>

      <StaffArchiveModal
        open={showArchiveModal}
        staffName={`${staff.FirstName} ${staff.LastName}`}
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

      {error && (
        <Modal message={error} onClose={handleCloseModal} type="error" />
      )}
      {success && (
        <Modal message={success} onClose={handleCloseModal} type="success" />
      )}
    </div>
  );
}
