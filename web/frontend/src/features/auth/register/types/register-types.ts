export type RegisterForm = {
  Email: string;
  Password: string;
  ConfirmPassword: string;
  FirstName: string;
  LastName: string;
  MiddleName?: string;
  BirthDate: string;
  Barangay: string;
  City: string;
  PhoneNumber: string;
  SchoolWork: string;
  Sex: string;
  Suffix?: string;
  ID: string;
  Avatar?: string;
};

export type RegisterPayload = {
  Email: string;
  Password: string;
  FirstName: string;
  LastName: string;
  MiddleName?: string;
  BirthDate: string;
  Barangay: string;
  City: string;
  PhoneNumber: string;
  SchoolWork: string;
  Sex: string;
  Suffix?: string;
  Avatar?: string;
};

export type RegisterResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: RegisterFieldErrors;
};

export type RegisterFieldErrors = {
  Email?: string;
  Password?: string;
  ConfirmPassword?: string;
  FirstName?: string;
  LastName?: string;
  MiddleName?: string;
  BirthDate?: string;
  Barangay?: string;
  City?: string;
  PhoneNumber?: string;
  SchoolWork?: string;
  Sex?: string;
  Suffix?: string;
  ID?: string;
  Avatar?: string;
  captcha?: string;
  form?: string;
};

export type PatronSelfRegistrationRequest = {
  userData: RegisterPayload;
  captchaToken: string;
};

export type PatronRegistrationResponse = {
  success: boolean;
  token: string;
};
