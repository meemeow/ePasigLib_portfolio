import { PERMISSION_FIELDS } from "../../config/constants";
import type { TableStaff } from "../lms/reads/fetching-types";

/** Admins hold every permission; everyone else holds what the payload grants. */
export function resolveStaffPermissions(
  input: Record<string, unknown>,
  jobTitle: string,
): Record<string, boolean> {
  const isAdmin = jobTitle === "Admin";
  return PERMISSION_FIELDS.reduce<Record<string, boolean>>((acc, field) => {
    acc[field] = isAdmin ? true : input[field] === true;
    return acc;
  }, {});
}

/** Permission flags grouped back into the role names the staff table shows. */
export function deriveGrantedRolesFromTable(staff: TableStaff): string[] {
  const held = (fields: string[]) =>
    fields.filter((field) => (staff as any)[field]).length;

  const granted: string[] = [];
  const group = (label: string, fields: string[]) => {
    const count = held(fields);
    if (count === fields.length) granted.push(label);
    else if (count > 0) granted.push(`${label} (Partial)`);
  };

  group("Cataloging", ["CatalogingAdd", "CatalogingEdit", "CatalogingArchive"]);
  group("Patron Management", [
    "PatronAdd",
    "PatronEdit",
    "PatronArchive",
    "VerifyIDs",
  ]);
  group("Circulation", ["Checkin", "Checkout", "ApproveRenewals"]);

  if (staff.AnnouncementCreation) granted.push("Announcement Creation");
  if (staff.ReportGeneration) granted.push("Generate Reports");
  if (staff.LiveChat) granted.push("Chat with Patrons");

  return granted;
}
