import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
} from "@/components/ui/Table";
import { Text } from "@/components/ui/Text";
import { History, Loader2, RefreshCcw } from "lucide-react";
import { formatTimestamp } from "@/lib/format/date";
import type { CheckinHistory } from "@/features/lms/collections/pages/view-collection/types/collections-view-types";

interface ViewCollectionCheckinHistoryProps {
  history: CheckinHistory[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export default function ViewCollectionCheckinHistory({
  history,
  loading,
  onRefresh,
  currentPage,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onGoToPage,
  onNextPage,
  onPrevPage,
}: ViewCollectionCheckinHistoryProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 mb-6">
        <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
          <History className="size-4 md:size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                CheckIn History
              </Text>
              <Text className="text-xs md:text-sm text-gray-500">
                View all checkin history for this collection.
              </Text>
            </div>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className={`hidden md:inline-flex ${COMPACT_CONTROL}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Refresh
                </span>
              ) : (
                "Refresh"
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden h-7 w-7 shrink-0"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl shadow-sm max-h-[60vh] overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3 py-2 border text-left">Accession</TableHead>
              <TableHead className="px-3 py-2 border text-left">Full Name</TableHead>
              <TableHead className="px-3 py-2 border text-left">Checked In By</TableHead>
              <TableHead className="px-3 py-2 border text-left">Check In Date</TableHead>
              <TableHead className="px-3 py-2 border text-left">Violations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && history.length === 0 ? (
              <TableEmptyRow colSpan={5}>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#128CF1]" />
              </TableEmptyRow>
            ) : history.length === 0 ? (
              <TableEmptyRow colSpan={5}>No checkin history available</TableEmptyRow>
            ) : (
              history.map((entry, idx) => (
                <TableRow key={entry.id ?? idx} className="bg-white">
                  <TableCell className="px-3 py-2 border">{entry.Accession || "-"}</TableCell>
                  <TableCell className="px-3 py-2 border">{entry.FullName || "-"}</TableCell>
                  <TableCell className="px-3 py-2 border">{entry.CheckedInBy || "-"}</TableCell>
                  <TableCell className="px-3 py-2 border">{formatTimestamp(entry.CheckInDate)}</TableCell>
                  <TableCell className="px-3 py-2 border">{entry.Violations || "None"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {history.length > 0 && (
        <div className="flex justify-center items-center">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={onItemsPerPageChange}
            onGoToPage={onGoToPage}
            onPrevPage={onPrevPage}
            onNextPage={onNextPage}
          />
        </div>
      )}
    </div>
  );
}
