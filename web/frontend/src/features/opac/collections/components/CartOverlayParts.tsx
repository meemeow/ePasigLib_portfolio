import { MONTH_NAMES_SHORT as MONTHS } from "@/lib/format/date";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, CalendarClock, CheckCircle2, Clock, History, Library, RefreshCw, ShoppingCart, Bookmark, X, XCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import type { CartStatus } from "@/features/opac/collections/types/collections-types";
import { type HistoryRow } from "./cart-utils";
import { asset } from "@/lib/asset";

export const CARD = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm";

export const AVAILABILITY_BADGE: Record<
  CartStatus,
  { label: string; className: string }
> = {
  ok: {
    label: "Available now",
    className: "bg-green-50 text-green-700",
  },
  availableSoon: {
    label: "Available soon",
    className: "bg-[#128CF1]/10 text-[#0e6bb8]",
  },
  allOut: {
    label: "All copies out on loan",
    className: "bg-[#128CF1]/10 text-[#0e6bb8]",
  },
  noCopies: {
    label: "No copies catalogued",
    className: "bg-red-50 text-red-700",
  },
  libraryUse: {
    label: "Library use only",
    className: "bg-amber-50 text-amber-700",
  },
};

export const ROUND_ACTION =
  "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-[#003067] transition hover:border-[#128CF1] hover:bg-[#EAF4FE] hover:text-[#128CF1] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:text-[#003067] focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none";

export const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "saved", label: "Saved", icon: Bookmark },
  { key: "cart", label: "Cart", icon: ShoppingCart },
  { key: "active", label: "My Books", icon: Library },
  { key: "renewal", label: "Renewal", icon: RefreshCw },
  { key: "history", label: "History", icon: History },
];

export const HISTORY_TITLES: Record<string, string> = {
  Reservation: "Reservation request",
  Checkout: "Borrowed",
  Checkin: "Returned",
  Renewal: "Renewal",
};

export function historyNote(row: HistoryRow): string {
  if (row.Remarks) {
    return row.Type === "Reservation" && row.Status === "Rejected"
      ? `Remarks: ${row.Remarks}`
      : row.Remarks;
  }

  if (row.Type === "Reservation") {
    if (row.Status === "Pending") return "Waiting for a librarian.";
    if (row.Status === "Approved") return "A copy was set aside for you.";
    if (row.Status === "Fulfilled") return "Collected.";
    return "";
  }
  if (row.Type === "Checkout") {
    return row.Status === "Returned"
      ? "Returned to the library."
      : row.DueDate
        ? `Due back ${formatDateLong(row.DueDate)}.`
        : "";
  }
  if (row.Type === "Renewal" && row.Status === "Approved") {
    return `Due date extended from ${formatDateLong(row.DueDate)} to ${formatDateLong(row.NewDueDate)}.`;
  }
  if (row.Type === "Checkin") {
    return row.Violations && row.Violations !== "None"
      ? row.Violations
      : "Returned on time.";
  }
  return "";
}

const TYPE_BADGES = {
  requested: {
    label: "Requested",
    icon: Clock,
    className: "bg-amber-50 text-amber-700",
  },
  held: {
    label: "On hold",
    icon: CalendarClock,
    className: "bg-[#EAF4FE] text-[#0F76CC]",
  },
  borrowed: {
    label: "Borrowed",
    icon: BookOpen,
    className: "bg-[#003067]/10 text-[#003067]",
  },
} as const;

export function TypeBadge({ type }: { type: keyof typeof TYPE_BADGES }) {
  const { label, icon: Icon, className } = TYPE_BADGES[type];

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-[gothamMedium]", className)}
    >
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

const STATUS_CLASSES: Record<string, string> = {
  borrowed: "bg-blue-100 text-blue-800",
  returned: "bg-green-100 text-green-700",
  ready: "bg-green-100 text-green-700",
  overdue: "bg-orange-100 text-orange-800",
  longoverdue: "bg-red-100 text-red-700",
  assumedlost: "bg-red-100 text-red-700",
  renewed: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-700",
  fulfilled: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-200 text-gray-700",
  "pickup failed": "bg-gray-200 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  LongOverdue: "Long overdue",
  AssumedLost: "Missing / Lost",
};

export function StatusPill({ status }: { status?: string | null }) {
  const raw = String(status || "").trim();
  if (!raw) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-[gothamMedium]",
        STATUS_CLASSES[raw.toLowerCase()] || "bg-gray-100 text-gray-700",
      )}
    >
      {STATUS_LABELS[raw] || raw}
    </Badge>
  );
}

export function Panel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={`cart-panel-${id}`}
      aria-labelledby={`cart-tab-${id}`}
    >
      {children}
    </div>
  );
}

export function RecordHeader({
  title,
  meta,
  status,
  badge,
}: {
  title: string;
  meta: string;
  status?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        {badge && <div className="mb-1.5">{badge}</div>}
        <Text className="font-[gothamMedium] text-sm text-[#003067]">
          {title}
        </Text>
        <Text className="mt-0.5 text-xs text-gray-500">{meta}</Text>
      </div>
      <StatusPill status={status} />
    </div>
  );
}

export function BookLines({
  books,
}: {
  books?: Array<{ Accession: string; CollectionTitle: string }>;
}) {
  if (!books || books.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
      {books.map((book, index) => (
        <li key={`${book.Accession}-${index}`} className="flex gap-2 text-xs">
          <span className="shrink-0 text-gray-400">
            {book.Accession ? `(${book.Accession})` : "(to be assigned)"}
          </span>
          <span
            className="min-w-0 truncate text-gray-700"
            title={book.CollectionTitle}
          >
            {book.CollectionTitle}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StatusNote({ text }: { text?: string }) {
  if (!text) return null;
  return <Text className="mt-2 text-xs text-gray-500">{text}</Text>;
}

export function Banner({
  tone,
  onDismiss,
  children,
}: {
  tone: "success" | "error";
  onDismiss?: () => void;
  children: ReactNode;
}) {
  const success = tone === "success";

  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${
        success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
      )}
      <Text
        className={`flex-1 text-sm ${success ? "text-green-800" : "text-red-800"}`}
      >
        {children}
      </Text>
      {onDismiss && (
        <Button
          type="button"
          variant={null}
          size={null}
          onClick={onDismiss}
          aria-label="Dismiss message"
          className={`-mr-1 shrink-0 rounded-full p-1 transition ${
            success
              ? "text-green-600 hover:bg-green-100"
              : "text-red-600 hover:bg-red-100"
          }`}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
      <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1]">
        {icon}
      </div>
      <Text className="font-[gothamMedium] text-sm text-[#003067]">
        {title}
      </Text>
      <Text className="max-w-sm text-xs text-gray-500">{hint}</Text>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ListSkeleton({ withCover }: { withCover?: boolean }) {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((row) => (
        <div key={row} className={`${CARD} flex gap-3`}>
          {withCover && <Skeleton className="h-20 w-14 shrink-0" />}
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

const NO_COVER = asset("/assets/images/PasigLibrary_Logo.png");

export function Cover({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  const missing = !src || src === "/placeholder.png" || failed;

  return (
    <img
      src={missing ? NO_COVER : src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(
        "rounded-md bg-gray-100 shadow-sm",
        missing ? "object-contain p-1.5 opacity-50" : "object-cover",
        className,
      )}
    />
  );
}


export function formatDateLong(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const date =
    typeof value === "number" ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";

  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${MONTHS[shifted.getUTCMonth()]} ${shifted.getUTCDate()}, ${shifted.getUTCFullYear()}`;
}
