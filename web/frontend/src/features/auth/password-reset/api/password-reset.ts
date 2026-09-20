import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import type { ZodTypeAny } from "zod";
import { functions } from "@/lib/firebase";
import {
  PasswordResetRequestSchema,
  PasswordResetVerifySchema,
  PasswordResetResetSchema,
} from "@/features/auth/password-reset/schema/password-reset-schema";
import type {
  PasswordResetResult,
  PasswordResetFieldErrors,
} from "@/features/auth/password-reset/types/password-reset-types";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const INVALID_INPUT = "Please fix the errors below";
const EMAIL_NOT_REGISTERED = "This email is not registered in the system.";

const validate = (
  schema: ZodTypeAny,
  input: unknown,
): PasswordResetFieldErrors | null => {
  const result = schema.safeParse(input);
  if (result.success) return null;

  return result.error.issues.reduce<PasswordResetFieldErrors>((errors, issue) => {
    const field = issue.path[0] as keyof PasswordResetFieldErrors;
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
};

const readCallableError = (err: unknown): { code: string; message: string } => {
  const candidate = err as { code?: unknown; message?: unknown };
  return {
    code: typeof candidate?.code === "string" ? candidate.code : "",
    message:
      err instanceof Error
        ? err.message
        : typeof candidate?.message === "string"
          ? candidate.message
          : "",
  };
};

const mapResetError = (
  err: unknown,
  fallback: string,
): { message: string; fieldErrors: PasswordResetFieldErrors } => {
  const { code, message } = readCallableError(err);

  switch (code) {
    case "functions/permission-denied": {
      const text = message || "That reset code is incorrect.";
      return { message: text, fieldErrors: { code: text } };
    }
    case "functions/deadline-exceeded": {
      const text = message || "That reset code has expired.";
      return { message: text, fieldErrors: { code: text } };
    }
    case "functions/not-found":
      return {
        message:
          message ||
          "No reset code is pending for this email. Please request a new one.",
        fieldErrors: {},
      };
    case "functions/resource-exhausted":
      return {
        message: message || "Too many attempts. Please try again shortly.",
        fieldErrors: {},
      };
    case "functions/invalid-argument":
      return { message: message || fallback, fieldErrors: {} };
    default:
      return { message: fallback, fieldErrors: { form: fallback } };
  }
};

export function usePasswordResetLogic() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PasswordResetFieldErrors>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [codeSent, setCodeSent] = useState(false);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  };

  const failWith = (
    err: unknown,
    fallback: string,
  ): PasswordResetResult => {
    const { message, fieldErrors: mapped } = mapResetError(err, fallback);
    setError(message);
    setFieldErrors(mapped);
    return { ok: false, message, fieldErrors: mapped };
  };

  const failValidation = (
    errors: PasswordResetFieldErrors,
  ): PasswordResetResult => {
    setFieldErrors(errors);
    return { ok: false, message: INVALID_INPUT, fieldErrors: errors };
  };

  const handleRequestCode = async (
    email: string,
  ): Promise<PasswordResetResult> => {
    setLoading(true);
    clearFeedback();

    try {
      const errors = validate(PasswordResetRequestSchema, { email });
      if (errors) return failValidation(errors);

      await httpsCallable(functions, "requestPasswordResetCode")({ email });

      setCodeSent(true);
      setSuccess("A reset code is on its way to your email.");

      return { ok: true, message: "Reset code sent." };
    } catch (err: unknown) {
      const { code, message } = readCallableError(err);
      if (code === "functions/not-found") {
        const text = message || EMAIL_NOT_REGISTERED;
        setError(text);
        setFieldErrors({ email: text });
        return { ok: false, message: text, fieldErrors: { email: text } };
      }

      return failWith(err, GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (
    email: string,
    code: string,
  ): Promise<PasswordResetResult> => {
    setLoading(true);
    clearFeedback();

    try {
      const errors = validate(PasswordResetVerifySchema, { email, code });
      if (errors) return failValidation(errors);

      await httpsCallable(functions, "verifyResetCodeOnly")({ email, code });

      setStep(2);
      setSuccess("Code verified. You may now reset your password.");

      return { ok: true, message: "Code verified.", step: 2 };
    } catch (err: unknown) {
      return failWith(err, "Failed to verify code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (
    email: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<PasswordResetResult> => {
    setLoading(true);
    clearFeedback();

    try {
      const errors = validate(PasswordResetResetSchema, {
        email,
        code,
        newPassword,
        confirmPassword,
      });
      if (errors) return failValidation(errors);

      await httpsCallable(functions, "resetPasswordWithCode")({
        email,
        code,
        newPassword,
      });

      setSuccess("Password has been reset. Redirecting to login...");

      return { ok: true, message: "Password reset successfully." };
    } catch (err: unknown) {
      return failWith(err, "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    success,
    fieldErrors,
    step,
    codeSent,
    setStep,
    setCodeSent,
    handleRequestCode,
    handleVerifyCode,
    handleResetPassword,
    clearFeedback,
  };
}
