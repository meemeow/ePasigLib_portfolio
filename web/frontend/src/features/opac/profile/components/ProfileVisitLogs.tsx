import { CalendarClock, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
} from "@/components/ui/Table";
import type { VisitLog } from "@/features/opac/profile/types/opac-profile-types";

interface ProfileVisitLogsProps {
  logs: VisitLog[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onRefresh: () => void;
  onItemsPerPageChange: (value: number) => void;
  onGoToPage: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function ProfileVisitLogs({
  logs,
  loading,
  currentPage,
  totalPages,
  itemsPerPage,
  onRefresh,
  onItemsPerPageChange,
  onGoToPage,
  onPrevPage,
  onNextPage,
}: ProfileVisitLogsProps) {
  return (
    <div className="space-y-2">
      <div className="mb-6 flex items-start gap-3">
        <div className="my-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:h-10 md:w-10">
          <CalendarClock className="size-4 md:size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Text className="font-[gothamMedium] text-base text-[#003067] md:text-lg">
                Visit Logs
              </Text>
              <Text className="text-xs text-gray-500 md:text-sm">
                Every time you checked in and out of the library.
              </Text>
            </div>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="hidden md:inline-flex"
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
              className="h-7 w-7 shrink-0 md:hidden"
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

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#128CF1]" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-10 text-center">
          <Text className="text-gray-500">No visit logs available</Text>
        </div>
      ) : (
        <>
          <div className="max-h-[60vh] overflow-x-auto overflow-y-auto rounded-2xl bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="border px-3 py-2 text-left">#</TableHead>
                  <TableHead className="border px-3 py-2 text-left">
                    Date
                  </TableHead>
                  <TableHead className="border px-3 py-2 text-left">
                    Time In
                  </TableHead>
                  <TableHead className="border px-3 py-2 text-left">
                    Time Out
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow
                    key={`${log.date}-${log.timeIn}-${index}`}
                    className="bg-white"
                  >
                    <TableCell className="border px-3 py-2">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="border px-3 py-2">
                      {log.date}
                    </TableCell>
                    <TableCell className="border px-3 py-2">
                      {log.timeIn}
                    </TableCell>
                    <TableCell className="border px-3 py-2">
                      {log.timeOut}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-center">
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
        </>
      )}
    </div>
  );
}
