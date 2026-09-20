import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cachedFetch } from "@/lib/fetching-data-cache";
import { invalidatePatronCaches } from "@/features/lms/patrons/pages/index/api/patrons-cache";
import { usePagedList } from "@/hooks/use-paged-list";
import { useAuth } from "@/lib/auth/use-auth";
import { getBarangays, getCities } from "@/lib/constants/cities_barangays";
import type {
  PatronRecord,
  PatronFormData,
  PatronLogEntry,
  PatronLogs,
  PatronCheckoutEntry,
  PatronCheckinEntry,
  PatronDataResponse,
  PatronArchiveRequest,
  PatronEditRequest,
  PatronEmailVerificationRequest,
  CallableSuccessResponse,
  PatronViewResult,
  PatronViewTab,
} from "@/features/lms/patrons/pages/view-patron/types/patrons-view-types";
import { readCallableError } from "@/lib/api/callable-error";
import { capitalizeWords } from "@/lib/format/name";
import { formatPhoneForDisplay } from "@/lib/format/phone";
import {
  validatePatronView,
  getPatronFieldErrors,
  PatronFieldErrors,
} from "@/features/lms/patrons/pages/view-patron/schema/patrons-view-schema";

const NO_EDIT_PERMISSION =
  "You do not have permission to edit patrons. Please contact an administrator.";
const NO_ARCHIVE_PERMISSION =
  "You do not have permission to archive patrons. Please contact an administrator.";
const THROTTLED_MSG = "Please wait a moment before trying again.";

const EMPTY_LOGS: PatronLogs = {
  modificationLogs: [],
  checkoutHistory: [],
  checkinHistory: [],
};

