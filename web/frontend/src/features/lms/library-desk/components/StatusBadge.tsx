import { statusBadgeClass } from "@/features/lms/library-desk/api/desk-helpers";
import type {
  UpdateStatus,
} from "@/features/lms/library-desk/types/updates-types";

export default function StatusBadge({
  status,
  className = "",
}: {
  status: UpdateStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-[gothamMedium] ${statusBadgeClass(status)} ${className}`}
    >
      {status}
    </span>
  );
}
