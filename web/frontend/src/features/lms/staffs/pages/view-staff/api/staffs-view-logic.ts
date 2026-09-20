import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cachedFetch } from "@/lib/fetching-data-cache";
import { invalidateStaffCaches } from "@/features/lms/staffs/pages/index/api/staffs-cache";
import { usePagedList } from "@/hooks/use-paged-list";
import { useAuth } from "@/lib/auth/use-auth";
import { getBarangays, getCities } from "@/lib/constants/cities_barangays";
import type {
  StaffDoc,
  StaffFormData,
  StaffLogEntry,
  StaffLogs,
  StaffDataResponse,
  StaffArchiveRequest,
  StaffEditRequest,
  StaffEmailVerificationRequest,
  CallableSuccessResponse,
  StaffViewResult,
  StaffsViewTab,
} from "@/features/lms/staffs/pages/view-staff/types/staffs-view-types";
import {
  STAFF_PERMISSION_KEYS,
  type StaffRoleKey,
} from "@/lib/auth/auth-types";
import { readCallableError } from "@/lib/api/callable-error";
import { capitalizeWords } from "@/lib/format/name";
import { formatPhoneForDisplay } from "@/lib/format/phone";
import {
  validateHomeForm,
  getHomeFieldErrors,
  StaffHomeFieldErrors,
} from "@/features/lms/staffs/pages/view-staff/schema/staffs-view-schema";

const NO_EDIT_PERMISSION =
  "You do not have permission to edit staff. Please contact an administrator.";
const NO_ARCHIVE_PERMISSION =
  "You do not have permission to archive staff. Please contact an administrator.";
const THROTTLED_MSG = "Please wait a moment before trying again.";

const EMPTY_LOGS: StaffLogs = { modificationLogs: [] };

function mapStaffViewError(error: unknown, fallback: string): string {
  const { code, message } = readCallableError(error);

  if (
    code === "functions/already-exists" ||
    message.includes("already in use")
  ) {
    return "This email is already registered with another account.";
  }
  if (
    code === "functions/permission-denied" ||
    code === "functions/unauthenticated"
  ) {
    return message || NO_EDIT_PERMISSION;
  }
  if (code === "functions/resource-exhausted") {
    return THROTTLED_MSG;
  }
  if (
    (code === "functions/invalid-argument" ||
      code === "functions/not-found" ||
      code === "functions/failed-precondition") &&
    message
  ) {
    return message;
  }
  return fallback;
}

