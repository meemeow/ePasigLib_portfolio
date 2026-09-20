import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/ui/ValidationModal";
import { PatronInformationModal } from "@/features/lms/patrons/components/PatronInformationModal";
import { useVerifyPatrons } from "@/features/lms/patrons/pages/verify-patron/api/patrons-verify-logic";
import type {
  VerifyAction,
  VerifyPatron,
} from "@/features/lms/patrons/pages/verify-patron/types/patrons-verify-types";

import VerifySidebar from "@/features/lms/patrons/pages/verify-patron/components/VerifySidebar";
import VerifyContainer from "@/features/lms/patrons/pages/verify-patron/components/VerifyContainer";

export default function PatronsVerify() {
  const navigate = useNavigate();

  const {
    loading,
    processing,
    error,
    success,
    setError,
    setSuccess,
    paginated,
    totalPages,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    paginateData,
    refreshUnverified,
    verifyPatronID,
  } = useVerifyPatrons();

  const [selectedPatron, setSelectedPatron] = useState<VerifyPatron | null>(
    null,
  );

  const handleVerifyAction = async (action: VerifyAction, remarks: string) => {
    if (!selectedPatron) return;
    const result = await verifyPatronID(action, selectedPatron, remarks);
    if (result.ok) setSelectedPatron(null);
  };

  return (
    <div className="overflow-auto px-6 sm:px-8 py-2 pb-6 sm:pb-8 sm:pb-10 xl:p-10 font-[gothamLight]">
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

      <div className="mx-auto flex w-full flex-col gap-0 xl:gap-8 xl:flex-row">
        <VerifySidebar onReturn={() => navigate(-1)} />

        <VerifyContainer
          patrons={paginated}
          loading={loading}
          onRefresh={refreshUnverified}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          onGoToPage={paginateData}
          onNextPage={() => paginateData(currentPage + 1)}
          onPrevPage={() => paginateData(currentPage - 1)}
          onView={setSelectedPatron}
        />
      </div>

      {selectedPatron && (
        <PatronInformationModal
          formData={selectedPatron}
          isProcessing={processing}
          onClose={() => setSelectedPatron(null)}
          onSubmit={handleVerifyAction}
        />
      )}
    </div>
  );
}
