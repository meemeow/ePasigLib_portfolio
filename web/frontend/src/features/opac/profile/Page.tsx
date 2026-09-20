import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Modal from "@/components/ui/ValidationModal";
import { useOPACProfilePage } from "@/features/opac/profile/api/opac-profile-logic";
import ProfileSidebar from "@/features/opac/profile/components/ProfileSidebar";
import ProfileContainer from "@/features/opac/profile/components/ProfileContainer";

export default function OPACProfile() {
  const location = useLocation();

  const {
    userData,
    formData,
    paginatedLogs,
    visitLogLoading,
    cities,
    barangays,
    activeTab,
    isEditing,
    isProcessing,
    hasChanges,
    error,
    success,
    fieldErrors,
    currentPage,
    itemsPerPage,
    totalPages,
    avatarEditing,
    selectedFile,
    avatarPreview,
    selectedReuploadID,
    fileInputRef,
    setFormData,
    setAvatarEditing,
    setItemsPerPage,
    setActiveTab,
    setIsEditing,
    setError,
    setSuccess,
    setSelectedReuploadID,
    refreshVisitLogs,
    handlePageChange,
    nextPage,
    prevPage,
    handleChange,
    handleCityChange,
    handleSave,
    handleCancel,
    onAvatarChange,
    handleAvatarUpload,
    handleAvatarCancel,
    handleReuploadID,
  } = useOPACProfilePage();

  const shouldHighlightReupload = Boolean(
    (location.state as { highlightReuploadID?: boolean } | null)
      ?.highlightReuploadID,
  );

  useEffect(() => {
    if (shouldHighlightReupload) setActiveTab("id_verification");
  }, [shouldHighlightReupload, setActiveTab]);

  if (!userData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="overflow-auto px-8 py-2 pb-6 font-[gothamLight] sm:pb-10 xl:p-10">
      <div className="mx-auto flex w-full flex-col gap-0 xl:flex-row xl:gap-8">
        <ProfileSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          needsAttention={formData.State === "Rejected"}
        />

        <ProfileContainer
          activeTab={activeTab}
          formData={formData}
          currentID={userData.ID}
          fieldErrors={fieldErrors}
          isEditing={isEditing}
          isProcessing={isProcessing}
          hasChanges={hasChanges}
          cities={cities}
          barangays={barangays}
          avatarPreview={avatarPreview}
          avatarEditing={avatarEditing}
          selectedFile={selectedFile}
          selectedReuploadID={selectedReuploadID}
          fileInputRef={fileInputRef}
          logs={paginatedLogs}
          loadingLogs={visitLogLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onRefreshLogs={refreshVisitLogs}
          onItemsPerPageChange={setItemsPerPage}
          onGoToPage={handlePageChange}
          onPrevPage={prevPage}
          onNextPage={nextPage}
          onStartEditing={() => setIsEditing(true)}
          onSave={handleSave}
          onCancel={handleCancel}
          onStartAvatarEditing={() => setAvatarEditing(true)}
          onSelectAvatar={onAvatarChange}
          onUploadAvatar={handleAvatarUpload}
          onCancelAvatar={handleAvatarCancel}
          onSelectID={setSelectedReuploadID}
          onReuploadID={handleReuploadID}
          handleChange={handleChange}
          handleCityChange={handleCityChange}
          setBarangay={(value) =>
            setFormData((prev) => ({ ...prev, Barangay: value }))
          }
          setSchoolWork={(value) =>
            setFormData((prev) => ({ ...prev, SchoolWork: value }))
          }
        />
      </div>

      {error && (
        <Modal message={error} type="error" onClose={() => setError(null)} />
      )}
      {success && (
        <Modal
          message={success}
          type="success"
          onClose={() => setSuccess(null)}
        />
      )}
    </div>
  );
}
