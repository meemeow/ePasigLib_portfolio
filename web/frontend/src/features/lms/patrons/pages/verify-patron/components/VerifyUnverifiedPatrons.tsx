import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
} from "@/components/ui/Table";
import { Text } from "@/components/ui/Text";
import type { VerifyPatron } from "@/features/lms/patrons/pages/verify-patron/types/patrons-verify-types";
import { toTitleCase } from "@/lib/format/name";
import { RefreshCcw } from "lucide-react";

interface VerifyUnverifiedPatronsProps {
  patrons: VerifyPatron[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onView: (patron: VerifyPatron) => void;
}

export default function VerifyUnverifiedPatrons({
  patrons,
  loading,
  onRefresh,
  currentPage,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onGoToPage,
  onNextPage,
  onPrevPage,
  onView,
}: VerifyUnverifiedPatronsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 mb-6">
        <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
          <Users className="size-4 md:size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                Unverified Patrons
              </Text>
              <Text className="text-xs md:text-sm text-gray-500">
                View all patrons waiting for verification. Click "View" to
                review and verify each account.
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

      {patrons.length === 0 ? (
        <div className="text-center py-10">
          <Text className="text-gray-500">No unverified patrons found.</Text>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl shadow-sm max-h-[60vh] overflow-y-auto bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-2 border text-left">
                    Name
                  </TableHead>
                  <TableHead className="px-3 py-2 border text-left">
                    Barangay
                  </TableHead>
                  <TableHead className="px-3 py-2 border text-left">
                    Email
                  </TableHead>
                  <TableHead className="px-3 py-2 border text-left">
                    Education/Work
                  </TableHead>
                  <TableHead className="px-3 py-2 border text-left">
                    State
                  </TableHead>
                  <TableHead className="px-3 py-2 border text-left">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patrons.map((patron) => {
                  const fullName =
                    `${toTitleCase(patron.LastName)}, ${toTitleCase(patron.FirstName)} ${toTitleCase(patron.MiddleName)} ${toTitleCase(patron.Suffix)}`.trim();
                  return (
                    <TableRow
                      key={patron.id}
                      className="bg-white hover:bg-gray-50 transition"
                    >
                      <TableCell
                        className="px-3 py-2 border truncate max-w-[170px]"
                        title={fullName}
                      >
                        {fullName}
                      </TableCell>
                      <TableCell className="px-3 py-2 border">
                        {toTitleCase(patron.Barangay)}
                      </TableCell>
                      <TableCell
                        className="px-3 py-2 border truncate max-w-[190px]"
                        title={patron.Email || "-"}
                      >
                        {patron.Email || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2 border">
                        {patron.SchoolWork || "N/A"}
                      </TableCell>
                      <TableCell className="px-3 py-2 border">
                        <span className="text-red-500 font-semibold">
                          Unverified
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2 border">
                        <Button
                          variant="link"
                          onClick={() => onView(patron)}
                          className={`text-[#128CF1] hover:underline p-0 h-auto ${COMPACT_CONTROL}`}
                        >
                          View
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
      )}
    </div>
  );
}
