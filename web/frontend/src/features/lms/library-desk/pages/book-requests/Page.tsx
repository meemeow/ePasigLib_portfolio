import {
  AlertTriangle,
  Check,
  Clock,
  Inbox,
  Library,
  Loader2,
  RotateCcw,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Search } from "@/components/ui/Search";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { SegmentedRail, segmentClasses } from "@/components/ui/SegmentedRail";
import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";
import Modal from "@/components/ui/ValidationModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import RequestsChart from "@/features/lms/library-desk/pages/book-requests/components/RequestsChart";
import RequestStatusBadge from "@/features/lms/library-desk/pages/book-requests/components/RequestStatusBadge";
import ConfirmDecisionModal from "@/features/lms/library-desk/pages/book-requests/components/ConfirmDecisionModal";
import { formatMillisDate } from "@/features/lms/library-desk/api/desk-helpers";
import {
  useBookRequestsPage,
  type StatusFilter,
} from "@/features/lms/library-desk/pages/book-requests/api/book-requests-logic";
import type { BookRequestGroup } from "@/features/lms/library-desk/types/book-request-types";

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "brand" | "amber" | "green";
}) {
  const disc = {
    brand: "bg-[#EAF4FE] text-[#128CF1]",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-6 shadow-sm sm:gap-4 sm:px-6 sm:py-8 xl:px-4 xl:py-6 min-[1700px]:px-6 min-[1700px]:py-8">
      <div
        aria-hidden
        className={`flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12 xl:size-10 min-[1700px]:size-12 ${disc}`}
      >
        <Icon
          className="size-5 sm:size-6 xl:size-5 min-[1700px]:size-6"
          strokeWidth={1.75}
        />
      </div>
      <div className="min-w-0">
        <Text className="text-2xl font-[gothamBlack] leading-none text-[#002248] min-[401px]:text-3xl sm:text-4xl xl:text-3xl min-[1700px]:text-4xl">
          {value.toLocaleString()}
        </Text>
        <Text className="mt-2 text-xs text-gray-500 sm:text-sm xl:text-xs min-[1700px]:text-sm">
          {label}
        </Text>
      </div>
    </div>
  );
}

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Under Review", label: "Under review" },
  { key: "Approved", label: "Approved" },
  { key: "Declined", label: "Declined" },
];

function StatusFilterBar({
  value,
  counts,
  onChange,
}: {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (next: StatusFilter) => void;
}) {
  return (
    <SegmentedRail
      activeKey={value}
      ariaLabel="Filter by status"
      className="flex w-full flex-wrap items-center gap-1 rounded-full border bg-white p-1 shadow-sm sm:w-auto"
    >
      {FILTERS.map((filter) => {
        const active = value === filter.key;
        return (
          <button
            key={filter.key}
            type="button"
            aria-pressed={active}
            data-segment-active={active}
            onClick={() => onChange(filter.key)}
            className={`flex-1 sm:flex-none ${segmentClasses(active)}`}
          >
            {filter.label}
            <span
              className={`ml-1.5 tabular-nums transition-colors duration-200 ${
                active ? "text-white/70" : "text-gray-400"
              }`}
            >
              {counts[filter.key]}
            </span>
          </button>
        );
      })}
    </SegmentedRail>
  );
}

const ACTION_BASE = "gap-1.5 text-xs shadow-none";

function RowActions({
  group,
  pending,
  onStatus,
}: {
  group: BookRequestGroup;
  pending: boolean;
  onStatus: (
    group: BookRequestGroup,
    status: "Under Review" | "Approved" | "Declined",
  ) => void;
}) {
  if (pending) {
    return (
      <div className="flex justify-center">
        <Loader2 className="size-4 animate-spin text-blue-600" />
      </div>
    );
  }

  if (group.Status === "Approved") {
    return (
      <div className="flex justify-center">
        <span aria-hidden className="text-sm text-gray-300">
          —
        </span>
        <span className="sr-only">No actions — this title is approved</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {group.Status === "Under Review" ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatus(group, "Approved")}
            aria-label={`Approve ${group.Title}`}
            className={`${ACTION_BASE} border-green-600 text-green-700 hover:border-green-700 hover:bg-green-600 hover:text-white`}
          >
            <Check className="size-3.5" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatus(group, "Declined")}
            aria-label={`Decline ${group.Title}`}
            className={`${ACTION_BASE} border-red-600 text-red-700 hover:border-red-700 hover:bg-red-600 hover:text-white`}
          >
            <X className="size-3.5" />
            Decline
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStatus(group, "Under Review")}
          aria-label={`Put ${group.Title} back under review`}
          className={`${ACTION_BASE} border-[#003067]/40 text-[#003067] hover:border-[#003067] hover:bg-[#003067] hover:text-white`}
        >
          <RotateCcw className="size-3.5" />
          Reopen
        </Button>
      )}
    </div>
  );
}