function mapPatronViewError(error: unknown, fallback: string): string {
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

export function usePatronsView() {
  const { staffRoles } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [patron, setPatron] = useState<(PatronRecord & { id: string }) | null>(
    null,
  );
  const [editable, setEditable] = useState(false);
  const [initialData, setInitialData] = useState<Partial<PatronFormData>>({});
  const [formData, setFormData] = useState<Partial<PatronFormData>>({});
  const [activeTab, setActiveTab] = useState<PatronViewTab>("home");
  const [logs, setLogs] = useState<PatronLogs>(EMPTY_LOGS);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const modificationLogsPage = usePagedList<PatronLogEntry>(
    logs.modificationLogs,
  );
  const checkoutHistoryPage = usePagedList<PatronCheckoutEntry>(
    logs.checkoutHistory,
  );
  const checkinHistoryPage = usePagedList<PatronCheckinEntry>(
    logs.checkinHistory,
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [errors, setErrors] = useState<PatronFieldErrors>({});
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null);

  const verifyTimeoutRef = useRef<number | null>(null);
  const verifyPollIntervalRef = useRef<number | null>(null);

  const canEditPatron = Boolean(staffRoles?.PatronEdit);
  const canArchivePatron = Boolean(staffRoles?.PatronArchive);

  const loadLogs = useCallback(
    async (force: boolean = false) => {
      if (!patron?.UID) return;
      setLoadingLogs(true);
      try {
        const res = await cachedFetch<PatronLogs>(
          "patronLogs",
          { patronUID: patron.UID },
          { force },
        );
        setLogs({
          modificationLogs: Array.isArray(res?.modificationLogs)
            ? res.modificationLogs
            : [],
          checkoutHistory: Array.isArray(res?.checkoutHistory)
            ? res.checkoutHistory
            : [],
          checkinHistory: Array.isArray(res?.checkinHistory)
            ? res.checkinHistory
            : [],
        });
      } catch (err) {
        console.error("Failed to load patron logs", err);
      } finally {
        setLoadingLogs(false);
      }
    },
    [patron?.UID],
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

    const fetchPatron = async () => {
      try {
        const res = await cachedFetch<PatronDataResponse>("patronById", { id });
        if (!isMounted || !res) return;

        const phone = formatPhoneForDisplay(res.PhoneNumber);
        const merged = { ...res, PhoneNumber: phone } as PatronRecord & {
          id: string;
        };
        setPatron(merged);
        setFormData(merged);
        setInitialData(merged);
        setErrors({});
      } catch (err) {
        console.error("fetch patron error", err);
        if (isMounted) setError("Failed to fetch patron");
      }
    };

    fetchPatron();
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

  useEffect(() => {
    if (!patron?.UID) return;
    const fetchIdPreview = async () => {
      try {
        const path = `ids/${patron.UID}.webp`;
        const { getDownloadURL, ref } = await import("firebase/storage");
        const { storage } = await import("@/lib/firebase");
        const url = await getDownloadURL(ref(storage, path));
        setIdPreviewUrl(url);
      } catch {
        setIdPreviewUrl(null);
      }
    };
    fetchIdPreview();
  }, [patron?.UID]);

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
        PatronEmailVerificationRequest,
        CallableSuccessResponse
      >(functions, "requestUpdatedEmailVerificationPatron");
      await verify({ newEmail: targetEmail, uid: id });
      setSuccess(
        "Verification email sent. Please ask the patron to verify their new email.",
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
          const res = await cachedFetch<PatronDataResponse>("patronById", {
            id,
          });
          if (res && res.Email === targetEmail) {
            if (verifyPollIntervalRef.current) {
              clearInterval(verifyPollIntervalRef.current);
              verifyPollIntervalRef.current = null;
            }
            if (verifyTimeoutRef.current) {
              clearTimeout(verifyTimeoutRef.current);
              verifyTimeoutRef.current = null;
            }
            setSuccess("Patron email changed successfully");
            setEmailEditMode(false);
            setVerifyingEmail(false);
            setEmailVerified(true);
            setInitialData((prev) => ({ ...prev, Email: targetEmail }));
            setFormData((prev) => ({ ...prev, Email: targetEmail }));
            setPatron((prev) =>
              prev ? { ...prev, Email: targetEmail } : prev,
            );
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
      setError(mapPatronViewError(err, "Failed to send email verification."));
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

      setFormData((prev) => ({ ...prev, [name]: transformedValue }));

      const freshErrors = getPatronFieldErrors({
        ...initialData,
        ...formData,
        [name]: transformedValue,
      } as Partial<PatronFormData>);
      setErrors(freshErrors);

      if (name === "Email" && value !== initialData.Email) {
        setEmailVerified(false);
      }
    },
    [editable, emailEditMode, initialData, formData],
  );

  const handleSave = useCallback(async (): Promise<PatronViewResult> => {
    if (isProcessing) return { ok: false, message: "Already processing." };
    if (!canEditPatron) {
      setError(NO_EDIT_PERMISSION);
      return { ok: false, message: NO_EDIT_PERMISSION };
    }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    const saveData = { ...formData } as Record<string, unknown>;

    const validationData: Partial<PatronFormData> = {
      FirstName: String(saveData.FirstName || ""),
      LastName: String(saveData.LastName || ""),
      City: String(saveData.City || ""),
      Barangay: String(saveData.Barangay || ""),
      PhoneNumber: String(saveData.PhoneNumber || ""),
      BirthDate: String(saveData.BirthDate || ""),
      Sex: String(saveData.Sex || ""),
      Email: String(saveData.Email || ""),
      SchoolWork: String(saveData.SchoolWork || ""),
    };

    const validation = validatePatronView(validationData as PatronFormData);
    if (!validation.success) {
      setIsProcessing(false);
      const message = validation.message || "Validation failed";
      setError(message);
      setErrors(getPatronFieldErrors(validationData));
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
      const editCall = httpsCallable<PatronEditRequest, CallableSuccessResponse>(
        functions,
        "editRecordAttempt",
      );
      await editCall({
        case: "editPatronInformation",
        targetUID: patron?.UID || "",
        profileData: saveData,
      });

      const message = "Patron profile updated.";
      setSuccess(message);
      setEditable(false);
      setInitialData(saveData);
      invalidatePatronCaches();
      void refreshLogs();
      return { ok: true, message };
    } catch (err) {
      console.error(err);
      const message = mapPatronViewError(err, "Failed to save changes.");
      setError(message);
      return { ok: false, message };
    } finally {
      setIsProcessing(false);
    }
  }, [formData, patron, canEditPatron, isProcessing]);

  const setArchiveState = useCallback(
    async (action: "archive" | "unarchive"): Promise<PatronViewResult> => {
      if (isProcessing) return { ok: false, message: "Already processing." };
      if (!patron?.UID) return { ok: false, message: "No patron loaded." };
      if (!canArchivePatron) {
        setError(NO_ARCHIVE_PERMISSION);
        return { ok: false, message: NO_ARCHIVE_PERMISSION };
      }

      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      try {
        const call = httpsCallable<
          PatronArchiveRequest,
          CallableSuccessResponse
        >(functions, "archiveUnarchiveRecordAttempt");
        await call({
          case: "patronArchiveUnarchive",
          targetUID: patron.UID,
          action,
        });

        const message =
          action === "archive"
            ? "Patron archived successfully."
            : "Patron unarchived successfully.";
        setSuccess(message);
        setPatron((prev) =>
          prev
            ? { ...prev, Status: action === "archive" ? "Archived" : "Active" }
            : prev,
        );
        setEditable(false);
        invalidatePatronCaches();
        void refreshLogs();
        return { ok: true, message };
      } catch (err) {
        console.error(err);
        const message = mapPatronViewError(err, `Failed to ${action} patron.`);
        setError(message);
        return { ok: false, message };
      } finally {
        setIsProcessing(false);
      }
    },
    [patron, canArchivePatron, isProcessing],
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
    if (patron?.Status === "Archived" || !canEditPatron) return;
    setEmailEditMode(true);
    setEditable(false);
  }, [patron?.Status, canEditPatron]);

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
    patron,
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
    checkoutHistory: checkoutHistoryPage.items,
    loadingCheckoutHistory: loadingLogs,
    checkoutHistoryTotal: checkoutHistoryPage.total,
    checkoutHistoryCurrentPage: checkoutHistoryPage.currentPage,
    checkoutHistoryTotalPages: checkoutHistoryPage.totalPages,
    checkoutHistoryItemsPerPage: checkoutHistoryPage.itemsPerPage,
    checkinHistory: checkinHistoryPage.items,
    loadingCheckinHistory: loadingLogs,
    checkinHistoryTotal: checkinHistoryPage.total,
    checkinHistoryCurrentPage: checkinHistoryPage.currentPage,
    checkinHistoryTotalPages: checkinHistoryPage.totalPages,
    checkinHistoryItemsPerPage: checkinHistoryPage.itemsPerPage,
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
    canEditPatron,
    canArchivePatron,
    idPreviewUrl,
    setError,
    setSuccess,
    setEditable,
    setActiveTab,
    setFormData,
    handleChange,
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
    refreshCheckoutHistory: refreshLogs,
    goToCheckoutHistoryPage: checkoutHistoryPage.goToPage,
    nextCheckoutHistoryPage: checkoutHistoryPage.nextPage,
    prevCheckoutHistoryPage: checkoutHistoryPage.prevPage,
    handleCheckoutHistoryItemsPerPageChange:
      checkoutHistoryPage.setItemsPerPage,
    refreshCheckinHistory: refreshLogs,
    goToCheckinHistoryPage: checkinHistoryPage.goToPage,
    nextCheckinHistoryPage: checkinHistoryPage.nextPage,
    prevCheckinHistoryPage: checkinHistoryPage.prevPage,
    handleCheckinHistoryItemsPerPageChange: checkinHistoryPage.setItemsPerPage,
    goBack,
  } as const;
}
