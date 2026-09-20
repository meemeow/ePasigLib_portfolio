export interface Staff {
  id: string;
  FirstName: string;
  LastName: string;
  MiddleName?: string;
  Suffix?: string;
  Email?: string;
  StaffCode?: string;
  Position?: string;
  JobTitle?: string;
  Status?: string;
  CatalogingAdd?: boolean;
  CatalogingEdit?: boolean;
  CatalogingArchive?: boolean;
  PatronAdd?: boolean;
  PatronEdit?: boolean;
  PatronArchive?: boolean;
  VerifyIDs?: boolean;
  Checkin?: boolean;
  Checkout?: boolean;
  ApproveRenewals?: boolean;
  AnnouncementCreation?: boolean;
  ReportGeneration?: boolean;
  LiveChat?: boolean;
}

export interface TableStaff {
  id: string;
  StaffCode: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
  Email: string;
  JobTitle: string;
  Status: string;
  CatalogingAdd: boolean;
  CatalogingEdit: boolean;
  CatalogingArchive: boolean;
  StaffEdit: boolean;
  StaffAdd: boolean;
  StaffArchive: boolean;
  PatronAdd: boolean;
  PatronEdit: boolean;
  PatronArchive: boolean;
  VerifyIDs: boolean;
  Checkin: boolean;
  Checkout: boolean;
  ApproveRenewals: boolean;
  AnnouncementCreation: boolean;
  ReportGeneration: boolean;
  LiveChat: boolean;
}

export interface StaffFilters {
  positions: string[];
  roles: string[];
  status: 'All' | 'Active' | 'Archived';
}

export const defaultStaffFilters: StaffFilters = {
  positions: [],
  roles: [],
  status: 'All',
};

export type StaffSortColumn = 'staffCode' | 'lastName' | 'firstName' | 'email';
export type SortDirection = 'asc' | 'desc';
export interface StaffSortState { column: StaffSortColumn; direction: SortDirection; }

export interface StaffFiltersPayload {
  positions?: string[];
  roles?: string[];
  status: StaffFilters["status"];
}

export interface StaffSortPayload {
  column: StaffSortColumn;
  direction: SortDirection;
}

export interface FetchStaffsPayload {
  limit: number;
  page: number;
  filters: StaffFiltersPayload;
  sortBy: StaffSortPayload;
  ids?: string[];
}

export interface SearchStaffsPayload {
  case: "searchStaffs";
  searchTerm: string;
  limit: number;
  page: number;
}

export interface StaffPaginatedResponse {
  data: TableStaff[];
  page: number;
  totalPages: number;
  hasMore: boolean;
  total: number;
}

export interface StaffSearchIdsResponse {
  ids: string[];
  total: number;
  hasMore: boolean;
  nextStartAfterId: string | null;
}