export default function BookRequests() {
  const page = useBookRequestsPage();

  if (page.loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const filterCounts: Record<StatusFilter, number> = {
    all: page.totals.titles,
    "Under Review": page.totals.underReview,
    Approved: page.totals.approved,
    Declined: page.totals.declined,
  };

  const showActions = page.canManage && page.statusFilter !== "Approved";

  const actionsPadding = page.statusFilter === "Declined" ? "px-12" : "px-5";
  const columns = showActions ? 7 : 6;

  return (
    <>
      {page.modal && (
        <Modal
          message={page.modal.message}
          type={page.modal.type}
          onClose={() => page.setModal(null)}
        />
      )}

      <div className="flex w-full flex-col gap-1 py-3 md:flex-row md:flex-nowrap md:items-center md:justify-start">
        <div className="order-1 w-full min-w-0 md:w-auto">
          <div className="flex items-center gap-2">
            <Text className="text-2xl font-[gothamBlack] uppercase text-[#011b38] sm:text-3xl">
              Book Requests
            </Text>
            <RefreshButton
              onClick={page.refresh}
              refreshing={page.refreshing}
              className="ml-0.5 mt-0.5"
              label="Refresh Book Requests"
            />
          </div>
          <Text className="my-1 ml-1 text-sm font-[gothamMedium] text-[#003067]">
            {page.totals.titles.toLocaleString()} distinct{" "}
            {page.totals.titles === 1 ? "title" : "titles"}
            {page.totals.underReview > 0 && (
              <>
                {" · "}
                {page.totals.underReview.toLocaleString()} awaiting a decision
              </>
            )}
          </Text>
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto">
          <div className="w-full min-w-0 md:w-[300px]">
            <Search
              value={page.search}
              onChange={page.setSearch}
              placeholder="Search title or author..."
              containerClassName="w-full md:w-full"
            />
          </div>
        </div>
      </div>

      {page.error && (
        <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl border bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="size-7 text-red-500" />
          <Text className="text-sm text-gray-600">{page.error}</Text>
          <Button variant="outline" size="sm" onClick={page.refresh}>
            Try again
          </Button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 min-[490px]:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Distinct titles"
          value={page.totals.titles}
          icon={Library}
        />
        <StatTile
          label="Total requests"
          value={page.totals.requests}
          icon={Inbox}
        />
        <StatTile
          label="Awaiting a decision"
          value={page.totals.underReview}
          icon={Clock}
          tone="amber"
        />
        <StatTile
          label="Approved"
          value={page.totals.approved}
          icon={Check}
          tone="green"
        />
      </div>

      <RequestsChart data={page.chartData} totalTitles={page.chartTotal} />

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Text
            as="h2"
            className="ml-1 text-2xl font-[gothamBlack] uppercase text-[#011b38] sm:text-3xl"
          >
            All requests
          </Text>
          <StatusFilterBar
            value={page.statusFilter}
            counts={filterCounts}
            onChange={page.setStatusFilter}
          />
        </div>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[16rem]">Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Requests</TableHead>
                <TableHead className="text-center">Patrons</TableHead>
                <TableHead className="text-center">Last requested</TableHead>
                {showActions && (
                  <TableHead className={`w-px text-center ${actionsPadding}`}>
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {page.groups.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns} className="p-0">
                    <div className="p-10 text-center text-sm text-gray-500">
                      {page.search || page.statusFilter !== "all"
                        ? "No requests match your filters."
                        : "No book requests yet."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                page.groups.map((group) => (
                  <TableRow
                    key={group.id}
                    className="even:bg-blue-50 transition-colors duration-200 hover:bg-gray-100"
                  >
                    <TableCell className="align-middle">
                      <span className="block truncate" title={group.Title}>
                        {group.Title}
                      </span>
                    </TableCell>
                    <TableCell className="align-middle">
                      {group.Author || "—"}
                    </TableCell>
                    <TableCell className="align-middle text-center">
                      <RequestStatusBadge status={group.Status} />
                    </TableCell>
                    <TableCell className="align-middle text-center font-[gothamMedium]">
                      {group.Count}
                    </TableCell>
                    <TableCell className="align-middle text-center font-[gothamMedium]">
                      {group.Requesters}
                    </TableCell>
                    <TableCell className="align-middle whitespace-nowrap text-center">
                      {formatMillisDate(group.LastRequestedOn)}
                    </TableCell>
                    {showActions && (
                      <TableCell
                        className={`w-px align-middle text-center ${actionsPadding}`}
                      >
                        <RowActions
                          group={group}
                          pending={page.pendingId === group.id}
                          onStatus={page.requestDecision}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <ConfirmDecisionModal
        group={page.decision?.group ?? null}
        status={page.decision?.status ?? null}
        processing={
          !!page.decision && page.pendingId === page.decision.group.id
        }
        onCancel={page.cancelDecision}
        onConfirm={page.confirmDecision}
      />

      <ArchiveConfirmModal
        open={!!page.deleteTarget}
        entityLabel="Book request"
        entityName={page.deleteTarget?.Title ?? ""}
        archiveAction="archive"
        confirmChecked={page.deleteConfirmed}
        setConfirmChecked={page.setDeleteConfirmed}
        onCancel={page.cancelDelete}
        onConfirm={page.confirmDelete}
        isProcessing={page.deleting}
        archiveWarning={
          page.deleteTarget
            ? `This removes all ${page.deleteTarget.Count} request${
                page.deleteTarget.Count === 1 ? "" : "s"
              } for this title, from ${page.deleteTarget.Requesters} patron${
                page.deleteTarget.Requesters === 1 ? "" : "s"
              }. This cannot be undone.`
            : undefined
        }
      />
    </>
  );
}
