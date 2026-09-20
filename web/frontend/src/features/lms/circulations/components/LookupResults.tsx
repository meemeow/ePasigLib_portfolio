import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

const TABLE_HEIGHT = "h-[332.5px]";

const BODY_HEIGHT = "h-[291.5px]";

interface LookupResultsProps {
  columns: string[];
  query: string;
  searching: boolean;
  error: string | null;
  count: number;
  hint: string;
  noun: string;
  selectedRow?: ReactNode;
  children: ReactNode;
}

export default function LookupResults({
  columns,
  query,
  searching,
  error,
  count,
  hint,
  noun,
  selectedRow,
  children,
}: LookupResultsProps) {
  const term = query.trim();

  const placeholder: ReactNode = selectedRow ? null : searching ? (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="size-4 animate-spin text-[#128CF1]" />
      Searching...
    </span>
  ) : error ? (
    <span className="text-red-600">{error}</span>
  ) : term === "" ? (
    hint
  ) : count === 0 ? (
    `No ${noun} matches “${term}”.`
  ) : null;

  return (
    <ResultsTable
      columns={columns}
      placeholder={placeholder}
      selectedRow={selectedRow}
    >
      {children}
    </ResultsTable>
  );
}

export function ResultsTable({
  columns,
  placeholder,
  selectedRow,
  children,
}: {
  columns: string[];
  placeholder?: ReactNode;
  selectedRow?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Table
      containerClassName={`${TABLE_HEIGHT} overflow-y-auto rounded-xl border`}
      className="table-fixed min-w-[520px]"
    >
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead
              key={column}
              style={{
                width: index === 0 ? "50%" : `${50 / (columns.length - 1)}%`,
              }}
              className="sticky top-0 z-10 bg-[#003067] text-xs"
            >
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {selectedRow ??
          (placeholder ? (
            <TableEmptyRow
              colSpan={columns.length}
              className={`${BODY_HEIGHT} p-8`}
            >
              {placeholder}
            </TableEmptyRow>
          ) : (
            children
          ))}
      </TableBody>
    </Table>
  );
}

export function LookupSelectedRow({ children }: { children: ReactNode }) {
  return (
    <TableRow
      aria-selected
      className="h-[53px] bg-[#EAF4FE] hover:bg-[#EAF4FE]"
    >
      {children}
    </TableRow>
  );
}

export function LookupResultRow({
  onSelect,
  disabled,
  disabledReason,
  children,
}: {
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
  children: ReactNode;
}) {
  return (
    <TableRow
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? undefined : 0}
      title={disabled ? disabledReason : undefined}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      }}
      className={
        disabled
          ? "h-[53px] cursor-not-allowed bg-gray-50/60"
          : "h-[53px] cursor-pointer hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
      }
    >
      {children}
    </TableRow>
  );
}
