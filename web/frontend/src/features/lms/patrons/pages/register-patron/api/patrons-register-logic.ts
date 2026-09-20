import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { functions, storage } from "@/lib/firebase";
import {
  PatronRegisterForm,
  PatronRegisterFieldErrors,
  PatronRegisterStep,
  PatronRegisterResult,
  PatronLMSRegistrationRequest,
  PatronRegistrationResponse,
} from "@/features/lms/patrons/pages/register-patron/types/patron-register-types";
import {
  personalInfoSchema,
  patronRegisterSchema,
} from "@/features/lms/patrons/pages/register-patron/schema/patron-register-schema";
import { getCities, getBarangays } from "@/lib/constants/cities_barangays";
import { useAuth } from "@/lib/auth/use-auth";

const DEFAULT_AVATAR =
  "https://firebasestorage.googleapis.com/v0/b/epasiglib.firebasestorage.app/o/avatar%2Fdefault_avatar.jpg?alt=media&token=66b8e756-dc72-4488-a223-c7929683a7f3";

const initialFormState: PatronRegisterForm = {
  FirstName: "",
  MiddleName: "",
  LastName: "",
  Suffix: "",
  BirthDate: "",
  Sex: "",
  City: "",
  Barangay: "",
  PhoneNumber: "",
  SchoolWork: "",
  Email: "",
  Password: "",
  ConfirmPassword: "",
  ID: "",
  Avatar: DEFAULT_AVATAR,
};

const GENERIC_ERROR =
  "Registration failed. Please ensure all information is entered correctly and try again.";
const SUCCESS_MSG = "Email verification sent. Please check your email to complete the registration process.";
const NO_PERMISSION_ERROR =
  "You do not have permission to register patrons. Please contact an administrator.";
const THROTTLED_MSG =
  "Please wait a moment before requesting another verification email.";

const titleCase = (str: string) =>
  str
    .toLowerCase()
    .split(/(\s+)/)
    .map((token) => {
      if (token.trim() === "") return token;
      return token
        .split(/(-|')/)
        .map((part) => {
          if (part === "-" || part === "'") return part;
          return part.length
            ? part.charAt(0).toUpperCase() + part.slice(1)
            : part;
        })
        .join("");
    })
    .join("");

const convertToWebP = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string")
        return reject(new Error("Invalid file data"));

      const img = new Image();
      img.onerror = () =>
        reject(new Error("Failed to load image for conversion"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));

        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("Failed to convert image to WebP")),
          "image/webp",
          0.8,
        );
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  });
};