export function useStaffsView() {
  const { staffRoles } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [staff, setStaff] = useState<(StaffDoc & { id: string }) | null>(null);
  const [editable, setEditable] = useState(false);
  const [initialData, setInitialData] = useState<Partial<StaffFormData>>({});
  const [formData, setFormData] = useState<Partial<StaffFormData>>({});
  const [activeTab, setActiveTab] = useState<StaffsViewTab>("home");
  const [logs, setLogs] = useState<StaffLogs>(EMPTY_LOGS);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const modificationLogsPage = usePagedList<StaffLogEntry>(
    logs.modificationLogs,
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [errors, setErrors] = useState<StaffHomeFieldErrors>({});
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const verifyTimeoutRef = useRef<number | null>(null);
  const verifyPollIntervalRef = useRef<number | null>(null);

  const canEditStaff = Boolean(staffRoles?.StaffEdit);
  const canArchiveStaff = Boolean(staffRoles?.StaffArchive);

  const loadLogs = useCallback(
    async (force: boolean = false) => {
      if (!staff?.UID) return;
      setLoadingLogs(true);
      try {
        const res = await cachedFetch<StaffLogs>(
          "staffLogs",
          { staffUID: staff.UID },
          { force },
        );
        setLogs({
          modificationLogs: Array.isArray(res?.modificationLogs)
            ? res.modificationLogs
            : [],
        });
      } catch (err) {
        console.error("Failed to load staff logs", err);
      } finally {
        setLoadingLogs(false);
      }
    },
    [staff?.UID],
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const refreshLogs = useCallback(() => loadLogs(true), [loadLogs]);

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

  useEffect(() => {
    let isMounted = true;
    const fetchBarangays = async () => {
      if (formData.City) {
        const brgyData = await getBarangays(formData.City);
        if (isMounted) setBarangays(brgyData);
      }
    };
    fetchBarangays();
    return () => {
      isMounted = false;
    };
  }, [formData.City]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchStaff = async () => {
      try {
        const res = await cachedFetch<StaffDataResponse>("staffById", { id });
        if (!isMounted || !res) return;

        const phone = formatPhoneForDisplay(res.PhoneNumber);
        const merged = { ...res, PhoneNumber: phone } as StaffDoc & {
          id: string;
        };
        setStaff(merged);
        setFormData(merged);
        setInitialData(merged);
        setErrors({});
      } catch (err) {
        console.error("fetch staff error", err);
        if (isMounted) setError("Failed to fetch staff");
      }
    };

    fetchStaff();
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!success && !error) return;
    const timer = setTimeout(() => handleCloseModal(), 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, error]);

  useEffect(() => {
    return () => {
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
        verifyTimeoutRef.current = null;
      }
      if (verifyPollIntervalRef.current) {
        clearInterval(verifyPollIntervalRef.current);
        verifyPollIntervalRef.current = null;
      }
    };
  }, []);

  const handleCityChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      City: value,
      Barangay: "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.City;
      delete next.Barangay;
      return next;
    });
  }, []);

  const handleVerifyEmail = useCallback(async () => {
    if (!id || verifyingEmail) return;
    const targetEmail = String(formData.Email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) return;

    setVerifyingEmail(true);
    setError(null);
    setSuccess(null);
    setEmailVerified(false);

    try {
      const verify = httpsCallable<
        StaffEmailVerificationRequest,
        CallableSuccessResponse
      >(functions, "requestUpdatedEmailVerificationStaff");
      await verify({ newEmail: targetEmail, uid: id });
      setSuccess(
        "Verification email sent. Please ask the staff to verify their new email.",
      );

      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
        verifyTimeoutRef.current = null;
      }
      if (verifyPollIntervalRef.current) {
        clearInterval(verifyPollIntervalRef.current);
        verifyPollIntervalRef.current = null;
      }

      const poll = async () => {
        try {
          const res = await cachedFetch<StaffDataResponse>("staffById", { id });
          if (res && res.Email === targetEmail) {
            if (verifyPollIntervalRef.current) {
              clearInterval(verifyPollIntervalRef.current);
              verifyPollIntervalRef.current = null;
            }
            if (verifyTimeoutRef.current) {
              clearTimeout(verifyTimeoutRef.current);
              verifyTimeoutRef.current = null;
            }
            setSuccess("Staff email changed successfully");
            setEmailEditMode(false);
            setVerifyingEmail(false);
            setEmailVerified(true);
            setInitialData((prev) => ({ ...prev, Email: targetEmail }));
            setFormData((prev) => ({ ...prev, Email: targetEmail }));
            setStaff((prev) => (prev ? { ...prev, Email: targetEmail } : prev));
          }
        } catch (_e) {
        }
      };

      verifyPollIntervalRef.current = window.setInterval(poll, 5000);
      poll();

      verifyTimeoutRef.current = window.setTimeout(
        () => {
          if (verifyPollIntervalRef.current) {
            clearInterval(verifyPollIntervalRef.current);
            verifyPollIntervalRef.current = null;
          }
          verifyTimeoutRef.current = null;
          setEmailEditMode(false);
          setVerifyingEmail(false);
          setFormData((prev) => ({ ...prev, Email: initialData.Email }));
          setEmailVerified(true);
          setError("No email verification response. Please try again.");
        },
        5 * 60 * 1000,
      );
    } catch (err) {
      console.error(err);
      setVerifyingEmail(false);
      setError(mapStaffViewError(err, "Failed to send email verification."));
    }
  }, [id, formData.Email, initialData.Email, verifyingEmail]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, type, value, checked } = e.target as HTMLInputElement;

      if (emailEditMode && name !== "Email") return;
      if (!editable && name !== "Email") return;
      if (!emailEditMode && name === "Email") return;

      const personalFields = [
        "FirstName",
        "MiddleName",
        "LastName",
        "Suffix",
        "City",
        "Barangay",
      ];
      let transformedValue: string | boolean =
        type === "checkbox"
          ? checked
          : personalFields.includes(name)
            ? capitalizeWords(value)
            : value;

      if (name === "PhoneNumber") {
        transformedValue = value;
      }

      if (name === "JobTitle" && value === "Admin") {
        const rolesTrue = STAFF_PERMISSION_KEYS.reduce(
          (acc, role) => ({ ...acc, [role]: true }),
          {} as Partial<Record<StaffRoleKey, boolean>>,
        );
        setFormData((prev) => ({ ...prev, JobTitle: value, ...rolesTrue }));
        return;
      }

      setFormData((prev) => ({ ...prev, [name]: transformedValue }));

      const freshErrors = getHomeFieldErrors({
        ...initialData,
        ...formData,
        [name]: transformedValue,
      } as Partial<StaffFormData>);
      setErrors(freshErrors);

      if (name === "Email" && value !== initialData.Email) {
        setEmailVerified(false);
      }
    },
    [editable, emailEditMode, initialData, formData],
  );

  const handleGroupToggle = useCallback(
    (fields: StaffRoleKey[], isChecked: boolean) => {
      if (!editable || emailEditMode) return;
      const updated = fields.reduce(
        (acc, field) => ({ ...acc, [field]: isChecked }),
        {} as Record<StaffRoleKey, boolean>,
      );
      setFormData((prev) => ({ ...prev, ...updated }));
      setErrors(
        getHomeFieldErrors({
          ...initialData,
          ...formData,
          ...updated,
        } as Partial<StaffFormData>),
      );
    },
    [editable, emailEditMode, initialData, formData],
  );

  const handleSave = useCallback(async (): Promise<StaffViewResult> => {
    if (isProcessing) return { ok: false, message: "Already processing." };
    if (!canEditStaff) {
      setError(NO_EDIT_PERMISSION);
      return { ok: false, message: NO_EDIT_PERMISSION };
    }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    const saveData = { ...formData } as Record<string, unknown>;

    const validationData: Partial<StaffFormData> = {
      FirstName: String(saveData.FirstName || ""),
      LastName: String(saveData.LastName || ""),
      City: String(saveData.City || ""),
      Barangay: String(saveData.Barangay || ""),
      PhoneNumber: String(saveData.PhoneNumber || ""),
      BirthDate: String(saveData.BirthDate || ""),
      Sex: String(saveData.Sex || ""),
      Email: String(saveData.Email || ""),
      JobTitle: String(saveData.JobTitle || ""),
      UID: String(saveData.UID || ""),
      CatalogingAdd: Boolean(saveData.CatalogingAdd),
      CatalogingEdit: Boolean(saveData.CatalogingEdit),
      CatalogingArchive: Boolean(saveData.CatalogingArchive),
      PatronAdd: Boolean(saveData.PatronAdd),
      PatronEdit: Boolean(saveData.PatronEdit),
      PatronArchive: Boolean(saveData.PatronArchive),
      VerifyIDs: Boolean(saveData.VerifyIDs),
      Checkout: Boolean(saveData.Checkout),
      Checkin: Boolean(saveData.Checkin),
      ApproveRenewals: Boolean(saveData.ApproveRenewals),
      AnnouncementCreation: Boolean(saveData.AnnouncementCreation),
      ReportGeneration: Boolean(saveData.ReportGeneration),
      LiveChat: Boolean(saveData.LiveChat),
      Status: String(saveData.Status || "Active"),
    };

    const validation = validateHomeForm(validationData as StaffFormData);
    if (!validation.success) {
      setIsProcessing(false);
      const message = validation.message || "Validation failed";
      setError(message);
      setErrors(getHomeFieldErrors(validationData));
      return { ok: false, message };
    }

    if (
      saveData.PhoneNumber &&
      /^\d{3}-\d{3}-\d{4}$/.test(String(saveData.PhoneNumber))
    ) {
      const digits = String(saveData.PhoneNumber).replace(/-/g, "");
      saveData.PhoneNumber = "+63" + digits;
    }

    try {
      const editCall = httpsCallable<StaffEditRequest, CallableSuccessResponse>(
        functions,
        "editRecordAttempt",
      );
      await editCall({
        case: "editStaffInformation",
        targetUID: staff?.UID || "",
        profileData: saveData,
      });

      const message = "Staff profile updated.";
      setSuccess(message);
      setEditable(false);
      setInitialData(saveData);
      invalidateStaffCaches();
      void refreshLogs();
      return { ok: true, message };
    } catch (err) {
      console.error(err);
      const message = mapStaffViewError(err, "Failed to save changes.");
      setError(message);
      return { ok: false, message };
    } finally {
      setIsProcessing(false);
    }
  }, [formData, staff, canEditStaff, isProcessing]);

  const setArchiveState = useCallback(
    async (action: "archive" | "unarchive"): Promise<StaffViewResult> => {
      if (isProcessing) return { ok: false, message: "Already processing." };
      if (!staff?.UID) return { ok: false, message: "No staff loaded." };
      if (!canArchiveStaff) {
        setError(NO_ARCHIVE_PERMISSION);
        return { ok: false, message: NO_ARCHIVE_PERMISSION };
      }

      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      try {
        const call = httpsCallable<StaffArchiveRequest, CallableSuccessResponse>(
          functions,
          "archiveUnarchiveRecordAttempt",
        );
        await call({
          case: "staffArchiveUnarchive",
          targetUID: staff.UID,
          action,
        });

        const message =
          action === "archive"
            ? "Staff archived successfully."
            : "Staff unarchived successfully.";
        setSuccess(message);
        setStaff((prev) =>
          prev
            ? { ...prev, Status: action === "archive" ? "Archived" : "Active" }
            : prev,
        );
        setEditable(false);
        invalidateStaffCaches();
        void refreshLogs();
        return { ok: true, message };
      } catch (err) {
        console.error(err);
        const message = mapStaffViewError(err, `Failed to ${action} staff.`);
        setError(message);
        return { ok: false, message };
      } finally {
        setIsProcessing(false);
      }
    },
    [staff, canArchiveStaff, isProcessing],
  );

  const handleArchive = useCallback(
    () => setArchiveState("archive"),
    [setArchiveState],
  );

  const handleUnarchive = useCallback(
    () => setArchiveState("unarchive"),
    [setArchiveState],
  );

  const handleCloseModal = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const startEmailEdit = useCallback(() => {
    if (staff?.Status === "Archived" || !canEditStaff) return;
    setEmailEditMode(true);
    setEditable(false);
  }, [staff?.Status, canEditStaff]);

  const cancelEmailEdit = useCallback(() => {
    setEmailEditMode(false);
    setVerifyingEmail(false);
    setFormData((prev) => ({ ...prev, Email: initialData.Email }));
    setEmailVerified(true);
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
      verifyTimeoutRef.current = null;
    }
    if (verifyPollIntervalRef.current) {
      clearInterval(verifyPollIntervalRef.current);
      verifyPollIntervalRef.current = null;
    }
  }, [initialData.Email]);

  const emailChangedValid = useMemo(() => {
    if (!emailEditMode) return false;
    if (formData.Email === initialData.Email) return false;
    const email = String(formData.Email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    if (errors.Email) return false;
    if (Object.keys(errors).length > 0) return false;
    return true;
  }, [emailEditMode, formData.Email, initialData.Email, errors]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  const goBack = useCallback(() => navigate(-1), [navigate]);

  return {
    staff,
    editable,
    initialData,
    formData,
    activeTab,
    modificationLogs: modificationLogsPage.items,
    loadingModificationLogs: loadingLogs,
    modificationLogsTotal: modificationLogsPage.total,
    modificationLogsCurrentPage: modificationLogsPage.currentPage,
    modificationLogsTotalPages: modificationLogsPage.totalPages,
    modificationLogsItemsPerPage: modificationLogsPage.itemsPerPage,
    error,
    success,
    emailVerified,
    isProcessing,
    cities,
    barangays,
    hasChanges,
    errors,
    emailEditMode,
    verifyingEmail,
    emailChangedValid,
    canEditStaff,
    canArchiveStaff,
    setEditable,
    setActiveTab,
    setFormData,
    handleChange,
    handleGroupToggle,
    handleSave,
    handleArchive,
    handleUnarchive,
    handleCityChange,
    handleVerifyEmail,
    handleCloseModal,
    startEmailEdit,
    cancelEmailEdit,
    refreshModificationLogs: refreshLogs,
    goToModificationLogsPage: modificationLogsPage.goToPage,
    nextModificationLogsPage: modificationLogsPage.nextPage,
    prevModificationLogsPage: modificationLogsPage.prevPage,
    handleModificationLogsItemsPerPageChange:
      modificationLogsPage.setItemsPerPage,
    goBack,
  } as const;
}
