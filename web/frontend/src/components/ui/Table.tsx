import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Input } from "./Input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./Select";
import { useState, useEffect } from "react";

// =============================================
// =============================================

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & {
  containerClassName?: string;
}) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", containerClassName)}
    >
      <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b bg-[#003067] text-white border", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return <tfoot data-slot="table-footer" className={cn("bg-muted/50 border-t font-[gothamMedium] [&>tr]:last:border-b-0", className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn(" data-[state=selected]:bg-muted border-b transition-colors", className)} {...props} />;
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 text-left align-middle font-[gothamMedium] border text-white px-5 whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 px-5 font-[gothamLight] border align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableEmptyRow({
  colSpan,
  className,
  children,
}: {
  colSpan: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className={cn(
          "p-10 text-center text-sm whitespace-normal text-gray-500",
          className
        )}
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("text-muted-foreground mt-4 text-sm", className)} {...props} />;
}

// =============================================
// =============================================

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onGoToPage: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  itemsPerPageOptions?: number[];
  className?: string;
  summary?: React.ReactNode;
}

function TablePagination({
  currentPage,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onGoToPage,
  onPrevPage,
  onNextPage,
  itemsPerPageOptions = [5, 10, 25, 50, 100],
  className,
  summary,
}: TablePaginationProps) {
  const [inputValue, setInputValue] = useState<string>(String(currentPage));

  useEffect(() => {
    setInputValue(String(currentPage));
  }, [currentPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleInputBlur = () => {
    const page = parseInt(inputValue, 10);
    if (inputValue === '') {
      setInputValue(String(currentPage));
      return;
    }
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onGoToPage(page);
    } else {
      setInputValue(String(currentPage));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(inputValue, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        onGoToPage(page);
        setInputValue(String(page));
      } else {
        setInputValue(String(currentPage));
      }
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-2 mt-4 bg-white border rounded-2xl px-3 py-2 shadow-sm sm:gap-3 sm:px-5",
      className
    )}>
      {summary && (
        <>
          <span className="text-xs text-gray-600 font-[gothamLight] sm:text-sm">
            {summary}
          </span>
          <div className="w-px h-5 bg-gray-200 sm:h-6" />
        </>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 font-[gothamLight] sm:text-sm">Show:</span>
        <Select
          value={String(itemsPerPage)}
          onValueChange={(val) => onItemsPerPageChange(Number(val))}
        >
          <SelectTrigger className="h-8 w-[62px] border border-gray-300 rounded-lg text-xs bg-white hover:border-blue-400 transition sm:h-9 sm:w-[72px] sm:text-sm">
            <SelectValue placeholder="10" />
          </SelectTrigger>
          <SelectContent>
            {itemsPerPageOptions.map((num) => (
              <SelectItem key={num} value={String(num)} className="text-sm hover:bg-blue-50">
                {num}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-px h-5 bg-gray-200 sm:h-6" />

      <span className="text-xs text-gray-600 font-[gothamLight] sm:text-sm">
        Page <span className="font-[gothamMedium] text-[#003067]">{currentPage}</span> of <span className="font-[gothamMedium] text-[#003067]">{totalPages}</span>
      </span>

      <div className="w-px h-5 bg-gray-200 sm:h-6" />

      <div className="flex items-center gap-1">
        <Button
          onClick={onPrevPage}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg border-gray-300 text-[#003067] hover:bg-blue-50 hover:border-[#003067] transition disabled:opacity-40 disabled:hover:bg-transparent sm:h-9 sm:w-9"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>

        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="w-11 h-8 text-center text-xs font-[gothamMedium] text-[#003067] border-gray-300 rounded-lg bg-white transition sm:w-14 sm:h-9 sm:text-sm"
        />

        <Button
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg border-gray-300 text-[#003067] hover:bg-blue-50 hover:border-[#003067] transition disabled:opacity-40 disabled:hover:bg-transparent sm:h-9 sm:w-9"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmptyRow,
  TablePagination,
};
