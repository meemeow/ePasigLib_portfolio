import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { RefreshButton } from "@/components/ui/RefreshButton";
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
import { History, RefreshCcw } from "lucide-react";
import type { PatronCheckinEntry } from "@/features/lms/patrons/pages/view-patron/types/patrons-view-types";
import { formatTimestamp as formatDate } from "@/lib/format/date";

interface ViewPatronCheckinHistoryProps {
  history: PatronCheckinEntry[];
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


export default function ViewPatronCheckinHistory({
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
}: ViewPatronCheckinHistoryProps) {
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
                View all checkin history for this patron.
              </Text>
            </div>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className={`hidden md:inline-flex ${COMPACT_CONTROL}`}
            >
              <RefreshCcw
                className={`h-4 w-4 ${
                  loading ? "animate-spin [animation-direction:reverse]" : ""
                }`}
              />
              Refresh
            </Button>
            <RefreshButton
              onClick={onRefresh}
              refreshing={loading}
              className="md:hidden"
              iconClassName="h-4 w-4"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl shadow-sm max-h-[60vh] overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3 py-2 border text-left">Accession</TableHead>
              <TableHead className="px-3 py-2 border text-left">Collection Title</TableHead>
              <TableHead className="px-3 py-2 border text-left">Checked In By</TableHead>
              <TableHead className="px-3 py-2 border text-left">Checkin Date</TableHead>
              <TableHead className="px-3 py-2 border text-left">Violations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableEmptyRow colSpan={5}>No checkin history available</TableEmptyRow>
            ) : (
              history.map((entry, idx) => (
                <TableRow key={idx} className="bg-white">
                  <TableCell className="px-3 py-2 border">{entry.Accession || "-"}</TableCell>
                  <TableCell className="px-3 py-2 border">{entry.CollectionTitle || "-"}</TableCell>
                  <TableCell className="px-3 py-2 border">{entry.ProcessedBy || "-"}</TableCell>
                  <TableCell className="px-3 py-2 border">{formatDate(entry.ProcessedOn)}</TableCell>
                  <TableCell className="px-3 py-2 border">
                    {Array.isArray(entry.Violations) && entry.Violations.length > 0
                      ? entry.Violations.join(", ")
                      : entry.Violations && typeof entry.Violations === "string"
                        ? entry.Violations
                        : "None"}
                  </TableCell>
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
