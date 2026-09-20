export interface StaffRegisterForm {
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
  BirthDate: string;
  Sex: string;
  City: string;
  Barangay: string;
  PhoneNumber: string;
  JobTitle: string;
  Email: string;
  Password: string;
  ConfirmPassword: string;
  CatalogingAdd: boolean;
  CatalogingEdit: boolean;
  CatalogingArchive: boolean;
  Checkout: boolean;
  Checkin: boolean;
  ApproveRenewals: boolean;
  PatronAdd: boolean;
  PatronEdit: boolean;
  PatronArchive: boolean;
  VerifyIDs: boolean;
  AnnouncementCreation: boolean;
  ReportGeneration: boolean;
  LiveChat: boolean;
}

export type StaffRegisterFieldErrors = {
  [K in keyof StaffRegisterForm]?: string;
} & {
  _roles?: string;
  captcha?: string;
  form?: string;
};

export type StaffRegisterStep = "personal" | "account";

export type StaffRegisterResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: StaffRegisterFieldErrors;
  staffCode?: string;
};

export type StaffRegistrationPayload = Omit<
  StaffRegisterForm,
  "ConfirmPassword"
>;

export type StaffRegistrationRequest = {
  userData: StaffRegistrationPayload;
  captchaToken: string;
};

export type StaffRegistrationResponse = {
  success: boolean;
  staffCode?: string;
  token?: string;
};
