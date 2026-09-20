import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cachedFetch } from "@/lib/fetching-data-cache";
import { getCities, getBarangays } from "@/lib/constants/cities_barangays";
import { useAuth } from "@/lib/auth/use-auth";
import { readCallableError } from "@/lib/api/callable-error";
import { fileToWebPDataUrl, MAX_AVATAR_BYTES } from "@/lib/image-utils";
import { formatPhoneForDisplay, formatPhoneInput, toE164Phone } from "@/lib/format/phone";
import { DEFAULT_AVATAR } from "@/lib/auth/auth-types";
import { getProfileFieldErrors } from "@/features/opac/profile/schema/opac-profile-schema";
import type {
  AvatarUploadRequest,
  OwnProfileEditRequest,
  OwnProfileResponse,
  PatronIDUploadRequest,
  PatronVisitsResponse,
  ProfileData,
  ProfileEditableFields,
  ProfileFieldErrors,
  ProfileResult,
  ProfileTab,
  UploadResponse,
  VisitLog,
} from "@/features/opac/profile/types/opac-profile-types";

const GENERIC_ERROR = "Something went wrong. Please try again in a moment.";
const SAVE_SUCCESS = "Profile updated successfully!";
const AVATAR_SUCCESS = "Avatar updated successfully!";
const ID_SUCCESS = "ID reuploaded successfully. Please wait for re-verification.";
const AVATAR_TOO_LARGE = "Avatar size must be less than 3MB.";
const NO_AVATAR_SELECTED = "Please select an avatar image first.";
const NO_ID_SELECTED = "Please select an image to upload.";
const PHONE_ERROR = "Phone number must be exactly 10 digits (e.g. XXX-XXX-XXXX).";

function mapProfileError(error: unknown): string {
  const { code, message } = readCallableError(error);

  if (
    code === "functions/permission-denied" ||
    code === "functions/unauthenticated"
  ) {
    return message || "You are not allowed to make this change.";
  }
  if (code === "functions/resource-exhausted") {
    return "Please wait a moment before trying again.";
  }
  if (
    (code === "functions/invalid-argument" || code === "functions/not-found") &&
    message
  ) {
    return message;
  }
  return GENERIC_ERROR;
}

function toEditableFields(source: ProfileData): ProfileEditableFields {
  return {
    PhoneNumber: source.PhoneNumber || "",
    City: source.City || "",
    Barangay: source.Barangay || "",
    SchoolWork: source.SchoolWork || "",
  };
}

