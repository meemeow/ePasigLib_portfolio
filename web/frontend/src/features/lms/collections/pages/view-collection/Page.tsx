import { useNavigate, useParams } from "react-router-dom";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Loader2, RefreshCcw } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import Modal from "@/components/ui/ValidationModal";
import LibraryLocationsModal from "@/features/lms/collections/components/LibraryLocationsModal";
import SectionsModal from "@/features/lms/collections/components/SectionsModal";
import BookArchiveModal from "@/features/lms/collections/components/BookArchiveModal";
import CopyArchiveModal from "@/features/lms/collections/components/CopyArchiveModal";
import { useCollectionsView } from "@/features/lms/collections/pages/view-collection/api/collections-view-logic";
import ViewSidebar from "@/features/lms/collections/pages/view-collection/components/ViewSidebar";
import ViewContainer from "@/features/lms/collections/pages/view-collection/components/ViewContainer";
import ViewCollectionHome from "@/features/lms/collections/pages/view-collection/components/ViewCollectionHome";
import ViewCollectionCopies from "@/features/lms/collections/pages/view-collection/components/ViewCollectionCopies";
import ViewCollectionMarc from "@/features/lms/collections/pages/view-collection/components/ViewCollectionMarc";
import ViewCollectionSkeleton from "@/features/lms/collections/pages/view-collection/components/ViewCollectionSkeleton";

