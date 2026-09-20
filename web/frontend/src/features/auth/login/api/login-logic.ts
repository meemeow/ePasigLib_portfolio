import { useState } from "react";
import { loginValidationSchema } from "@/features/auth/login/schema/login-schema";
import type {
  AuthFeedback,
  LoginData,
  LoginFieldErrors,
  LoginResult,
} from "@/features/auth/login/types/login-types";
import { useAuth } from "@/lib/auth/use-auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { FirebaseError } from "firebase/app";
import type { AuthUserType } from "@/lib/auth/auth-types";

const getFirebaseAuthFeedback = (code?: string): AuthFeedback => {
  switch (code) {
    case "auth/invalid-email":
      return { fieldErrors: { email: "Invalid email address." } };
    case "auth/missing-password":
      return { fieldErrors: { password: "Password is required." } };
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return { modalMessage: "Incorrect email or password. Please try again." };
    case "auth/user-disabled":
      return {
        modalMessage:
          "Please verify your email address before signing in. If you already have, contact support.",
      };
    case "auth/too-many-requests":
      return {
        modalMessage:
          "Too many failed attempts. Please try again later or reset your password.",
      };
    case "auth/network-request-failed":
      return {
        modalMessage: "Network error. Check your connection and try again.",
      };
    default:
      return { modalMessage: "Login failed. Please try again." };
  }
};

const mapSchemaFieldErrors = (
  issues: Array<{ path: (string | number)[]; message: string }>,
) => {
  return issues.reduce<LoginFieldErrors>((fieldErrors, issue) => {
    const path = issue.path[0];
    if (path === "email" && !fieldErrors.email)
      fieldErrors.email = issue.message;
    if (path === "password" && !fieldErrors.password)
      fieldErrors.password = issue.message;
    return fieldErrors;
  }, {});
};

export function useLoginLogic() {
  const { login, loading: authActionLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  const clearState = () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  };

  const performLogin = async (form: LoginData): Promise<LoginResult> => {
    clearState();

    const parsedResult = loginValidationSchema.safeParse({
      email: String(form.email ?? ""),
      password: String(form.password ?? ""),
    });

    if (!parsedResult.success) {
      const errors = mapSchemaFieldErrors(parsedResult.error.issues);
      setFieldErrors(errors);
      return { ok: false, fieldErrors: errors };
    }

    const normalizedEmail = parsedResult.data.email.trim().toLowerCase();

    try {
      const loginResult = await login({
        email: normalizedEmail,
        password: parsedResult.data.password,
        rememberMe: form.rememberMe ?? false,
      });

      setSuccess("Login successful");

      void logAuthAttemptBackend({
        email: normalizedEmail,
        success: true,
        errorMessage: null,
        userType: loginResult.userType ?? null,
      });

      return {
        ok: true,
        message: "Login Successful",
        userType: loginResult.userType,
      };
    } catch (e: unknown) {
      const authError = e as Partial<FirebaseError> & { message?: string };
      const code =
        typeof authError.code === "string" ? authError.code : undefined;
      const feedback = getFirebaseAuthFeedback(code);

      if (feedback.modalMessage) {
        setError(feedback.modalMessage);
      }

      if (feedback.fieldErrors) {
        setFieldErrors(feedback.fieldErrors);
      }

      void logAuthAttemptBackend({
        email: normalizedEmail,
        success: false,
        errorMessage: code || String(authError.message || "auth-failed"),
      });

      return {
        ok: false,
        message: feedback.modalMessage,
        fieldErrors: feedback.fieldErrors,
      };
    }
  };

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  };

  return {
    loading: authActionLoading,
    error,
    success,
    fieldErrors,
    performLogin,
    clearFeedback,
  };
}

export async function logAuthAttemptBackend(params: {
  email: string;
  success: boolean;
  errorMessage: string | null;
  userType?: AuthUserType | null;
}) {
  try {
    const record = httpsCallable(functions, "recordLoginAttempt");
    await record({
      email: params.email,
      success: params.success,
      errorMessage: params.errorMessage,
      userType: params.userType ?? null,
    });
  } catch (err) {
    console.warn("Failed to record login attempt", err);
  }
}