export function useOPACProfilePage() {
  const { profile, refreshProfile } = useAuth();

  const [userData, setUserData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<ProfileData>({});
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([]);
  const [visitLogLoading, setVisitLogLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<ProfileTab>("home");
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [cities, setCities] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [avatarEditing, setAvatarEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedReuploadID, setSelectedReuploadID] = useState<File | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) {
      setUserData(null);
      setFormData({});
      return;
    }

    const base: ProfileData = {
      UID: profile.UID,
      PublicUID: profile.publicUID,
      FirstName: profile.firstName,
      MiddleName: profile.middleName,
      LastName: profile.lastName,
      Suffix: profile.suffix,
      Email: profile.email,
      PhoneNumber: formatPhoneForDisplay(profile.phoneNumber),
      City: profile.City,
      Barangay: profile.barangay,
      BirthDate: profile.birthDate,
      Sex: profile.sex,
      SchoolWork: profile.schoolWork,
      Avatar: profile.avatar,
      Role: "Patron",
      State: profile.state,
      Status: profile.status,
      ID: profile.ID,
    };

    setUserData(base);
    setFormData(base);
    setAvatarPreview(profile.avatar || DEFAULT_AVATAR);
  }, [profile]);

  useEffect(() => {
    let isMounted = true;
    getCities().then((data) => {
      if (isMounted) setCities(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCity = formData.City || "";
  useEffect(() => {
    let isMounted = true;
    if (!selectedCity) {
      setBarangays([]);
      return;
    }
    getBarangays(selectedCity).then((data) => {
      if (isMounted) setBarangays(data);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const patronUID = userData?.UID;

  const loadVisits = useCallback(
    async (force = false) => {
      if (!patronUID) return;
      setVisitLogLoading(true);
      try {
        const res = await cachedFetch<PatronVisitsResponse>(
          "fetchPatronVisits",
          { patronUID },
          { force },
        );
        setVisitLogs(Array.isArray(res) ? res : res?.data || []);
      } catch (e) {
        console.error("Failed to fetch visits:", e);
        setVisitLogs([]);
      } finally {
        setVisitLogLoading(false);
      }
    },
    [patronUID],
  );

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const refreshVisitLogs = useCallback(() => loadVisits(true), [loadVisits]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      const nextValue = name === "PhoneNumber" ? formatPhoneInput(value) : value;

      setFormData((prev) => ({ ...prev, [name]: nextValue }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof ProfileFieldErrors];
        return next;
      });
    },
    [],
  );

  const handleCityChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, City: value, Barangay: "" }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.City;
      delete next.Barangay;
      return next;
    });
  }, []);

  const handleSave = useCallback(async (): Promise<ProfileResult> => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const fields = toEditableFields(formData);

      const errors = getProfileFieldErrors(fields);
      if (errors) {
        setFieldErrors(errors);
        const message = Object.values(errors)[0] || "Invalid form";
        setError(message);
        return { ok: false, message, fieldErrors: errors };
      }

      const phone = toE164Phone(fields.PhoneNumber);
      if (!phone) {
        const phoneErrors: ProfileFieldErrors = { PhoneNumber: PHONE_ERROR };
        setFieldErrors(phoneErrors);
        setError(PHONE_ERROR);
        return { ok: false, message: PHONE_ERROR, fieldErrors: phoneErrors };
      }

      const call = httpsCallable<OwnProfileEditRequest, OwnProfileResponse>(
        functions,
        "editRecordAttempt",
      );
      await call({
        case: "editOwnProfile",
        profileData: { ...fields, PhoneNumber: phone },
      });

      setUserData({ ...formData });
      setIsEditing(false);
      setFieldErrors({});
      setSuccess(SAVE_SUCCESS);

      await refreshProfile();

      return { ok: true, message: SAVE_SUCCESS };
    } catch (err) {
      console.error("Update failed:", err);
      const message = mapProfileError(err);
      setError(message);
      return { ok: false, message };
    } finally {
      setIsProcessing(false);
    }
  }, [formData, refreshProfile]);

  const handleCancel = useCallback(() => {
    if (userData) setFormData(userData);
    setFieldErrors({});
    setIsEditing(false);
  }, [userData]);

  const onAvatarChange = useCallback((file: File) => {
    if (file.size > MAX_AVATAR_BYTES) {
      setError(AVATAR_TOO_LARGE);
      return;
    }
    setSelectedFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }, []);

  const handleAvatarUpload = useCallback(async (): Promise<ProfileResult> => {
    if (!selectedFile) {
      setError(NO_AVATAR_SELECTED);
      return { ok: false, message: NO_AVATAR_SELECTED };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const imageData = await fileToWebPDataUrl(selectedFile);
      const call = httpsCallable<AvatarUploadRequest, UploadResponse>(
        functions,
        "editRecordAttempt",
      );
      const resp = await call({ case: "uploadAvatar", imageData });

      const newUrl = resp.data?.url || avatarPreview;
      setUserData((prev) => ({ ...(prev || {}), Avatar: newUrl || undefined }));
      setAvatarPreview(newUrl || null);
      setAvatarEditing(false);
      setSelectedFile(null);
      setSuccess(AVATAR_SUCCESS);

      await refreshProfile();

      return { ok: true, message: AVATAR_SUCCESS };
    } catch (err) {
      console.error("Avatar upload failed:", err);
      const message = mapProfileError(err);
      setError(message);
      return { ok: false, message };
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, avatarPreview, refreshProfile]);

  const handleAvatarCancel = useCallback(() => {
    setAvatarEditing(false);
    setSelectedFile(null);
    setAvatarPreview(userData?.Avatar || DEFAULT_AVATAR);
  }, [userData?.Avatar]);

  const handleReuploadID = useCallback(async (): Promise<ProfileResult> => {
    if (!selectedReuploadID) {
      setError(NO_ID_SELECTED);
      return { ok: false, message: NO_ID_SELECTED };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const imageData = await fileToWebPDataUrl(selectedReuploadID);
      const call = httpsCallable<PatronIDUploadRequest, UploadResponse>(
        functions,
        "editRecordAttempt",
      );
      const resp = await call({ case: "uploadPatronID", imageData });

      setUserData((prev) => ({
        ...(prev || {}),
        ID: resp.data?.url || prev?.ID,
        State: "Unverified",
      }));
      setSelectedReuploadID(null);
      setSuccess(ID_SUCCESS);

      await refreshProfile();

      return { ok: true, message: ID_SUCCESS };
    } catch (err) {
      console.error("ID reupload failed:", err);
      const message = mapProfileError(err);
      setError(message);
      return { ok: false, message };
    } finally {
      setIsProcessing(false);
    }
  }, [selectedReuploadID, refreshProfile]);

  const totalPages = Math.ceil(visitLogs.length / itemsPerPage) || 1;

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return visitLogs.slice(start, start + itemsPerPage);
  }, [visitLogs, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const hasChanges = useMemo(() => {
    if (!userData) return false;
    const before = toEditableFields(userData);
    const after = toEditableFields(formData);
    return (Object.keys(before) as Array<keyof ProfileEditableFields>).some(
      (key) => before[key] !== after[key],
    );
  }, [userData, formData]);

  return {
    userData,
    formData,
    visitLogs,
    paginatedLogs,
    visitLogLoading,
    cities,
    barangays,
    activeTab,
    isEditing,
    isProcessing,
    hasChanges,
    error,
    success,
    fieldErrors,
    currentPage,
    itemsPerPage,
    totalPages,
    avatarEditing,
    selectedFile,
    avatarPreview,
    selectedReuploadID,
    fileInputRef,
    setFormData,
    setAvatarEditing,
    setItemsPerPage,
    setActiveTab,
    setIsEditing,
    setError,
    setSuccess,
    setSelectedReuploadID,
    refreshVisitLogs,
    handlePageChange,
    nextPage,
    prevPage,
    handleChange,
    handleCityChange,
    handleSave,
    handleCancel,
    onAvatarChange,
    handleAvatarUpload,
    handleAvatarCancel,
    handleReuploadID,
  };
}
