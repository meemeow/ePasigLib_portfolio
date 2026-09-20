import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Eye, Loader2 } from "lucide-react";
import type { TablePatron } from "@/features/lms/patrons/pages/index/types/patrons-types";

interface PatronsTableProps {
  patrons: TablePatron[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onView: (id: string) => void;
  capitalize: (str?: string) => string;
  formatTimestamp: (ts?: number | null) => string;
}

export default function PatronsTable({
  patrons,
  loading,
  currentPage,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onGoToPage,
  onNextPage,
  onPrevPage,
  onView,
  capitalize,
  formatTimestamp,
}: PatronsTableProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-[#128CF1]" />
        </div>
      </div>
    );
  }

  if (patrons.length === 0) {
    return (
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="p-6 text-center text-gray-500">
          No patrons found. Try adjusting your filters or search.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white max-h-[600px] overflow-y-auto mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Patron UID</TableHead>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead className="w-[100px]">State</TableHead>
              <TableHead className="w-[150px]">Barangay</TableHead>
              <TableHead className="w-[200px]">Email</TableHead>
              <TableHead className="w-[170px]">Last Borrowed Date</TableHead>
              <TableHead className="w-[140px]">Education/Work Status</TableHead>
              <TableHead className="w-[100px] text-center">Status</TableHead>
              <TableHead className="w-[140px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {patrons.map((p) => {
              const fullName =
                `${capitalize(p.LastName)}, ${capitalize(p.FirstName)} ${capitalize(p.MiddleName)} ${capitalize(p.Suffix)}`.trim();

              return (
                <TableRow
                  key={p.id}
                  className="even:bg-blue-50 transition-colors duration-200 hover:bg-gray-100"
                >
                  <TableCell
                    className="truncate whitespace-nowrap"
                    title={p.PublicUID || "-"}
                  >
                    {p.PublicUID || "-"}
                  </TableCell>
                  <TableCell
                    className="truncate whitespace-nowrap"
                    title={fullName}
                  >
                    {fullName}
                  </TableCell>
                  <TableCell className="truncate whitespace-nowrap">
                    {p.State || "N/A"}
                  </TableCell>
                  <TableCell className="truncate whitespace-nowrap">
                    {capitalize(p.Barangay)}
                  </TableCell>
                  <TableCell
                    className="truncate whitespace-nowrap"
                    title={p.Email || "-"}
                  >
                    {p.Email || "-"}
                  </TableCell>
                  <TableCell className="truncate whitespace-nowrap">
                    {formatTimestamp(p.LastBorrowedDate)}
                  </TableCell>
                  <TableCell className="truncate whitespace-nowrap">
                    {p.SchoolWork || "N/A"}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.Status === "Archived" ? (
                      <span className="text-red-500">Archived</span>
                    ) : (
                      <span className="text-green-500">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(p.id)}
                      aria-label={`View ${p.FirstName} ${p.LastName}`}
                      className="border-[#003067]/50 text-xs text-[#003067] hover:border-[#003067] hover:bg-[#EAF4FE] hover:text-[#003067]"
                    >
                      <Eye className="size-3.5" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

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
    </>
  );
}