import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBookFromGoogleBooks } from "@/features/lms/collections/pages/register-collection/api/collections-register-logic";
import type {
  GoogleBooksLookupResponse,
  GoogleBooksVolume,
  IsbnLookupState,
} from "@/features/lms/collections/pages/register-collection/types/collections-register-types";

const DEBOUNCE_DELAY = 700;
const CACHE_TTL = 60 * 60 * 1000;

interface CacheEntry {
  response: GoogleBooksLookupResponse;
  timestamp: number;
}

const lookupCache: Record<string, CacheEntry> = {};

const normalize = (value: string): string =>
  value.replace(/[^0-9Xx]/g, "").toUpperCase();

export function useIsbnLookup(onVolume: (volume: GoogleBooksVolume) => void) {
  const [isbn, setIsbn] = useState("");
  const [state, setState] = useState<IsbnLookupState>("idle");
  const [volume, setVolume] = useState<GoogleBooksVolume | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const onVolumeRef = useRef(onVolume);

  useEffect(() => {
    onVolumeRef.current = onVolume;
  }, [onVolume]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const settle = useCallback((response: GoogleBooksLookupResponse): void => {
    setState(response.status);
    setVolume(response.volume);
    if (response.status === "found" && response.volume) {
      onVolumeRef.current(response.volume);
    }
  }, []);

  const lookup = useCallback(
    async (value: string): Promise<void> => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setState("searching");
      try {
        const response = await fetchBookFromGoogleBooks(value);
        if (!isMountedRef.current || requestIdRef.current !== requestId) return;

        if (response.status === "found") {
          lookupCache[normalize(value)] = {
            response,
            timestamp: Date.now(),
          };
        }
        settle(response);
      } catch (error) {
        console.error("[ISBN lookup] failed:", error);
        if (!isMountedRef.current || requestIdRef.current !== requestId) return;
        setState("error");
        setVolume(null);
      }
    },
    [settle],
  );

  const handleChange = useCallback(
    (value: string): void => {
      setIsbn(value);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const key = normalize(value);
      if (!key) {
        requestIdRef.current += 1;
        setState("idle");
        setVolume(null);
        return;
      }

      const cached = lookupCache[key];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        requestIdRef.current += 1;
        settle(cached.response);
        return;
      }

      setState("typing");
      debounceTimerRef.current = setTimeout(
        () => lookup(value),
        DEBOUNCE_DELAY,
      );
    },
    [lookup, settle],
  );

  const clear = useCallback((): void => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    requestIdRef.current += 1;
    setIsbn("");
    setState("idle");
    setVolume(null);
  }, []);

  return { isbn, setIsbn: handleChange, state, volume, clear };
}
