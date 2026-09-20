export interface PatronRecord {
  id: string;
  UID: string;
  PublicUID?: string;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  Suffix?: string;
  Email: string;
  PhoneNumber: string;
  SchoolWork?: string;
  City: string;
  Barangay: string;
  State?: string;
  Sex: string;
  BirthDate: string;
  Status?: string;
  Avatar?: string;
  ID?: string;
}

export type PatronViewTab =
  | "home"
  | "modification_logs"
  | "checkout_history"
  | "checkin_history";

export type PatronFormData = PatronRecord;

export interface PatronLogEntry {
  Action: string;
  TargetName: string;
  Description: string;
  By: string;
  On: number | null;
  id?: string;
}

export interface PatronCheckoutEntry {
  Accession: string;
  CollectionTitle: string;
  ProcessedBy: string;
  ProcessedOn: number | null;
  DueDate: number | null;
  TargetUID: string;
  Status: string;
  id?: string;
}

export interface PatronCheckinEntry {
  Accession: string;
  CollectionTitle: string;
  ProcessedBy: string;
  ProcessedOn: number | null;
  TargetUID: string;
  Violations: string[] | string;
  id?: string;
}

export interface PatronLogs {
  modificationLogs: PatronLogEntry[];
  checkoutHistory: PatronCheckoutEntry[];
  checkinHistory: PatronCheckinEntry[];
}

export interface PatronDataResponse {
  id: string;
  UID?: string;
  PublicUID?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Suffix?: string;
  Email?: string;
  PhoneNumber?: string;
  BirthDate?: string;
  Sex?: string;
  City?: string;
  Barangay?: string;
  SchoolWork?: string;
  State?: string;
  Status?: string;
  Avatar?: string;
  ID?: string;
  [key: string]: unknown;
}

export interface PatronEditRequest {
  case: "editPatronInformation";
  targetUID: string;
  profileData: Record<string, unknown>;
}

export interface PatronArchiveRequest {
  case: "patronArchiveUnarchive";
  targetUID: string;
  action: "archive" | "unarchive";
}

export interface PatronEmailVerificationRequest {
  uid: string;
  newEmail: string;
}

export interface CallableSuccessResponse {
  success: boolean;
  message?: string;
}

export interface PatronViewResult {
  ok: boolean;
  message: string;
}

export type TimestampLike =
  | {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    }
  | number
  | string
  | null
  | undefined;
