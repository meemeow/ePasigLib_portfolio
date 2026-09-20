import Modal from "@/components/ui/ValidationModal";
import { useProfilePage } from "@/features/lms/profile/api/profile-logic";
import ProfileSidebar from "@/features/lms/profile/components/ProfileSidebar";
import ProfileContainer from "@/features/lms/profile/components/ProfileContainer";

export default function Profile() {
  const {
    userData,
    editableData,
    staffRoles,
    paginatedLogs,
    loadingLogs,
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
    selectedAvatar,
    avatarPreview,
    fileInputRef,
    setEditableData,
    setAvatarEditing,
    setItemsPerPage,
    setActiveTab,
    setIsEditing,
    setError,
    setSuccess,
    refreshLogs,
    handlePageChange,
    nextPage,
    prevPage,
    handleChange,
    handleCityChange,
    handleSave,
    handleCancel,
    handleAvatarChange,
    handleAvatarUpload,
    handleAvatarCancel,
  } = useProfilePage();

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
        <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <ProfileContainer
          activeTab={activeTab}
          editableData={editableData}
          fieldErrors={fieldErrors}
          staffRoles={staffRoles}
          isEditing={isEditing}
          isProcessing={isProcessing}
          hasChanges={hasChanges}
          cities={cities}
          barangays={barangays}
          avatarPreview={avatarPreview}
          avatarEditing={avatarEditing}
          selectedAvatar={selectedAvatar}
          fileInputRef={fileInputRef}
          logs={paginatedLogs}
          loadingLogs={loadingLogs}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onRefreshLogs={refreshLogs}
          onItemsPerPageChange={setItemsPerPage}
          onGoToPage={handlePageChange}
          onPrevPage={prevPage}
          onNextPage={nextPage}
          onStartEditing={() => setIsEditing(true)}
          onSave={handleSave}
          onCancel={handleCancel}
          onStartAvatarEditing={() => setAvatarEditing(true)}
          onSelectAvatar={handleAvatarChange}
          onUploadAvatar={handleAvatarUpload}
          onCancelAvatar={handleAvatarCancel}
          handleChange={handleChange}
          handleCityChange={handleCityChange}
          setBarangay={(value) =>
            setEditableData((prev) => ({ ...prev, Barangay: value }))
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
