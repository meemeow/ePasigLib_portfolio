export const STAFF_EDITABLE_FIELDS = [
  "FirstName",
  "MiddleName",
  "LastName",
  "Suffix",
  "City",
  "Barangay",
  "PhoneNumber",
  "BirthDate",
  "Sex",
  "JobTitle",
] as const;

export const PATRON_EDITABLE_FIELDS = [
  "FirstName",
  "MiddleName",
  "LastName",
  "Suffix",
  "City",
  "Barangay",
  "PhoneNumber",
  "BirthDate",
  "Sex",
  "SchoolWork",
] as const;

export const OWN_PROFILE_EDITABLE_FIELDS = [
  "PhoneNumber",
  "City",
  "Barangay",
] as const;

export const OWN_PATRON_EDITABLE_FIELDS = [
  ...OWN_PROFILE_EDITABLE_FIELDS,
  "SchoolWork",
] as const;

export type ProfileFieldValues = Record<string, unknown>;

export interface StaffEditPayload {
  targetUID: string;
  profileData: ProfileFieldValues;
}

export interface StaffArchivePayload {
  targetUID: string;
  action: "archive" | "unarchive";
}

export interface StaffEditResponse {
  success: boolean;
  message?: string;
}

export interface ArchiveResult {
  targetUID: string;
  previousStatus: string;
  newStatus: string;
}

export interface StaffArchiveResponse {
  success: boolean;
  message?: string;
  data?: ArchiveResult;
}

export interface PatronEditPayload {
  targetUID: string;
  profileData: ProfileFieldValues;
}

export interface PatronArchivePayload {
  targetUID: string;
  action: "archive" | "unarchive";
}

export interface PatronEditResponse {
  success: boolean;
  message?: string;
}

export interface PatronArchiveResponse {
  success: boolean;
  message?: string;
  data?: ArchiveResult;
}

export interface VerifyPatronPayload {
  action: "approve" | "reject";
  targetUID: string;
  remarks: string;
}

export interface VerifyPatronResponse {
  status: string;
  case: string;
  success: boolean;
  newState: string;
}

export interface OwnProfilePayload {
  profileData: ProfileFieldValues;
}

export interface OwnProfileResponse {
  success: boolean;
  message?: string;
}

export interface ProfileUploadPayload {
  imageData: string;
}

export interface ProfileUploadResponse {
  success: boolean;
  url: string;
}
