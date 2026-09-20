import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";

interface PatronArchiveModalProps {
  open: boolean;
  patronName: string;
  archiveAction: "archive" | "unarchive";
  archiveConfirmChecked: boolean;
  setArchiveConfirmChecked: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export default function PatronArchiveModal({
  open,
  patronName,
  archiveAction,
  archiveConfirmChecked,
  setArchiveConfirmChecked,
  onCancel,
  onConfirm,
  isProcessing = false,
}: PatronArchiveModalProps) {
  return (
    <ArchiveConfirmModal
      open={open}
      entityLabel="Patron"
      entityName={patronName}
      archiveAction={archiveAction}
      confirmChecked={archiveConfirmChecked}
      setConfirmChecked={setArchiveConfirmChecked}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isProcessing={isProcessing}
      archiveWarning="Archiving this patron will prevent them from logging in and borrowing. This action can be reversed by unarchiving."
      unarchiveWarning="Unarchiving will restore the patron's access to the library system."
    />
  );
}
