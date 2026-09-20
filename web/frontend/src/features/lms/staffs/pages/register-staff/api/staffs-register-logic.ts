import { useState, useCallback, useEffect, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import {
  StaffRegisterForm,
  StaffRegisterFieldErrors,
  StaffRegisterStep,
  StaffRegisterResult,
  StaffRegistrationRequest,
  StaffRegistrationResponse,
} from "@/features/lms/staffs/pages/register-staff/types/staff-register-types";
import {
  personalRolesSchema,
  staffRegisterSchema,
} from "@/features/lms/staffs/pages/register-staff/schema/staff-register-schema";
import { getCities, getBarangays } from "@/lib/constants/cities_barangays";
import { useAuth } from "@/lib/auth/use-auth";
import { STAFF_PERMISSION_KEYS } from "@/lib/auth/auth-types";

const initialFormState: StaffRegisterForm = {
  FirstName: "",
  MiddleName: "",
  LastName: "",
  Suffix: "",
  BirthDate: "",
  Sex: "",
  City: "",
  Barangay: "",
  PhoneNumber: "",
  JobTitle: "",
  Email: "",
  Password: "",
  ConfirmPassword: "",
  CatalogingAdd: false,
  CatalogingEdit: false,
  CatalogingArchive: false,
  Checkout: false,
  Checkin: false,
  ApproveRenewals: false,
  PatronAdd: false,
  PatronEdit: false,
  PatronArchive: false,
  VerifyIDs: false,
  AnnouncementCreation: false,
  ReportGeneration: false,
  LiveChat: false,
};

const permissionKeys = STAFF_PERMISSION_KEYS as ReadonlyArray<
  keyof StaffRegisterForm
>;

const GENERIC_ERROR =
  "Registration failed. Please ensure all information is entered correctly and try again.";
const SUCCESS_MSG = "Email verification sent. Please check your email to complete the registration process.";
const NO_PERMISSION_ERROR =
  "You do not have permission to register staff. Please contact an administrator.";
const THROTTLED_MSG =
  "Please wait a moment before requesting another verification email.";

export function useStaffRegister() {
  const [form, setForm] = useState<StaffRegisterForm>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<StaffRegisterFieldErrors>({});
  const [step, setStep] = useState<StaffRegisterStep>("personal");
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [cities, setCities] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const { userType, staffRoles, profile } = useAuth();

  const canRegister = userType === "Staff" && !!staffRoles?.StaffAdd;
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
    <K extends keyof StaffRegisterForm>(
      name: K,
      value: StaffRegisterForm[K],
    ) => {
      setForm((prev) => {
        if (prev[name] === value) return prev;
        const nextForm = { ...prev, [name]: value };

        const hasActiveRole = permissionKeys.some((key) =>
          Boolean(nextForm[key]),
        );

        setFieldErrors((prevErrors) => {
          const updated: StaffRegisterFieldErrors = { ...prevErrors };
          delete updated[name];

          if (hasActiveRole) {
            delete updated._roles;
          }

          return updated;
        });

        return nextForm;
      });
    },
    [],
  );

  const setMany = useCallback((patch: Partial<StaffRegisterForm>) => {
    setForm((prev) => {
      const nextForm = { ...prev, ...patch };

      const hasActiveRole = permissionKeys.some((key) =>
        Boolean(nextForm[key]),
      );

      setFieldErrors((prevErrors) => {
        const updated: StaffRegisterFieldErrors = { ...prevErrors };

        (Object.keys(patch) as Array<keyof StaffRegisterForm>).forEach(
          (key) => {
            delete updated[key];
          },
        );

        if (hasActiveRole) {
          delete updated._roles;
        }

        return updated;
      });

      return nextForm;
    });
  }, []);

  const validateStep1 = useCallback(() => {
    const result = personalRolesSchema.safeParse(form);
    const errors: StaffRegisterFieldErrors = {};

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const pathKey = issue.path[0] as keyof StaffRegisterFieldErrors;
        if (pathKey) {
          errors[pathKey] = issue.message;
        }
      });
    }

    const hasRole = permissionKeys.some((key) => Boolean(form[key]));
    if (!hasRole && form.JobTitle !== "Admin") {
      errors._roles = "Please select at least one role permission.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const validateFullForm = useCallback(() => {
    const result = staffRegisterSchema.safeParse(form);
    const errors: StaffRegisterFieldErrors = {};

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const pathKey = issue.path[0] as keyof StaffRegisterFieldErrors;
        if (pathKey) {
          errors[pathKey] = issue.message;
        }
      });
    }

    const hasRole = permissionKeys.some((key) => Boolean(form[key]));
    if (!hasRole && form.JobTitle !== "Admin") {
      errors._roles = "Please select at least one role permission.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

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

  const confirmRolesAndShowSummary = useCallback(async (): Promise<boolean> => {
    const isValid = validateFullForm();
    if (isValid) {
      setShowSummary(true);
      return true;
    }
    return false;
  }, [validateFullForm]);

const performRegister = useCallback(
  async (captchaToken: string): Promise<StaffRegisterResult> => {
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

      const { ConfirmPassword, ...userData } = form;

      const requestVerification = httpsCallable<
        StaffRegistrationRequest,
        StaffRegistrationResponse
      >(functions, "requestStaffRegistration");

      const result = await requestVerification({
        userData,
        captchaToken,
      });

      const staffCode = result.data?.staffCode;

      setSuccess(SUCCESS_MSG);
      setShowSummary(false);

      return {
        ok: true,
        message: SUCCESS_MSG,
        staffCode,
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
          const emailError: StaffRegisterFieldErrors = {
            Email: "Email already in use",
          };
          setFieldErrors(emailError);
          return {
            ok: false,
            message: "EMAIL_IN_USE",
            fieldErrors: emailError,
          };
        }

        if (
          code === "functions/permission-denied" &&
          message.includes("captcha")
        ) {
          const captchaError: StaffRegisterFieldErrors = {
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
    [form, validateFullForm, canRegister],
  );

  return {
    form,
    setField,
    setMany,
    fieldErrors,
    step,
    goPersonal,
    proceedToAccount,
    confirmRolesAndShowSummary,
    performRegister,
    loading,
    success,
    error,
    setError,
    setSuccess,
    showSummary,
    setShowSummary,
    cities,
    barangays,
    fourYearsAgo,
    canRegister,
    registeringAs,
  };
}