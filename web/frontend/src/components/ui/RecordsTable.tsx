import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui/Table";

export interface RecordColumn<T> {
  key: string;
  header: string;
  headClassName?: string;
  cellClassName?: string;
  cell: (row: T) => ReactNode;
}

interface RecordsTableProps<T extends { id: string }> {
  rows: T[];
  columns: RecordColumn<T>[];
  loading: boolean;
  errorMessage: string | null;
  emptyMessage: string;
  onRetry: () => void;

  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

const SHELL = "rounded-2xl border shadow-sm overflow-hidden bg-white";

export default function RecordsTable<T extends { id: string }>({
  rows,
  columns,
  loading,
  errorMessage,
  emptyMessage,
  onRetry,
  currentPage,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onGoToPage,
  onNextPage,
  onPrevPage,
}: RecordsTableProps<T>) {
  const isLoading = loading && rows.length === 0;
  const placeholder = isLoading
    ? "loading"
    : errorMessage
      ? "error"
      : rows.length === 0
        ? "empty"
        : null;

  return (
    <>
      <div className={`${SHELL} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.headClassName}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {placeholder ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  {placeholder === "loading" ? (
                    <div className="flex items-center justify-center gap-2 p-10 text-gray-500">
                      <Loader2 className="size-5 animate-spin text-[#128CF1]" />
                      <span className="text-sm">Loading records...</span>
                    </div>
                  ) : placeholder === "error" ? (
                    <div className="flex flex-col items-center gap-3 p-10 text-center">
                      <AlertTriangle className="size-7 text-red-500" />
                      <Text className="text-sm text-gray-600">
                        {errorMessage}
                      </Text>
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        Try again
                      </Button>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-sm text-gray-500">
                      {emptyMessage}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="even:bg-blue-50 transition-colors duration-200 hover:bg-gray-100"
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "align-middle py-3",
                        column.cellClassName,
                      )}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!placeholder && (
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
      )}
    </>
  );
}
