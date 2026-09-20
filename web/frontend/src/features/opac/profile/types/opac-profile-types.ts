export type ProfileTab = "home" | "id_verification" | "visit_logs";

export interface ProfileData {
  UID?: string;
  PublicUID?: string;
  Role?: string;
  State?: string;
  Status?: string;
  ID?: string;
  Avatar?: string;
  Email?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Suffix?: string;
  PhoneNumber?: string;
  City?: string;
  Barangay?: string;
  BirthDate?: string;
  Sex?: string;
  SchoolWork?: string;
}

export interface ProfileEditableFields {
  PhoneNumber: string;
  City: string;
  Barangay: string;
  SchoolWork: string;
}

export type ProfileFieldErrors = {
  [K in keyof ProfileEditableFields]?: string;
};

export interface VisitLog {
  date: string;
  timeIn: string;
  timeOut: string;
}

export type PatronVisitsResponse = VisitLog[] | { data: VisitLog[] };

export interface OwnProfileEditRequest {
  case: "editOwnProfile";
  profileData: ProfileEditableFields;
}

export interface AvatarUploadRequest {
  case: "uploadAvatar";
  imageData: string;
}

export interface PatronIDUploadRequest {
  case: "uploadPatronID";
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
