export type PasswordResetStep = 1 | 2;

export interface RequestCodeInput {
  email: string;
}

export interface VerifyCodeInput {
  email: string;
  code: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export type PasswordResetFieldErrors = {
  email?: string;
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
};

export interface PasswordResetResult {
  ok: boolean;
  message?: string;
  fieldErrors?: PasswordResetFieldErrors;
  step?: PasswordResetStep;
}

export interface PasswordResetState {
  email: string;
  code: string;
  codeSent: boolean;
  newPassword: string;
  confirmPassword: string;
  step: PasswordResetStep;
  error: string | null;
  success: string | null;
  isProcessing: boolean;
  fieldErrors: PasswordResetFieldErrors;
}

export interface PasswordResetHandlers {
  handleRequestCode: () => Promise<void>;
  handleVerifyCode: () => Promise<void>;
  handleResetPassword: () => Promise<void>;
  handleCancel: () => void;
  handleCloseModal: () => void;
}

export interface PasswordResetHook
  extends PasswordResetState, PasswordResetHandlers {
  setEmail: (v: string) => void;
  setCode: (v: string) => void;
  setNewPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
}
