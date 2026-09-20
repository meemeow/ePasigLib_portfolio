import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<string, string> = {
  borrowed: "bg-blue-100 text-blue-800 border-blue-200",
  returned: "bg-green-100 text-green-700 border-green-200",
  overdue: "bg-orange-100 text-orange-800 border-orange-200",
  longoverdue: "bg-red-100 text-red-700 border-red-200",
  assumedlost: "bg-red-200 text-red-900 border-red-300",
  missing: "bg-red-100 text-red-700 border-red-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  fulfilled: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-yellow-100 text-yellow-800 border-yellow-200",
  expired: "bg-gray-200 text-gray-700 border-gray-300",
  "pickup failed": "bg-gray-200 text-gray-700 border-gray-300",
};

const STATUS_LABELS: Record<string, string> = {
  LongOverdue: "Long overdue",
  AssumedLost: "Missing / Lost",
};

const FALLBACK = "bg-gray-100 text-gray-700 border-gray-200";

export function statusToClass(status?: string): string {
  return STATUS_CLASSES[String(status || "").toLowerCase()] || FALLBACK;
}

interface CirculationStatusBadgeProps {
  status?: string;
  dueDate?: number | null;
  className?: string;
}

export default function CirculationStatusBadge({
  status,
  dueDate,
  className,
}: CirculationStatusBadgeProps) {
  const raw = String(status || "").trim();
  const isOverdue =
    raw.toLowerCase() === "borrowed" &&
    typeof dueDate === "number" &&
    dueDate < Date.now();
  const value = isOverdue ? "Overdue" : raw;
  const label = value ? STATUS_LABELS[value] || value : "—";

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full font-[gothamMedium]",
        statusToClass(value),
        className,
      )}
    >
      {label}
    </Badge>
  );
}
