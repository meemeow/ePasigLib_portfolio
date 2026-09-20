import type { StaffFilters, StaffSortState, StaffFiltersPayload, StaffSortPayload } from "@/features/lms/staffs/pages/index/types/staffs-types";

export const capitalize = (str?: string): string => {
  if (!str) return "";
  return str
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
};

export const buildStaffFiltersPayload = (filters: StaffFilters): StaffFiltersPayload => {
  return {
    positions: filters.positions.length > 0 ? filters.positions : undefined,
    roles: filters.roles.length > 0 ? filters.roles : undefined,
    status: filters.status,
  };
};

export const buildStaffSortPayload = (sortBy: StaffSortState): StaffSortPayload => {
  return {
    column: sortBy.column,
    direction: sortBy.direction,
  };
};

export const getActiveStaffFilterCount = (filters: StaffFilters): number => {
  let count = 0;
  if (filters.positions.length > 0) count++;
  if (filters.roles.length > 0) count++;
  if (filters.status !== "All") count++;
  return count;
};

export const getActiveStaffSortCount = (sortBy: StaffSortState): number => {
  let count = 0;
  if (sortBy.column !== "staffCode") count++;
  if (sortBy.direction !== "asc") count++;
  return count;
};