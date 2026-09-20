import * as admin from "firebase-admin";

// =====================================================================
// || Registration flows                                              ||
// ||                                                                 ||
// || "patron-self"  public sign-up form, ID still needs verifying    ||
// || "patron-lms"   staff registers a patron in person (PatronAdd)   ||
// || "staff-lms"    staff registers another staff member (StaffAdd)  ||
// =====================================================================

export type RegistrationFlow = "patron-self" | "patron-lms" | "staff-lms";

export interface ActorIdentity {
  authUid: string;
  publicUID: string;
  fullName: string;
  firstName: string;
  lastName: string;
}

// =====================================================================
// || What a client is allowed to send                                ||
// ||                                                                 ||
// || Anything derived (UID, PublicUID, StaffCode, Role, State,       ||
// || Status, CreatedBy, CreatedOn) is owned by the backend and is    ||
// || deliberately absent here.                                       ||
// =====================================================================

export interface PatronRegistrationInput {
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  Suffix?: string;
  Email: string;
  Password: string;
  PhoneNumber: string;
  BirthDate: string;
  Sex: string;
  City: string;
  Barangay: string;
  SchoolWork: string;
  Avatar?: string;
}

export interface StaffRegistrationInput {
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  Suffix?: string;
  Email: string;
  Password: string;
  PhoneNumber: string;
  BirthDate: string;
  Sex: string;
  City: string;
  Barangay: string;
  JobTitle: string;
  [permission: string]: unknown;
}

// =====================================================================
// || Pending registration token                                      ||
// ||                                                                 ||
// || Stored at email_verifications/{token}. The password lives in    ||
// || Firebase Auth (hashed) under `authUid` and never lands here.    ||
// =====================================================================

export interface PendingRegistration {
  flow: RegistrationFlow;
  email: string;
  authUid: string;
  profile: Record<string, unknown>;
  createdByUID: string;
  createdByName: string;
  staffCode?: string;
  expiresAt: number;
  createdOn: number;
  token: string;
}

// =====================================================================
// || Stored records (shape of an existing patrons/staffs document)   ||
// =====================================================================

export interface PatronUserData {
  FirstName: string;
  LastName: string;
  MiddleName?: string;
  Suffix?: string;
  Email: string;
  PhoneNumber: string;
  BirthDate: string;
  Sex?: string;
  City: string;
  Barangay: string;
  SchoolWork: string;
  State?: string;
  Status?: string;
  Role?: string;
  UID: string;
  PublicUID?: string;
  CreatedOn: admin.firestore.Timestamp | string;
  CreatedBy: string;
  [key: string]: unknown;
}

export interface StaffUserData {
  FirstName: string;
  LastName: string;
  MiddleName?: string;
  Suffix?: string;
  Email: string;
  PhoneNumber: string;
  BirthDate: string;
  Sex?: string;
  City: string;
  Barangay: string;
  JobTitle: string;
  Position?: string;
  StaffCode?: string;
  Status?: string;
  Role?: string;
  UID: string;
  CreatedBy: string;
  CreatedOn: admin.firestore.Timestamp | string;
  [key: string]: unknown;
}

// =====================================================================
// || Email-change tokens                                             ||
// =====================================================================

export interface UpdatedEmailData {
  UID: string;
  oldEmail: string | null;
  patronPublicUID: string | null;
  patronName: string;
  staffPublicUID: string | null;
  staffFirstName: string | null;
  staffLastName: string | null;
}

export interface UpdatedStaffEmailData {
  UID: string;
  oldEmail: string | null;
  staffPublicUID: string | null;
  staffName: string;
  callerPublicUID: string | null;
  callerFirstName: string | null;
  callerLastName: string | null;
}

export interface EmailUpdateToken<T> {
  email: string;
  userData: T;
  expiresAt: number;
  createdOn?: number;
  token?: string;
  source?: string;
}

// =====================================================================
// || Log payloads                                                    ||
// ||                                                                 ||
// || Owned by modules/lms/writes/writing-types.ts, next to           ||
// || the writers that destructure them. Re-exported here so the auth ||
// || flows keep importing their types from one place.                ||
// =====================================================================

export type {
  RegistrationLogData as LogData,
  EditLogData,
  ArchiveLogData,
  VerifyLogData,
} from "../lms/writes/writing-types";

// =====================================================================
// || Password reset                                                  ||
// ||                                                                 ||
// || Stored at password_resets/{sha256(email)}. The code itself is    ||
// || never persisted — only a salted hash — and the document holds no ||
// || email address, so the collection is not a list of who asked for  ||
// || a reset.                                                        ||
// =====================================================================

export interface PasswordResetData {
  uid: string;
  codeHash: string;
  salt: string;
  attempts: number;
  expiresAt: number;
  createdOn: number;
}

export type PasswordResetCheck =
  | { status: "ok"; uid: string }
  | { status: "not-found" }
  | { status: "expired" }
  | { status: "locked" }
  | { status: "invalid"; attemptsRemaining: number };

// =====================================================================
// || Login                                                           ||
// =====================================================================

export interface LoginAttemptInput {
  email: string;
  success: boolean;
  errorMessage?: string | null;
  userType?: "Patron" | "Staff" | null;
}

export interface UserData {
  UID?: string;
  FirstName?: string;
  LastName?: string;
  [key: string]: unknown;
}
