import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cachedFetch } from "@/lib/fetching-data-cache";
import { invalidatePatronCaches } from "@/features/lms/patrons/pages/index/api/patrons-cache";
import { readCallableError } from "@/lib/api/callable-error";
import { useAuth } from "@/lib/auth/use-auth";
import type {
  UnverifiedPatronsResponse,
  VerifyAction,
  VerifyPatron,
  VerifyPatronRequest,
  VerifyPatronResponse,
  VerifyPatronResult,
} from "@/features/lms/patrons/pages/verify-patron/types/patrons-verify-types";
import { getVerifyPatronFieldErrors } from "@/features/lms/patrons/pages/verify-patron/schema/patrons-verify-schema";

const GENERIC_ERROR =
  "Failed to process the verification. Please try again in a moment.";
const NO_PERMISSION_ERROR =
  "You do not have permission to verify patron IDs. Please contact an administrator.";
const THROTTLED_MSG = "Please wait a moment before trying again.";
const LOAD_ERROR = "Failed to load unverified patrons. Please refresh.";
const APPROVED_MSG = "Patron account verified successfully.";
const REJECTED_MSG = "Patron verification rejected.";

export function useVerifyPatrons() {
  const { userType, staffRoles } = useAuth();

  const [patrons, setPatrons] = useState<VerifyPatron[]>([]);
  const [paginated, setPaginated] = useState<VerifyPatron[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canVerify = userType === "Staff" && !!staffRoles?.VerifyIDs;

  const refreshUnverified = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cachedFetch<UnverifiedPatronsResponse>(
        "unverifiedPatrons",
        {},
        { force: true },
      );
      const list: VerifyPatron[] = Array.isArray(res) ? res : res?.data || [];
      setPatrons(list);
      setCurrentPage(1);
    } catch (e) {
      console.error("Failed to refresh unverified patrons", e);
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUnverified();
  }, [refreshUnverified]);

  const paginateData = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const totalPages = Math.ceil(patrons.length / itemsPerPage) || 1;

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    setPaginated(patrons.slice(startIndex, startIndex + itemsPerPage));
  }, [patrons, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const verifyPatronID = useCallback(
    async (
      action: VerifyAction,
      patron: VerifyPatron,
      remarks: string = "",
    ): Promise<VerifyPatronResult> => {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      try {
        if (!canVerify) {
          setError(NO_PERMISSION_ERROR);
          return { ok: false, message: NO_PERMISSION_ERROR };
        }

        const fieldErrors = getVerifyPatronFieldErrors({ action, remarks });
        if (fieldErrors) {
          const message =
            fieldErrors.remarks || fieldErrors.action || "Invalid input";
          setError(message);
          return { ok: false, message, fieldErrors };
        }

        const call = httpsCallable<VerifyPatronRequest, VerifyPatronResponse>(
          functions,
          "editRecordAttempt",
        );
        await call({
          case: "verifyUnverifiedPatrons",
          action,
          targetUID: patron.id,
          remarks,
        });

        const message = action === "approve" ? APPROVED_MSG : REJECTED_MSG;
        setSuccess(message);
        invalidatePatronCaches();
        await refreshUnverified();
        return { ok: true, message };
      } catch (e: unknown) {
        const { code, message } = readCallableError(e);

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

        if (
          (code === "functions/failed-precondition" ||
            code === "functions/not-found" ||
            code === "functions/invalid-argument") &&
          message
        ) {
          setError(message);
          return { ok: false, message };
        }

        setError(GENERIC_ERROR);
        return { ok: false, message: GENERIC_ERROR };
      } finally {
        setProcessing(false);
      }
    },
    [canVerify, refreshUnverified],
  );

  return {
    loading,
    processing,
    error,
    success,
    setError,
    setSuccess,
    canVerify,
    paginated,
    totalPages,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    paginateData,
    refreshUnverified,
    verifyPatronID,
  };
}
