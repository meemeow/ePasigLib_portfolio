import { LayoutGrid } from "lucide-react";
import ConstantsListModal from "@/features/lms/collections/components/ConstantsListModal";
import type { ConstantsListSpec } from "@/features/lms/collections/components/ConstantsListModal";

interface SectionsModalProps {
  open: boolean;
  sections: string[];
  onClose: () => void;
  onUpdated: (next: { sections: string[] }) => void;
}

const SPEC: ConstantsListSpec = {
  title: "Sections",
  itemLabel: "section",
  editCase: "editSections",
  fetchCase: "fetchSections",
  responseKey: "sections",
  removalTarget: "sections",
  removalScope: "any archived collection's copies using them",
};

export default function SectionsModal({
  open,
  sections,
  onClose,
  onUpdated,
}: SectionsModalProps) {
  return (
    <ConstantsListModal
      open={open}
      spec={SPEC}
      heading="Configure Sections"
      blurb="Add, rename or remove the shelving sections used across the catalogue."
      icon={<LayoutGrid className="size-5" />}
      items={sections}
      onClose={onClose}
      onUpdated={(next) => onUpdated({ sections: next })}
    />
  );
}
