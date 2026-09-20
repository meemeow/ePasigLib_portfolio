import { useState, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { functions, storage } from "@/lib/firebase";
import { fullRegisterSchema } from "@/features/auth/register/schema/register-schema";
import type { FullRegisterForm } from "@/features/auth/register/schema/register-schema";
import type {
  RegisterPayload,
  RegisterResult,
  RegisterFieldErrors,
  PatronSelfRegistrationRequest,
  PatronRegistrationResponse,
} from "@/features/auth/register/types/register-types";

const GENERIC_ERROR =
  "Registration failed. Please ensure all information is entered correctly and try again.";
const SUCCESS_MSG =
  "Verification email sent. Please check your email to verify your account.";
const THROTTLED_MSG =
  "Please wait a moment before requesting another verification email.";

const convertToWebP = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        img.src = reader.result;
      }
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas not supported");

      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject("Failed to convert image")),
        "image/webp",
        0.8,
      );
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const mapSchemaErrors = (
  issues: Array<{ path: (string | number)[]; message: string }>,
): RegisterFieldErrors => {
  return issues.reduce<RegisterFieldErrors>((errors, issue) => {
    const field = issue.path[0] as string;
    if (!errors[field as keyof RegisterFieldErrors]) {
      errors[field as keyof RegisterFieldErrors] = issue.message;
    }
    return errors;
  }, {});
};

export function useRegisterLogic() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  const pendingVerificationRef = useRef<{
    token: string;
    email: string;
  } | null>(null);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  };

  const performRegister = async (
    form: FullRegisterForm,
    idFile: File | null,
    captchaToken: string,
  ): Promise<RegisterResult> => {
    setLoading(true);
    clearFeedback();

    try {
      const validation = fullRegisterSchema.safeParse(form);
      if (!validation.success) {
        const errors = mapSchemaErrors(validation.error.issues);
        setFieldErrors(errors);
        return {
          ok: false,
          message: "Please fix the errors below",
          fieldErrors: errors,
        };
      }

      if (!idFile) {
        const idError = { ID: "ID image is required" };
        setFieldErrors(idError);
        return {
          ok: false,
          message: "ID image is required",
          fieldErrors: idError,
        };
      }

      const parsed = validation.data;
      const { ConfirmPassword, ...rest } = parsed;

      let token: string | undefined;
      const pending = pendingVerificationRef.current;

      if (pending && pending.email === rest.Email) {
        token = pending.token;
      } else {
        const payload: RegisterPayload = {
          Email: rest.Email,
          Password: rest.Password,
          FirstName: rest.FirstName,
          LastName: rest.LastName,
          MiddleName: rest.MiddleName ?? "",
          BirthDate: rest.BirthDate,
          Barangay: rest.Barangay,
          City: rest.City,
          PhoneNumber: rest.PhoneNumber,
          SchoolWork: rest.SchoolWork,
          Sex: rest.Sex,
          Suffix: rest.Suffix ?? "",
          Avatar: rest.Avatar ?? "",
        };

        const sendVerification = httpsCallable<
          PatronSelfRegistrationRequest,
          PatronRegistrationResponse
        >(functions, "requestPatronSelfRegistration");
        const result = await sendVerification({
          userData: payload,
          captchaToken: captchaToken,
        });

        token = result.data?.token;
        if (!token) {
          throw new Error("Failed to obtain verification token");
        }
        pendingVerificationRef.current = { token, email: rest.Email };
      }

      try {
        const webpBlob = await convertToWebP(idFile);
        const tempRef = ref(storage, `ids_temp/${token}.webp`);
        await uploadBytes(tempRef, webpBlob);
      } catch (uploadErr) {
        console.error("Failed to upload ID image:", uploadErr);
        const idError = {
          ID: "Failed to upload ID image. Please try again.",
        };
        setFieldErrors(idError);
        return {
          ok: false,
          message: "Failed to upload ID image",
          fieldErrors: idError,
        };
      }

      pendingVerificationRef.current = null;
      setSuccess(SUCCESS_MSG);
      return { ok: true, message: SUCCESS_MSG };
    } catch (e: unknown) {
      const code =
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        typeof e.code === "string"
          ? e.code
          : "";

      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" &&
              e !== null &&
              "message" in e &&
              typeof e.message === "string"
            ? e.message
            : "";

      if (
        code === "functions/already-exists" ||
        message.includes("already in use")
      ) {
        const emailError = { Email: "Email already in use" };
        setFieldErrors(emailError);
        pendingVerificationRef.current = null;
        return {
          ok: false,
          message: "EMAIL_IN_USE",
          fieldErrors: emailError,
        };
      }

      if (
        code === "functions/permission-denied" ||
        message.includes("captcha")
      ) {
        const captchaError = {
          captcha: "Security verification failed. Please try again.",
        };
        setFieldErrors(captchaError);
        return {
          ok: false,
          message: "Security verification failed",
          fieldErrors: captchaError,
        };
      }

      if (code === "functions/resource-exhausted") {
        setError(THROTTLED_MSG);
        return { ok: false, message: THROTTLED_MSG };
      }

      if (code === "functions/invalid-argument" && message) {
        setError(message);
        return { ok: false, message };
      }

      setError(GENERIC_ERROR);
      return { ok: false, message: GENERIC_ERROR };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    success,
    fieldErrors,
    performRegister,
    clearFeedback,
    setError,
    setSuccess,
  };
}
