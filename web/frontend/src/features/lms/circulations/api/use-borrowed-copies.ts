import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBorrowedBooksApi } from "@/features/lms/circulations/api/circulation-records-api";
import type { BorrowedBookRow } from "@/features/lms/circulations/types/circulation-transaction-types";

export function useBorrowedCopies(patronIdOrUID: string) {
  const [books, setBooks] = useState<BorrowedBookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const seqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (id: string) => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    const response = await fetchBorrowedBooksApi(id);
    if (seq !== seqRef.current || !mountedRef.current) return;
    if (response) {
      setBooks(response.books);
    } else {
      setBooks([]);
      setError("Could not load this patron's borrowed copies.");
    }
    setSelectedKey(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!patronIdOrUID) {
      seqRef.current++;
      setBooks([]);
      setSelectedKey(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load(patronIdOrUID);
  }, [patronIdOrUID, load]);

  const reload = useCallback(() => {
    if (patronIdOrUID) void load(patronIdOrUID);
  }, [patronIdOrUID, load]);

  const selected = books.find((row) => row.BorrowID === selectedKey) ?? null;

  const select = useCallback((row: BorrowedBookRow | null) => {
    setSelectedKey(row ? row.BorrowID : null);
  }, []);

  return { books, loading, error, selected, select, reload } as const;
}

export type BorrowedCopiesState = ReturnType<typeof useBorrowedCopies>;
