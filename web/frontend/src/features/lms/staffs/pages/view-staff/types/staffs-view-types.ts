import type { StaffPermissionKey, StaffRoleKey } from "@/lib/auth/auth-types";

export type StaffRoleKeys = StaffRoleKey;
export type StaffPermissionKeys = StaffPermissionKey;

export type StaffRoleFlags = Record<StaffRoleKey, boolean>;

export interface StaffBase {
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  Suffix?: string;
  City: string;
  Barangay: string;
  PhoneNumber: string;
  BirthDate: string;
  Sex: string;
  Email: string;
  JobTitle: string;
  Status?: string;
}

export interface StaffDoc extends StaffBase, StaffRoleFlags {
  UID: string;
}

export type StaffFormData = StaffDoc;

export interface StaffLogEntry {
  Action: string;
  TargetName: string;
  Description: string;
  By: string;
  On: number | null;
}

export interface StaffLogs {
  modificationLogs: StaffLogEntry[];
}

export interface StaffDataResponse {
  id: string;
  UID?: string;
  FirstName?: string;
  LastName?: string;
  MiddleName?: string;
  Suffix?: string;
  Email?: string;
  PhoneNumber?: string;
  BirthDate?: string;
  Sex?: string;
  City?: string;
  Barangay?: string;
  JobTitle?: string;
  Status?: string;
  [key: string]: unknown;
}

export interface StaffEditRequest {
  case: "editStaffInformation";
  targetUID: string;
  profileData: Record<string, unknown>;
}

export interface StaffArchiveRequest {
  case: "staffArchiveUnarchive";
  targetUID: string;
  action: "archive" | "unarchive";
}

export interface StaffEmailVerificationRequest {
  uid: string;
  newEmail: string;
}

export interface CallableSuccessResponse {
  success: boolean;
  message?: string;
}

export interface StaffViewResult {
  ok: boolean;
  message: string;
}

export type StaffsViewTab = "home" | "modification_logs";
