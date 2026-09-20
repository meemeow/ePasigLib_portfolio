export interface PatronRegisterForm {
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Suffix: string;
  BirthDate: string;
  Sex: string;
  City: string;
  Barangay: string;
  PhoneNumber: string;
  SchoolWork: string;
  Email: string;
  Password: string;
  ConfirmPassword: string;
  ID: string;
  Avatar: string;
}

export type PatronRegisterFieldErrors = {
  [K in keyof PatronRegisterForm]?: string;
} & {
  captcha?: string;
  form?: string;
};

export type PatronRegisterStep = "personal" | "account";

export type PatronRegisterResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: PatronRegisterFieldErrors;
  code?: string;
  token?: string;
};

export type PatronLMSRegistrationPayload = Omit<
  PatronRegisterForm,
  "ConfirmPassword" | "ID"
>;

export type PatronLMSRegistrationRequest = {
  userData: PatronLMSRegistrationPayload;
  captchaToken: string;
};

export type PatronRegistrationResponse = {
  success: boolean;
  token: string;
};