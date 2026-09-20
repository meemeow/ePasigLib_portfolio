import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";

interface CopyArchiveModalProps {
  open: boolean;
  collectionTitle: string;
  archiveAction: "archive" | "unarchive";
  archiveConfirmChecked: boolean;
  setArchiveConfirmChecked: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export default function CopyArchiveModal({
  open,
  collectionTitle,
  archiveAction,
  archiveConfirmChecked,
  setArchiveConfirmChecked,
  onCancel,
  onConfirm,
  isProcessing = false,
}: CopyArchiveModalProps) {
  return (
    <ArchiveConfirmModal
      open={open}
      entityLabel="Copy"
      entityName={collectionTitle}
      archiveAction={archiveAction}
      confirmChecked={archiveConfirmChecked}
      setConfirmChecked={setArchiveConfirmChecked}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isProcessing={isProcessing}
      archiveWarning="Archiving this copy takes it out of circulation. The rest of the collection is unaffected."
      unarchiveWarning="Unarchiving returns this copy to circulation."
    />
  );
}
