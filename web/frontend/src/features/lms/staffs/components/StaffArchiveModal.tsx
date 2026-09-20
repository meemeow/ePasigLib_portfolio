import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";

interface StaffArchiveModalProps {
  open: boolean;
  staffName: string;
  archiveAction: "archive" | "unarchive";
  archiveConfirmChecked: boolean;
  setArchiveConfirmChecked: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export default function StaffArchiveModal({
  open,
  staffName,
  archiveAction,
  archiveConfirmChecked,
  setArchiveConfirmChecked,
  onCancel,
  onConfirm,
  isProcessing = false,
}: StaffArchiveModalProps) {
  return (
    <ArchiveConfirmModal
      open={open}
      entityLabel="Librarian"
      entityName={staffName}
      archiveAction={archiveAction}
      confirmChecked={archiveConfirmChecked}
      setConfirmChecked={setArchiveConfirmChecked}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isProcessing={isProcessing}
      archiveWarning="Archiving this librarian will prevent them from logging in and accessing the system. This action can be reversed by unarchiving."
      unarchiveWarning="Unarchiving will restore the librarian's access to the system. Their previous permissions will be reinstated."
    />
  );
}
