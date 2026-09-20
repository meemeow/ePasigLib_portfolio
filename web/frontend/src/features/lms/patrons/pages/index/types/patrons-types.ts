export interface Patron {
  id: string;
  CreatedOn?: number | null;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Suffix?: string;
  Email?: string;
  PhoneNumber?: string;
  SchoolWork?: string;
  City?: string;
  Barangay?: string;
  State?: string;
  Sex?: string;
  UID?: string;
  PublicUID?: string;
  Status?: string;
  LastBorrowedDate?: number | null;
  Avatar?: string;
  ID?: string;
  CreatedBy?: string;
  Role?: string;
  reverificationAt?: string;
  BirthDate?: string;
}

export interface Filters {
  residency: "All" | "Pasig Resident" | "Non-Pasig Resident";
  barangay: string;
  state: string[];
  status: "All" | "Active" | "Archived";
  ageRange: "All" | "Under 18" | "18-25" | "26-40" | "41-60" | "60+";
}

export const defaultFilters: Filters = {
  residency: "All",
  barangay: "",
  state: [],
  status: "All",
  ageRange: "All",
};

export type SortDirection = "asc" | "desc";
export type SortColumn = "PatronUID" | "LastName" | "FirstName" | "Email" | "CreatedOn" | "LastBorrowedDate";

export interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

export interface TablePatron {
  id: string;
  PublicUID: string;
  UID: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
  Email: string;
  State: string;
  Barangay: string;
  SchoolWork: string;
  Status: string;
  LastBorrowedDate: number | null;
}

export interface PatronFiltersPayload {
  residency: Filters["residency"];
  barangay?: string;
  state?: string[];
  status: Filters["status"];
  ageRange: Filters["ageRange"];
}

export interface PatronSortPayload {
  column: SortColumn;
  direction: SortDirection;
}