export function usePatronRegister() {
  const [form, setForm] = useState<PatronRegisterForm>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<PatronRegisterFieldErrors>({});
  const [step, setStep] = useState<PatronRegisterStep>("personal");
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const pendingVerificationRef = useRef<{
    token: string;
    email: string;
  } | null>(null);

  const { userType, staffRoles, profile } = useAuth();

  const canRegister = userType === "Staff" && !!staffRoles?.PatronAdd;
  const registeringAs = useMemo(
    () =>
      `${profile?.firstName || ""}${
        profile?.lastName ? " " + profile.lastName : ""
      }`.trim(),
    [profile?.firstName, profile?.lastName],
  );

  const fourYearsAgo = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 4);
    return d.toISOString().split("T")[0];
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchCities = async () => {
      const citiesData = await getCities();
      if (isMounted) setCities(citiesData);
    };

    fetchCities();

    return () => {
      isMounted = false;
    };
  }, []);

  const watchedCity = form.City;
  useEffect(() => {
    let isMounted = true;

    const fetchBarangays = async () => {
      if (watchedCity) {
        const brgyData = await getBarangays(watchedCity);
        if (isMounted) setBarangays(brgyData);
      } else if (isMounted) {
        setBarangays([]);
      }
    };

    fetchBarangays();

    return () => {
      isMounted = false;
    };
  }, [watchedCity]);

  const setField = useCallback(
    <K extends keyof PatronRegisterForm>(
      name: K,
      value: PatronRegisterForm[K],
    ) => {
      let formattedValue = value as PatronRegisterForm[K];

      if (
        (name === "FirstName" ||
          name === "MiddleName" ||
          name === "LastName") &&
        typeof value === "string"
      ) {
        formattedValue = (
          value ? titleCase(value) : value
        ) as PatronRegisterForm[K];
      }

      setForm((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));

      setFieldErrors((prev) => {
        if (!(name in prev)) return prev;
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    },
    [],
  );

  const setMany = useCallback((patch: Partial<PatronRegisterForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setFieldErrors((prev) => {
      const updated = { ...prev };
      (Object.keys(patch) as Array<keyof PatronRegisterForm>).forEach((key) => {
        delete updated[key];
      });
      return updated;
    });
  }, []);

  const validateStep1 = useCallback(() => {
    const result = personalInfoSchema.safeParse(form);
    const errors: PatronRegisterFieldErrors = {};

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const pathKey = issue.path[0] as keyof PatronRegisterFieldErrors;
        if (pathKey) errors[pathKey] = issue.message;
      });
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const validateFullForm = useCallback(() => {
    const result = patronRegisterSchema.safeParse(form);
    const errors: PatronRegisterFieldErrors = {};

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const pathKey = issue.path[0] as keyof PatronRegisterFieldErrors;
        if (pathKey) errors[pathKey] = issue.message;
      });
    }

    if (!idFile) {
      errors.ID = "ID image is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, idFile]);

  const goPersonal = useCallback(() => {
    setStep("personal");
  }, []);

  const proceedToAccount = useCallback(async (): Promise<boolean> => {
    const isValid = validateStep1();
    if (isValid) {
      setStep("account");
      return true;
    }
    return false;
  }, [validateStep1]);

  const performRegister = useCallback(
    async (captchaToken: string): Promise<PatronRegisterResult> => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        if (!canRegister) {
          setError(NO_PERMISSION_ERROR);
          return { ok: false, message: NO_PERMISSION_ERROR };
        }

        const isValid = validateFullForm();
        if (!isValid) {
          return {
            ok: false,
            message: "Please fix the errors below",
          };
        }

        let token: string | undefined;
        const pending = pendingVerificationRef.current;

        if (pending && pending.email === form.Email) {
          token = pending.token;
        } else {
          const { ConfirmPassword, ID, ...payload } = form;

          const requestVerification = httpsCallable<
            PatronLMSRegistrationRequest,
            PatronRegistrationResponse
          >(functions, "requestPatronLMSRegistration");

          const result = await requestVerification({
            userData: payload,
            captchaToken,
          });

          token = result.data?.token;
          if (token) {
            pendingVerificationRef.current = { token, email: form.Email };
          }
        }

        if (token && idFile) {
          try {
            const webpBlob = await convertToWebP(idFile);
            const tempRef = ref(storage, `ids_temp/${token}.webp`);
            await uploadBytes(tempRef, webpBlob);
          } catch (err) {
            console.error("Failed to upload ID temp file:", err);
            setFieldErrors((prev) => ({
              ...prev,
              ID: "Failed to upload ID image. Please try again.",
            }));
            return {
              ok: false,
              message: "Failed to upload ID image",
            };
          }
        }

        pendingVerificationRef.current = null;
        setSuccess(SUCCESS_MSG);

        return {
          ok: true,
          message: SUCCESS_MSG,
          token,
        };
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
          const emailError: PatronRegisterFieldErrors = {
            Email: "Email already in use",
          };
          setFieldErrors(emailError);
          pendingVerificationRef.current = null;
          return {
            ok: false,
            message: "EMAIL_IN_USE",
            fieldErrors: emailError,
            code: "already-exists",
          };
        }

        if (code === "functions/permission-denied" && message.includes("captcha")) {
          const captchaError: PatronRegisterFieldErrors = {
            captcha: "Security verification failed. Please try again.",
          };
          setFieldErrors(captchaError);
          return {
            ok: false,
            message: "Security verification failed",
            fieldErrors: captchaError,
          };
        }

        if (
          code === "functions/permission-denied" ||
          code === "functions/unauthenticated"
        ) {
          const permissionMessage = message || NO_PERMISSION_ERROR;
          setError(permissionMessage);
          return { ok: false, message: permissionMessage };
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
        return {
          ok: false,
          message: GENERIC_ERROR,
        };
      } finally {
        setLoading(false);
      }
    },
    [form, validateFullForm, idFile, canRegister],
  );

  const setFieldWithReset = useCallback(
    <K extends keyof PatronRegisterForm>(name: K, value: PatronRegisterForm[K]) => {
      if (name === "Email" && pendingVerificationRef.current) {
        pendingVerificationRef.current = null;
      }
      setField(name, value);
    },
    [setField],
  );

  return {
    form,
    setField: setFieldWithReset,
    setMany,
    fieldErrors,
    step,
    goPersonal,
    proceedToAccount,
    performRegister,
    loading,
    success,
    error,
    setSuccess,
    setError,
    cities,
    barangays,
    fourYearsAgo,
    idFile,
    setIdFile,
    previewUrl,
    setPreviewUrl,
    canRegister,
    registeringAs,
  };
}