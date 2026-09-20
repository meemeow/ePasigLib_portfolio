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
import { getProfileFieldErrors } from "@/features/lms/profile/schema/profile-schema";
import type {
  AvatarUploadRequest,
  ModificationLog,
  OwnProfileEditRequest,
  OwnProfileResponse,
  OwnStaffModificationLogsResponse,
  ProfileData,
  ProfileEditableFields,
  ProfileFieldErrors,
  ProfileResult,
  ProfileTab,
  UploadResponse,
} from "@/features/lms/profile/types/profile-types";

const GENERIC_ERROR = "Something went wrong. Please try again in a moment.";
const SAVE_SUCCESS = "Profile updated successfully!";
const AVATAR_SUCCESS = "Avatar updated successfully!";
const AVATAR_TOO_LARGE = "Avatar must be less than 3MB.";
const NO_AVATAR_SELECTED = "Add an image first.";
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
  };
}

export function useProfilePage() {
  const { profile, staffRoles, staffCode, refreshProfile } = useAuth();

  const [userData, setUserData] = useState<ProfileData | null>(null);
  const [editableData, setEditableData] = useState<ProfileData>({});
  const [modificationLogs, setModificationLogs] = useState<ModificationLog[]>(
    [],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<ProfileTab>("home");
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [cities, setCities] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [avatarEditing, setAvatarEditing] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) {
      setUserData(null);
      setEditableData({});
      return;
    }

    const base: ProfileData = {
      UID: profile.UID,
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
      Avatar: profile.avatar,
      JobTitle: profile.jobTitle,
      State: profile.state,
      Status: profile.status,
      StaffCode: profile.staffCode,
    };

    setUserData(base);
    setEditableData(base);
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

  const selectedCity = editableData.City || "";
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

  const loadLogs = useCallback(async (force = false) => {
    setLoadingLogs(true);
    try {
      const res = await cachedFetch<OwnStaffModificationLogsResponse>(
        "ownStaffModificationLogs",
        {},
        { force },
      );
      setModificationLogs(Array.isArray(res) ? res : res?.data || []);
      setCurrentPage(1);
    } catch (e) {
      console.error("Failed to fetch logs:", e);
      setModificationLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const refreshLogs = useCallback(() => loadLogs(true), [loadLogs]);

  const handleChange = useCallback(
    (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement>,
    ) => {
      const { name, value } = e.target;
      const nextValue = name === "PhoneNumber" ? formatPhoneInput(value) : value;

      setEditableData((prev) => ({ ...prev, [name]: nextValue }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof ProfileFieldErrors];
        return next;
      });
    },
    [],
  );

  const handleCityChange = useCallback((value: string) => {
    setEditableData((prev) => ({ ...prev, City: value, Barangay: "" }));
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
      const fields = toEditableFields(editableData);

      const errors = getProfileFieldErrors(fields);
      if (errors) {
        setFieldErrors(errors);
        const message = Object.values(errors)[0] || "Invalid form";
        setError(message);
        return { ok: false, message, fieldErrors: errors };
      }

      const phone = toE164Phone(fields.PhoneNumber);
      if (!phone) {
        const errors: ProfileFieldErrors = { PhoneNumber: PHONE_ERROR };
        setFieldErrors(errors);
        setError(PHONE_ERROR);
        return { ok: false, message: PHONE_ERROR, fieldErrors: errors };
      }

      const call = httpsCallable<OwnProfileEditRequest, OwnProfileResponse>(
        functions,
        "editRecordAttempt",
      );
      await call({
        case: "editOwnProfile",
        profileData: { ...fields, PhoneNumber: phone },
      });

      setUserData({ ...editableData });
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
  }, [editableData, refreshProfile]);

  const handleCancel = useCallback(() => {
    if (userData) setEditableData(userData);
    setFieldErrors({});
    setIsEditing(false);
  }, [userData]);

  const handleAvatarChange = useCallback((file: File) => {
    if (file.size > MAX_AVATAR_BYTES) {
      setError(AVATAR_TOO_LARGE);
      return;
    }
    setSelectedAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }, []);

  const handleAvatarUpload = useCallback(async (): Promise<ProfileResult> => {
    if (!selectedAvatar) {
      setError(NO_AVATAR_SELECTED);
      return { ok: false, message: NO_AVATAR_SELECTED };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const imageData = await fileToWebPDataUrl(selectedAvatar);
      const call = httpsCallable<AvatarUploadRequest, UploadResponse>(
        functions,
        "editRecordAttempt",
      );
      const resp = await call({ case: "uploadAvatar", imageData });

      const newUrl = resp.data?.url || avatarPreview;
      setUserData((prev) => ({ ...(prev || {}), Avatar: newUrl || undefined }));
      setAvatarPreview(newUrl || null);
      setAvatarEditing(false);
      setSelectedAvatar(null);
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
  }, [selectedAvatar, avatarPreview, refreshProfile]);

  const handleAvatarCancel = useCallback(() => {
    setAvatarEditing(false);
    setSelectedAvatar(null);
    setAvatarPreview(userData?.Avatar || DEFAULT_AVATAR);
  }, [userData?.Avatar]);

  const totalPages = Math.ceil(modificationLogs.length / itemsPerPage) || 1;

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return modificationLogs.slice(start, start + itemsPerPage);
  }, [modificationLogs, currentPage, itemsPerPage]);

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
    const after = toEditableFields(editableData);
    return (Object.keys(before) as Array<keyof ProfileEditableFields>).some(
      (key) => before[key] !== after[key],
    );
  }, [userData, editableData]);

  return {
    userData,
    editableData,
    staffRoles,
    staffCode,
    modificationLogs,
    paginatedLogs,
    loadingLogs,
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
    selectedAvatar,
    avatarPreview,
    fileInputRef,
    setEditableData,
    setAvatarEditing,
    setItemsPerPage,
    setActiveTab,
    setIsEditing,
    setError,
    setSuccess,
    refreshLogs,
    handlePageChange,
    nextPage,
    prevPage,
    handleChange,
    handleCityChange,
    handleSave,
    handleCancel,
    handleAvatarChange,
    handleAvatarUpload,
    handleAvatarCancel,
  };
}
