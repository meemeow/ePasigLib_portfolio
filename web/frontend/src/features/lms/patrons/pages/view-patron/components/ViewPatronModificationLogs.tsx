import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { History, RefreshCcw } from "lucide-react";
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
import type { PatronLogEntry } from "@/features/lms/patrons/pages/view-patron/types/patrons-view-types";
import { Text } from "@/components/ui/Text";
import { formatTimestamp as formatDate } from "@/lib/format/date";

interface ViewPatronModificationLogsProps {
  logs: PatronLogEntry[];
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


export default function ViewPatronModificationLogs({
  logs,
  loading,
  onRefresh,
  currentPage,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onGoToPage,
  onNextPage,
  onPrevPage,
}: ViewPatronModificationLogsProps) {
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
                Modification Logs
              </Text>
              <Text className="text-xs md:text-sm text-gray-500">
                View all modification history and changes made to this patron's
                account.
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
              <TableHead className="px-3 py-2 border text-left">#</TableHead>
              <TableHead className="px-3 py-2 border text-left">Action</TableHead>
              <TableHead className="px-3 py-2 border text-left">Target Name</TableHead>
              <TableHead className="px-3 py-2 border text-left">Description</TableHead>
              <TableHead className="px-3 py-2 border text-left">By</TableHead>
              <TableHead className="px-3 py-2 border text-left">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableEmptyRow colSpan={6}>No modification logs available</TableEmptyRow>
            ) : (
              logs.map((log, idx) => (
                <TableRow key={idx} className="bg-white">
                  <TableCell className="px-3 py-2 border">{logs.length - idx}</TableCell>
                  <TableCell className="px-3 py-2 border">{log.Action}</TableCell>
                  <TableCell className="px-3 py-2 border">{log.TargetName}</TableCell>
                  <TableCell className="px-3 py-2 border">{log.Description}</TableCell>
                  <TableCell className="px-3 py-2 border">{log.By}</TableCell>
                  <TableCell className="px-3 py-2 border">{formatDate(log.On)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {logs.length > 0 && (
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
