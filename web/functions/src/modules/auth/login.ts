import { onCall } from "firebase-functions/v2/https";
import { logAuthAttempt } from "../lms/writes/writing-auth";
import { assertEmail } from "./auth-validation";
import { LoginAttemptInput } from "./auth-types";

export const recordLoginAttempt = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    try {
      const data = (request.data || {}) as Partial<LoginAttemptInput>;
      const email = assertEmail(data.email);
      const claimedSuccess = data.success === true;

      const tokenEmail =
        typeof request.auth?.token?.email === "string"
          ? request.auth.token.email.toLowerCase()
          : "";
      const isVerifiedSignIn = !!request.auth?.uid && tokenEmail === email;

      const success = claimedSuccess && isVerifiedSignIn;

      const rawRequest = request.rawRequest;
      const forwardedFor = rawRequest?.headers?.["x-forwarded-for"];
      const ipAddress =
        (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
          ?.split(",")[0]
          ?.trim() ||
        rawRequest?.ip ||
        null;

      await logAuthAttempt({
        email,
        success,
        errorMessage:
          claimedSuccess && !isVerifiedSignIn
            ? "unverified-success-claim"
            : typeof data.errorMessage === "string"
              ? data.errorMessage
              : null,
        userAgent: rawRequest?.headers?.["user-agent"] || null,
        ipAddress,
        userType: data.userType ?? null,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to record login attempt:", error);
      return { success: false };
    }
  },
);
