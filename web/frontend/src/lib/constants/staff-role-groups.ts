import type { ComponentType } from "react";
import { FileText, Megaphone, RefreshCw, Users } from "lucide-react";
import type { StaffPermissionKey } from "@/lib/auth/auth-types";

export interface StaffRoleGroup {
  label: string;
  icon: ComponentType<{ className?: string }>;
  permissions: StaffPermissionKey[];
}

export const STAFF_ROLE_GROUPS: StaffRoleGroup[] = [
  {
    label: "Cataloging",
    icon: FileText,
    permissions: ["CatalogingAdd", "CatalogingEdit", "CatalogingArchive"],
  },
  {
    label: "Circulation",
    icon: RefreshCw,
    permissions: ["Checkout", "Checkin", "ApproveRenewals"],
  },
  {
    label: "Patron Management",
    icon: Users,
    permissions: ["PatronAdd", "PatronEdit", "PatronArchive", "VerifyIDs"],
  },
  {
    label: "Help & Updates",
    icon: Megaphone,
    permissions: ["AnnouncementCreation", "ReportGeneration", "LiveChat"],
  },
];

export function formatPermissionLabel(permission: string): string {
  return permission
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bI Ds\b/, "IDs");
}