export default function CollectionsView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userType, staffRoles: userStaffRoles } = useAuth();

    const view = useCollectionsView(id);
    const {
        collectionData,
        loading,
        activeTab,
        setActiveTab,
        modalMessage,
        modalType,
        setModalMessage,
        showFullDesc,
        setShowFullDesc,
        activeMarcBlock,
        setActiveMarcBlock,
        showArchiveModal,
        setShowArchiveModal,
        archiveConfirmChecked,
        setArchiveConfirmChecked,
        archiveAction,
        archiveProcessing,
        copyToArchiveIndex,
        setCopyToArchiveIndex,
        showCopyArchiveModal,
        setShowCopyArchiveModal,
        copyArchiveConfirmChecked,
        setCopyArchiveConfirmChecked,
        otherCopyToArchiveIndex,
        setOtherCopyToArchiveIndex,
        showOtherCopyArchiveModal,
        setShowOtherCopyArchiveModal,
        otherCopyArchiveConfirmChecked,
        setOtherCopyArchiveConfirmChecked,
        libraryLocations,
        setLibraryLocations,
        showLibraryLocationsModal,
        setShowLibraryLocationsModal,
        sections,
        setSections,
        showSectionsModal,
        setShowSectionsModal,
        handleArchiveToggleClick,
        confirmArchiveToggle,
        handleConfirmCopyArchive,
        isRefreshing,
        refetchCollection,
        homeButtonsDisabled,
        isSavingOtherLibraryCopy,
    } = view;

    const canAdd = userType === "Staff" && !!userStaffRoles?.CatalogingAdd;
    const canEdit = userType === "Staff" && !!userStaffRoles?.CatalogingEdit;
    const canArchive = userType === "Staff" && !!userStaffRoles?.CatalogingArchive;
    const canConfigureLibraryLocations =
        userType === "Staff" &&
        !!(userStaffRoles?.StaffAdd || userStaffRoles?.StaffArchive || userStaffRoles?.StaffEdit);

    if (loading && !collectionData) {
        return (
            <div className="overflow-auto px-6 sm:px-8 py-2 pb-6 sm:pb-10 xl:p-10 font-[gothamLight]">
                <div className="mx-auto flex w-full flex-col gap-0 xl:gap-8 xl:flex-row">
                    <ViewSidebar
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        onReturn={() => navigate("/lms/collections")}
                    />
                    <ViewCollectionSkeleton />
                </div>
            </div>
        );
    }

    if (!collectionData) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh]">
                <Text className="text-gray-500">This collection could not be loaded.</Text>
                <Button
  className={COMPACT_CONTROL} variant="outline" onClick={() => navigate("/lms/collections")}>
                    ← Return
                </Button>
            </div>
        );
    }

    const isArchived = collectionData.Status === "Archived";

    const homeActions = (
        <>
            <Button
                onClick={() => refetchCollection()}
                disabled={isRefreshing || homeButtonsDisabled || isSavingOtherLibraryCopy}
                aria-label="Refresh"
                className={`bg-white text-gray-800 px-3 py-2 hover:bg-gray-50 border ${COMPACT_CONTROL}`}
            >
                {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCcw className="h-4 w-4 sm:hidden" />
                )}
                <span className="max-sm:hidden">Refresh</span>
            </Button>
            {canEdit && (
                <Button
                    onClick={() => navigate(`/lms/collections/edit/${collectionData.id}`, { state: { from: "view" } })}
                    className={`bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 ${COMPACT_CONTROL}`}
                    disabled={homeButtonsDisabled || isSavingOtherLibraryCopy}
                >
                    Edit
                </Button>
            )}
            {canArchive && (
                <Button
                    onClick={handleArchiveToggleClick}
                    disabled={homeButtonsDisabled || isSavingOtherLibraryCopy}
                    className={`${
                        isArchived ? "bg-yellow-600 hover:bg-yellow-700" : "bg-red-600 hover:bg-red-700"
                    } text-white px-4 py-2 ${COMPACT_CONTROL}`}
                >
                    {isArchived ? "Unarchive" : "Archive"}
                </Button>
            )}
        </>
    );

    return (
        <div className="overflow-auto px-6 sm:px-8 py-2 pb-6 sm:pb-10 xl:p-10 font-[gothamLight]">
            <div className="mx-auto flex w-full flex-col gap-0 xl:gap-8 xl:flex-row">
                <ViewSidebar
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onReturn={() => navigate("/lms/collections")}
                    actions={activeTab === "home" ? homeActions : undefined}
                />

                <div className="min-w-0 flex-1">
                    {activeTab === "home" && (
                        <>
                            <div className="hidden w-full flex-col py-3 md:w-auto xl:flex">
                                <div className="flex-1" />
                                <div className="flex gap-2 items-end justify-end align-bottom">
                                    {homeActions}
                                </div>
                            </div>

                            <ViewCollectionHome
                                collectionData={collectionData}
                                showFullDesc={showFullDesc}
                                setShowFullDesc={setShowFullDesc}
                            />

                            <ViewCollectionCopies
                                view={view}
                                canAdd={canAdd}
                                canEdit={canEdit}
                                canArchive={canArchive}
                                canConfigureLibraryLocations={canConfigureLibraryLocations}
                            />
                        </>
                    )}

                    {activeTab === "marc" && (
                        <div className="py-3 xl:py-0">
                            <ViewCollectionMarc
                                collection={collectionData}
                                activeBlock={activeMarcBlock}
                                onBlockChange={setActiveMarcBlock}
                            />
                        </div>
                    )}

                    {activeTab !== "home" && activeTab !== "marc" && <ViewContainer view={view} />}
                </div>
            </div>

            <BookArchiveModal
                open={showArchiveModal}
                collectionTitle={collectionData.CollectionTitle}
                archiveAction={archiveAction}
                archiveConfirmChecked={archiveConfirmChecked}
                setArchiveConfirmChecked={setArchiveConfirmChecked}
                isProcessing={archiveProcessing}
                onCancel={() => {
                    setShowArchiveModal(false);
                    setArchiveConfirmChecked(false);
                }}
                onConfirm={confirmArchiveToggle}
            />

            {showCopyArchiveModal && copyToArchiveIndex !== null && (
                <CopyArchiveModal
                    open={showCopyArchiveModal}
                    collectionTitle={collectionData.CollectionTitle}
                    archiveAction={(collectionData.Copies?.[copyToArchiveIndex]?.Availability === "Archived") ? "unarchive" : "archive"}
                    archiveConfirmChecked={copyArchiveConfirmChecked}
                    setArchiveConfirmChecked={setCopyArchiveConfirmChecked}
                    isProcessing={archiveProcessing}
                    onCancel={() => {
                        setShowCopyArchiveModal(false);
                        setCopyArchiveConfirmChecked(false);
                        setCopyToArchiveIndex(null);
                    }}
                    onConfirm={async () => {
                        await handleConfirmCopyArchive("pkc");
                    }}
                />
            )}

            {showOtherCopyArchiveModal && otherCopyToArchiveIndex !== null && (
                <CopyArchiveModal
                    open={showOtherCopyArchiveModal}
                    collectionTitle={collectionData.CollectionTitle}
                    archiveAction={(collectionData.OtherCopies?.[otherCopyToArchiveIndex]?.Availability === "Archived") ? "unarchive" : "archive"}
                    archiveConfirmChecked={otherCopyArchiveConfirmChecked}
                    setArchiveConfirmChecked={setOtherCopyArchiveConfirmChecked}
                    isProcessing={archiveProcessing}
                    onCancel={() => {
                        setShowOtherCopyArchiveModal(false);
                        setOtherCopyArchiveConfirmChecked(false);
                        setOtherCopyToArchiveIndex(null);
                    }}
                    onConfirm={async () => {
                        await handleConfirmCopyArchive("other");
                    }}
                />
            )}

            {canConfigureLibraryLocations && (
                <>
                    <LibraryLocationsModal
                        open={showLibraryLocationsModal}
                        locations={libraryLocations}
                        onClose={() => setShowLibraryLocationsModal(false)}
                        onUpdated={({ libraryLocations: next }) => setLibraryLocations(next)}
                    />

                    <SectionsModal
                        open={showSectionsModal}
                        sections={sections}
                        onClose={() => setShowSectionsModal(false)}
                        onUpdated={({ sections: next }) => setSections(next)}
                    />
                </>
            )}

            {modalMessage && <Modal message={modalMessage} type={modalType} onClose={() => setModalMessage(null)} />}
        </div>
    );
}
