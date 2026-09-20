export type ProfileTab = "home" | "roles" | "modification_logs";

export interface ProfileData {
  UID?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Suffix?: string;
  Email?: string;
  PhoneNumber?: string;
  City?: string;
  Barangay?: string;
  BirthDate?: string;
  Sex?: string;
  Avatar?: string;
  JobTitle?: string;
  State?: string;
  Status?: string;
  StaffCode?: string;
}

export interface ProfileEditableFields {
  PhoneNumber: string;
  City: string;
  Barangay: string;
}

export type ProfileFieldErrors = {
  [K in keyof ProfileEditableFields]?: string;
};

export interface ModificationLog {
  Action: string;
  TargetName: string;
  Description: string;
  By?: string;
  On?: number | string | null;
}

export type OwnStaffModificationLogsResponse =
  | ModificationLog[]
  | { data: ModificationLog[] };

export interface OwnProfileEditRequest {
  case: "editOwnProfile";
  profileData: ProfileEditableFields;
}

export interface AvatarUploadRequest {
  case: "uploadAvatar";
  imageData: string;
}

export interface OwnProfileResponse {
  success: boolean;
  message?: string;
}

export interface UploadResponse {
  success: boolean;
  url: string;
}

export interface ProfileResult {
  ok: boolean;
  message: string;
  fieldErrors?: ProfileFieldErrors;
}
