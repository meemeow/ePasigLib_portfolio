import type { LoginData } from "@/features/auth/login/types/login-types";
import type { User } from "firebase/auth";

export type AuthUserType = "Staff" | "Patron";

export const DEFAULT_AVATAR = "/assets/images/default_avatar.jpg";

export interface StaffRoles {
  CatalogingAdd: boolean;
  CatalogingEdit: boolean;
  CatalogingArchive: boolean;
  PatronAdd: boolean;
  PatronEdit: boolean;
  PatronArchive: boolean;
  VerifyIDs: boolean;
  StaffAdd: boolean;
  StaffEdit: boolean;
  StaffArchive: boolean;
  Checkout: boolean;
  Checkin: boolean;
  ApproveRenewals: boolean;
  AnnouncementCreation: boolean;
  ReportGeneration: boolean;
  LiveChat: boolean;
}

export type StaffRoleKey = keyof StaffRoles;

export const STAFF_ROLE_KEYS: readonly StaffRoleKey[] = [
  "CatalogingAdd",
  "CatalogingEdit",
  "CatalogingArchive",
  "PatronAdd",
  "PatronEdit",
  "PatronArchive",
  "VerifyIDs",
  "StaffAdd",
  "StaffEdit",
  "StaffArchive",
  "Checkout",
  "Checkin",
  "ApproveRenewals",
  "AnnouncementCreation",
  "ReportGeneration",
  "LiveChat",
] as const;

export type StaffPermissionKey = Exclude<
  StaffRoleKey,
  "StaffAdd" | "StaffEdit" | "StaffArchive"
>;

export const STAFF_PERMISSION_KEYS: readonly StaffPermissionKey[] = [
  "CatalogingAdd",
  "CatalogingEdit",
  "CatalogingArchive",
  "PatronAdd",
  "PatronEdit",
  "PatronArchive",
  "VerifyIDs",
  "Checkout",
  "Checkin",
  "ApproveRenewals",
  "AnnouncementCreation",
  "ReportGeneration",
  "LiveChat",
] as const;

export interface UserProfile {
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  UID: string;
  publicUID: string;
  email: string;
  avatar: string;
  phoneNumber: string;
  City: string;
  barangay: string;
  birthDate: string;
  sex: string;
  staffCode: string;
  jobTitle: string;
  state: string;
  status: string;
  schoolWork: string;
  ID: string;
}

export interface ProfilePayload {
  FirstName?: string;
  LastName?: string;
  MiddleName?: string;
  Suffix?: string;
  UID?: string;
  PublicUID?: string;
  Email?: string;
  Avatar?: string;
  PhoneNumber?: string;
  City?: string;
  Barangay?: string;
  BirthDate?: string;
  Sex?: string;
  StaffCode?: string;
  JobTitle?: string;
  State?: string;
  Status?: string;
  SchoolWork?: string;
  ID?: string;
}

export interface LoggedInProfileResponse {
  userType?: AuthUserType;
  profile?: ProfilePayload;
  roles?: Partial<StaffRoles> | null;
}

export interface AuthContextType {
  user: User | null;
  userType: AuthUserType | null;
  staffRoles: StaffRoles | null;
  profile: UserProfile | null;
  staffCode: string | null;
  login: (data: LoginData) => Promise<{ uid: string; userType: AuthUserType }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
}
