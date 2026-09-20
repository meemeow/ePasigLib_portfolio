import { useCallback, useEffect, useRef, useState } from "react";

export const LOOKUP_DEBOUNCE_MS = 700;

export function useDebouncedLookup<T>(
  run: (term: string) => Promise<T[]>,
  delay = LOOKUP_DEBOUNCE_MS,
) {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const mountedRef = useRef(true);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const search = useCallback(async (trimmed: string) => {
    const seq = ++seqRef.current;
    setSearching(true);
    try {
      const found = await runRef.current(trimmed);
      if (seq !== seqRef.current || !mountedRef.current) return;
      setResults(found);
      setError(null);
    } catch (e) {
      if (seq !== seqRef.current || !mountedRef.current) return;
      setResults([]);
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      if (seq === seqRef.current && mountedRef.current) setSearching(false);
    }
  }, []);

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      if (timerRef.current) clearTimeout(timerRef.current);

      const trimmed = value.trim();
      if (!trimmed) {
        seqRef.current++;
        setResults([]);
        setSearching(false);
        setError(null);
        return;
      }

      setSearching(true);
      timerRef.current = setTimeout(() => search(trimmed), delay);
    },
    [delay, search],
  );

  const refresh = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    void search(trimmed);
  }, [query, search]);

  const reset = useCallback(() => {
    seqRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    setQueryState("");
    setResults([]);
    setSearching(false);
    setError(null);
  }, []);

  return { query, setQuery, results, searching, error, reset, refresh } as const;
}
