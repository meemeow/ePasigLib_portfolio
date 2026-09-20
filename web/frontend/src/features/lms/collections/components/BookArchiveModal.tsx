import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";

interface BookArchiveModalProps {
  open: boolean;
  collectionTitle: string;
  archiveAction: "archive" | "unarchive";
  archiveConfirmChecked: boolean;
  setArchiveConfirmChecked: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export default function BookArchiveModal({
  open,
  collectionTitle,
  archiveAction,
  archiveConfirmChecked,
  setArchiveConfirmChecked,
  onCancel,
  onConfirm,
  isProcessing = false,
}: BookArchiveModalProps) {
  return (
    <ArchiveConfirmModal
      open={open}
      entityLabel="Collection"
      entityName={collectionTitle}
      archiveAction={archiveAction}
      confirmChecked={archiveConfirmChecked}
      setConfirmChecked={setArchiveConfirmChecked}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isProcessing={isProcessing}
      archiveWarning="Archiving this collection hides it from the catalogue and stops it from being borrowed. This action can be reversed by unarchiving."
      unarchiveWarning="Unarchiving returns this collection to the catalogue and makes its copies borrowable again."
    />
  );
}
