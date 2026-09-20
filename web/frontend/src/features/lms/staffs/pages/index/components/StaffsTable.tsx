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
import { CircleCheck, CircleX, CircleMinus, Eye, Loader2 } from "lucide-react";
import type { TableStaff } from "@/features/lms/staffs/pages/index/types/staffs-types";

interface StaffsTableProps {
  staffs: TableStaff[];
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
}

const getRoleIcon = (type: "full" | "partial" | "none") => {
  if (type === "full") return <CircleCheck className="inline text-green-600 mr-1" size={18} />;
  if (type === "partial") return <CircleMinus className="inline text-yellow-500 mr-1" size={18} />;
  return <CircleX className="inline text-red-500 mr-1" size={18} />;
};

const formatRoles = (staff: TableStaff): React.ReactNode[] => {
  const majorRoles: { [key: string]: { actions: string[]; all: string[] } } = {
    Cataloging: { actions: [], all: ["Add", "Edit", "Archive"] },
    "Patron Management": { actions: [], all: ["Add", "Edit", "Archive", "Verify IDs"] },
    Circulation: { actions: [], all: ["Checkin", "Checkout", "Approve renewals"] },
  };

  if (staff.CatalogingAdd) majorRoles.Cataloging.actions.push("Add");
  if (staff.CatalogingEdit) majorRoles.Cataloging.actions.push("Edit");
  if (staff.CatalogingArchive) majorRoles.Cataloging.actions.push("Archive");
  if (staff.PatronAdd) majorRoles["Patron Management"].actions.push("Add");
  if (staff.PatronEdit) majorRoles["Patron Management"].actions.push("Edit");
  if (staff.PatronArchive) majorRoles["Patron Management"].actions.push("Archive");
  if (staff.VerifyIDs) majorRoles["Patron Management"].actions.push("Verify IDs");
  if (staff.Checkin) majorRoles.Circulation.actions.push("Checkin");
  if (staff.Checkout) majorRoles.Circulation.actions.push("Checkout");
  if (staff.ApproveRenewals) majorRoles.Circulation.actions.push("Approve renewals");

  const formatted: React.ReactNode[] = [];

  Object.entries(majorRoles).forEach(([role, data]) => {
    const given = data.actions;
    const all = data.all;
    let iconType: "full" | "partial" | "none" = "none";
    if (given.length === all.length) iconType = "full";
    else if (given.length > 0) iconType = "partial";
    formatted.push(
      <span key={role} className="text-sm">
        {getRoleIcon(iconType)}
        {role} ({given.join(", ") || "No access"})
      </span>
    );
  });

  formatted.push(
    <span key="AnnouncementCreation" className="text-sm">
      {getRoleIcon(staff.AnnouncementCreation ? "full" : "none")}Announcement Creation
    </span>
  );
  formatted.push(
    <span key="ReportGeneration" className="text-sm">
      {getRoleIcon(staff.ReportGeneration ? "full" : "none")}Generate Reports
    </span>
  );
  formatted.push(
    <span key="LiveChat" className="text-sm">
      {getRoleIcon(staff.LiveChat ? "full" : "none")}Chat with Patrons
    </span>
  );

  return formatted;
};

export default function StaffsTable({
  staffs,
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
}: StaffsTableProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-[#128CF1]" />
        </div>
      </div>
    );
  }

  if (staffs.length === 0) {
    return (
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="p-6 text-center text-gray-500">
          No staff found. Try adjusting your filters or search.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white overflow-x-auto mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Staff Code</TableHead>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead className="w-[130px]">Position</TableHead>
              <TableHead className="w-[220px]">Email</TableHead>
              <TableHead className="min-w-[400px]">Roles</TableHead>
              <TableHead className="w-[120px] text-center">Status</TableHead>
              <TableHead className="w-[120px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {staffs.map((staff) => {
              const fullName = `${capitalize(staff.LastName)}, ${capitalize(staff.FirstName)} ${capitalize(staff.MiddleName)} ${capitalize(staff.Suffix)}`;
              const roles = formatRoles(staff);

              return (
                <TableRow key={staff.id} className="even:bg-blue-50 transition-colors duration-200 hover:bg-gray-100">
                  <TableCell className="font-mono text-blue-900 font-bold whitespace-nowrap">
                    {staff.StaffCode || "-"}
                  </TableCell>
                  <TableCell className="truncate max-w-[200px]" title={fullName}>
                    {fullName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{staff.JobTitle}</TableCell>
                  <TableCell className="truncate max-w-[220px]" title={staff.Email || "-"}>
                    {staff.Email || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-4">
                      <div className="w-110 space-y-1">
                        {roles.slice(0, 3).map((role, i) => (
                          <div key={i}>{role}</div>
                        ))}
                      </div>
                      {roles.length > 3 && <div className="w-px bg-gray-300" />}
                      <div className="w-62 space-y-1">
                        {roles.slice(3).map((role, i) => (
                          <div key={i + 3}>{role}</div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {staff.Status === "Archived" ? (
                      <span className="text-red-500">Archived</span>
                    ) : (
                      <span className="text-green-500">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(staff.id)}
                      aria-label={`View ${staff.FirstName} ${staff.LastName}`}
                      className="border-[#003067]/70 text-xs text-[#003067] hover:border-[#003067] hover:bg-[#EAF4FE] hover:text-[#003067]"
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