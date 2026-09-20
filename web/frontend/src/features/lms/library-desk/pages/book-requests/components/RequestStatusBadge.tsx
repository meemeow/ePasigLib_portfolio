import type { BookRequestStatus } from "@/features/lms/library-desk/types/book-request-types";

const TONE: Record<BookRequestStatus, string> = {
  "Under Review": "bg-gray-100 text-gray-700 border-gray-200",
  Approved: "bg-green-50 text-green-700 border-green-200",
  Declined: "bg-red-50 text-red-700 border-red-200",
};

export default function RequestStatusBadge({
  status,
  className = "",
}: {
  status: BookRequestStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-[gothamMedium] ${TONE[status]} ${className}`}
    >
      {status}
    </span>
  );
}
