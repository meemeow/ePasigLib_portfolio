import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { fetchBookRequestsApi } from "@/features/lms/library-desk/api/desk-api";
import {
  deleteBookRequestGroup,
  setBookRequestStatus,
} from "@/features/lms/library-desk/api/book-request-mutations";
import { BOOK_REQUESTS_ROLE } from "@/features/lms/library-desk/api/desk-sections";
import type {
  BookRequestGroup,
  BookRequestStatus,
} from "@/features/lms/library-desk/types/book-request-types";

export interface ModalState {
  type: "success" | "error";
  message: string;
}

export const CHART_LIMIT = 5;

export type StatusFilter = "all" | BookRequestStatus;

export function useBookRequestsPage() {
  const { staffRoles } = useAuth();
  const canManage = !!staffRoles?.[BOOK_REQUESTS_ROLE];

  const [groups, setGroups] = useState<BookRequestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Under Review");

  const [deleteTarget, setDeleteTarget] = useState<BookRequestGroup | null>(
    null,
  );
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [pendingId, setPendingId] = useState<string | null>(null);

  const [decision, setDecision] = useState<{
    group: BookRequestGroup;
    status: BookRequestStatus;
  } | null>(null);

  const mountedRef = useRef(true);

  const load = useCallback(async (isRefresh?: boolean): Promise<void> => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    const data = await fetchBookRequestsApi(isRefresh);
    if (!mountedRef.current) return;
    if (!data) {
      setError("Could not load book requests. Try Refresh.");
    } else {
      setGroups(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const matchesSearch = useCallback(
    (group: BookRequestGroup): boolean => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return `${group.Title} ${group.Author}`.toLowerCase().includes(term);
    },
    [search],
  );

  const filtered = useMemo(
    () =>
      groups.filter(
        (group) =>
          (statusFilter === "all" || group.Status === statusFilter) &&
          matchesSearch(group),
      ),
    [groups, statusFilter, matchesSearch],
  );

  const undecided = useMemo(
    () =>
      groups.filter(
        (group) => group.Status === "Under Review" && matchesSearch(group),
      ),
    [groups, matchesSearch],
  );

  const totals = useMemo(
    () => ({
      titles: groups.length,
      requests: groups.reduce((sum, group) => sum + group.Count, 0),
      requesters: groups.reduce((sum, group) => sum + group.Requesters, 0),
      underReview: groups.filter((g) => g.Status === "Under Review").length,
      approved: groups.filter((g) => g.Status === "Approved").length,
      declined: groups.filter((g) => g.Status === "Declined").length,
    }),
    [groups],
  );

  const chartData = useMemo(
    () => undecided.slice(0, CHART_LIMIT),
    [undecided],
  );

  const requestDecision = useCallback(
    (group: BookRequestGroup, status: BookRequestStatus) => {
      setDecision({ group, status });
    },
    [],
  );

  const cancelDecision = useCallback(() => setDecision(null), []);

  const confirmDecision = useCallback(async (): Promise<void> => {
    if (!decision) return;
    const { group, status } = decision;
    setPendingId(group.id);
    setModal(null);
    try {
      const result = await setBookRequestStatus(group, status);
      if (!mountedRef.current) return;
      setDecision(null);
      setModal({
        type: "success",
        message:
          status === "Under Review"
            ? `"${group.Title}" is back under review.`
            : `"${group.Title}" ${status.toLowerCase()} — ${result.affected} request${
                result.affected === 1 ? "" : "s"
              } updated.`,
      });
      await load(true);
    } catch (err) {
      if (!mountedRef.current) return;
      setDecision(null);
      setModal({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not update the book request.",
      });
    } finally {
      if (mountedRef.current) setPendingId(null);
    }
  }, [decision, load]);

  const requestDelete = useCallback((group: BookRequestGroup) => {
    setDeleteConfirmed(false);
    setDeleteTarget(group);
  }, []);

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleting(true);
    setModal(null);
    try {
      const result = await deleteBookRequestGroup(deleteTarget);
      setDeleteTarget(null);
      setDeleteConfirmed(false);
      setModal({
        type: "success",
        message: `Removed ${result.affected} request${
          result.affected === 1 ? "" : "s"
        } for "${deleteTarget.Title}".`,
      });
      await load(true);
    } catch (err) {
      setModal({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not remove the book request.",
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, load]);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
    setDeleteConfirmed(false);
  }, []);

  return {
    groups: filtered,
    chartData,
    chartTotal: undecided.length,
    totals,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    canManage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    modal,
    setModal,
    pendingId,
    decision,
    requestDecision,
    confirmDecision,
    cancelDecision,
    deleteTarget,
    requestDelete,
    deleteConfirmed,
    setDeleteConfirmed,
    deleting,
    confirmDelete,
    cancelDelete,
  };
}
