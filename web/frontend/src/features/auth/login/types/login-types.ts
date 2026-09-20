import type { AuthUserType } from "@/lib/auth/auth-types";

export type LoginData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export interface LoginResult {
  ok: boolean;
  message?: string;
  fieldErrors?: LoginFieldErrors;
  userType?: AuthUserType;
}

export type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export type AuthFeedback = {
  message?: string;
  modalMessage?: string;
  fieldErrors?: LoginFieldErrors;
};
