import { Building2 } from "lucide-react";
import ConstantsListModal from "@/features/lms/collections/components/ConstantsListModal";
import type { ConstantsListSpec } from "@/features/lms/collections/components/ConstantsListModal";
import { PKC_LOCATION } from "@/features/lms/collections/components/collection-modals-types";

interface LibraryLocationsModalProps {
  open: boolean;
  locations: string[];
  onClose: () => void;
  onUpdated: (next: { libraryLocations: string[] }) => void;
}

const SPEC: ConstantsListSpec = {
  title: "Library Locations",
  itemLabel: "library location",
  editCase: "editLibraryLocations",
  fetchCase: "fetchLibraryLocations",
  responseKey: "libraryLocations",
  removalTarget: "libraryLocations",
  removalScope: "any archived collection's copies using them",
  lockedItems: [PKC_LOCATION],
};

export default function LibraryLocationsModal({
  open,
  locations,
  onClose,
  onUpdated,
}: LibraryLocationsModalProps) {
  return (
    <ConstantsListModal
      open={open}
      spec={SPEC}
      heading="Configure Library Locations"
      blurb="Add, rename or remove the library locations copies can be assigned to."
      icon={<Building2 className="size-5" />}
      items={locations}
      onClose={onClose}
      onUpdated={(next) => onUpdated({ libraryLocations: next })}
    />
  );
}
