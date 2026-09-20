import { AlertTriangle, BookMarked, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { TableCell } from "@/components/ui/Table";
import {
  LookupResultRow,
  LookupSelectedRow,
  ResultsTable,
} from "@/features/lms/circulations/components/LookupResults";
import { formatMillis } from "@/features/lms/circulations/api/circulation-records-helpers";
import { formatFullName } from "@/lib/format/name";
import type { BorrowedCopiesState } from "@/features/lms/circulations/api/use-borrowed-copies";
import type {
  BorrowedBookRow,
  Patron,
} from "@/features/lms/circulations/types/circulation-transaction-types";

const COLUMNS = ["Copy", "Due", "Status"];

interface BorrowedCopiesPanelProps {
  patron: Patron | null;
  copies: BorrowedCopiesState;
  disabled?: boolean;
  blockIneligible?: boolean;
}

export default function BorrowedCopiesPanel({
  patron,
  copies,
  disabled,
  blockIneligible,
}: BorrowedCopiesPanelProps) {
  const { books, loading, error, selected } = copies;

  const isBlocked = (row: BorrowedBookRow) =>
    Boolean(blockIneligible && row.IneligibleReason);

  const cells = (row: BorrowedBookRow, trailing?: React.ReactNode) => {
    const title = row.CollectionTitle || "Untitled";
    const blocked = isBlocked(row);
    return (
      <>
        <TableCell>
          <span
            className={`block truncate font-[gothamMedium] ${
              blocked ? "text-gray-500" : "text-[#003067]"
            }`}
            title={title}
          >
            {title}
          </span>
          <span className="block font-mono text-xs text-gray-500">
            {row.Accession}
          </span>
        </TableCell>
        <TableCell className="text-gray-600">
          {formatMillis(row.DueDate)}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-between gap-2">
            {blocked && !row.IsOverdue ? (
              <span
                className="truncate text-xs text-gray-500"
                title={row.IneligibleReason || undefined}
              >
                {row.IneligibleReason}
              </span>
            ) : row.IsOverdue ? (
              <Badge
                variant="outline"
                className="rounded-full border-red-200 bg-red-100 font-[gothamMedium] text-red-700"
              >
                Overdue
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="rounded-full border-blue-200 bg-blue-100 font-[gothamMedium] text-blue-800"
              >
                On loan
              </Badge>
            )}
            {trailing}
          </div>
        </TableCell>
      </>
    );
  };

  const placeholder = selected ? null : !patron ? (
    "Select a patron to see what they have out."
  ) : loading ? (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="size-4 animate-spin text-[#128CF1]" />
      Loading borrowed copies...
    </span>
  ) : error ? (
    <span className="inline-flex flex-col items-center gap-3">
      <AlertTriangle className="size-6 text-red-500" />
      <span className="text-gray-600">{error}</span>
      <Button variant="outline" size="sm" onClick={copies.reload}>
        Try again
      </Button>
    </span>
  ) : books.length === 0 ? (
    "This patron has no copies out."
  ) : null;

  const overdueCount = books.filter((row) => row.IsOverdue).length;
  const renewableCount = books.filter((row) => !isBlocked(row)).length;
  const patronLabel = patron ? formatFullName(patron) || "This patron" : "";
  const summary = !patron
    ? "No patron selected."
    : loading
      ? "Loading borrowed copies..."
      : error
        ? "Could not load borrowed copies."
        : books.length === 0
          ? `${patronLabel} has no copies out.`
          : [
              `${patronLabel} · ${books.length} ${books.length === 1 ? "copy" : "copies"} out`,
              overdueCount > 0 ? `${overdueCount} overdue` : null,
              blockIneligible && renewableCount < books.length
                ? renewableCount === 0
                  ? "none renewable"
                  : `${renewableCount} renewable`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");

  return (
    <section className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1]">
          <BookMarked className="size-4" />
        </span>
        <Text className="font-[gothamMedium] text-[#003067]">
          Borrowed copies
        </Text>
      </div>

      <div className="space-y-2">
        <div className="flex h-9 items-center gap-2 rounded-md border bg-gray-50 px-3">
          <BookMarked className="size-4 shrink-0 text-gray-400" />
          <span
            className={`truncate font-[gothamLight] text-sm ${
              error
                ? "text-red-600"
                : overdueCount > 0
                  ? "text-red-700"
                  : "text-gray-600"
            }`}
          >
            {summary}
          </span>
        </div>

        <ResultsTable
          columns={COLUMNS}
          placeholder={placeholder}
          selectedRow={
            selected ? (
              <LookupSelectedRow>
                {cells(
                  selected,
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Clear copy"
                    disabled={disabled}
                    onClick={() => copies.select(null)}
                    className="size-7 shrink-0 text-gray-500"
                  >
                    <X className="size-4" />
                  </Button>,
                )}
              </LookupSelectedRow>
            ) : null
          }
        >
          {books.map((row) => (
            <LookupResultRow
              key={row.BorrowID}
              disabled={isBlocked(row)}
              disabledReason={row.IneligibleReason || undefined}
              onSelect={() => copies.select(row)}
            >
              {cells(row)}
            </LookupResultRow>
          ))}
        </ResultsTable>
      </div>
    </section>
  );
}
