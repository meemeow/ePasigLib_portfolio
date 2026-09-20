export interface VerifyPatron {
  id: string;
  Avatar: string;
  ID: string;
  CreatedBy: string;
  CreatedOn: number | null;
  Role: string;
  reverificationAt: number | string;
  BirthDate: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
  Email: string;
  PhoneNumber: string;
  SchoolWork: string;
  City: string;
  Barangay: string;
  State: string;
  Sex: string;
  UID: string;
  PublicUID: string;
  Status: string;
  LastBorrowedDate: number | null;
}

export type VerifyAction = "approve" | "reject";

export type UnverifiedPatronsResponse =
  | VerifyPatron[]
  | { data: VerifyPatron[] };

export interface VerifyPatronRequest {
  case: "verifyUnverifiedPatrons";
  action: VerifyAction;
  targetUID: string;
  remarks: string;
}

export interface VerifyPatronResponse {
  status: string;
  case: string;
  success: boolean;
  newState: string;
}

export interface VerifyPatronFieldErrors {
  remarks?: string;
  action?: string;
  form?: string;
}

export interface VerifyPatronResult {
  ok: boolean;
  message: string;
  fieldErrors?: VerifyPatronFieldErrors;
}
