import { useCallback, useState } from "react";
import { useDebouncedLookup } from "@/hooks/use-debounced-lookup";
import {
  copiesSearchSchema,
  patronsSearchSchema,
} from "@/features/lms/circulations/schema/circulations-schema";
import type {
  BookCopy,
  CollectionLite,
  CopyHit,
  Patron,
} from "@/features/lms/circulations/types/circulation-transaction-types";
import { callCirculation as call } from "@/lib/api/callables";


const LOOKUP_DEBOUNCE_MS = 400;

export async function searchPatronsApi(term: string): Promise<Patron[]> {
  const payload = patronsSearchSchema.parse({ term });
  const res = await call({ case: "searchPatrons", ...payload });
  return Array.isArray(res?.data) ? (res.data as Patron[]) : [];
}

export async function searchCopiesApi(term: string): Promise<CopyHit[]> {
  const payload = copiesSearchSchema.parse({ term });
  const res = await call({ case: "searchCopies", ...payload });
  return Array.isArray(res?.data) ? (res.data as CopyHit[]) : [];
}

export function usePatronLookup() {
  const lookup = useDebouncedLookup<Patron>(
    searchPatronsApi,
    LOOKUP_DEBOUNCE_MS,
  );
  const [selected, setSelected] = useState<Patron | null>(null);
  const [revalidating, setRevalidating] = useState(false);

  const select = useCallback((patron: Patron | null) => {
    setSelected(patron);
  }, []);

  const clear = useCallback(() => {
    setSelected(null);
    lookup.reset();
  }, [lookup]);

  const revalidate = useCallback(async () => {
    if (!selected) {
      lookup.refresh();
      return;
    }
    const key = String(selected.PublicUID || selected.UID || selected.id || "");
    if (!key) return;
    setRevalidating(true);
    try {
      const found = await searchPatronsApi(key);
      const fresh = found.find((patron) => patron.id === selected.id);
      if (fresh) setSelected(fresh);
    } catch {
    } finally {
      setRevalidating(false);
    }
  }, [selected, lookup]);

  return {
    ...lookup,
    selected,
    select,
    clear,
    revalidate,
    refreshing: lookup.searching || revalidating,
  } as const;
}

export function useCopyLookup() {
  const lookup = useDebouncedLookup<CopyHit>(
    searchCopiesApi,
    LOOKUP_DEBOUNCE_MS,
  );
  const [book, setBook] = useState<CollectionLite | null>(null);
  const [copy, setCopy] = useState<BookCopy | null>(null);
  const [revalidating, setRevalidating] = useState(false);

  const select = useCallback((hit: CopyHit) => {
    setBook(hit.book);
    setCopy(hit.copy);
  }, []);

  const deselect = useCallback(() => {
    setBook(null);
    setCopy(null);
  }, []);

  const clear = useCallback(() => {
    setBook(null);
    setCopy(null);
    lookup.reset();
  }, [lookup]);

  const revalidate = useCallback(async () => {
    if (!copy) {
      lookup.refresh();
      return;
    }
    const accession = String(copy.Accession || "");
    if (!accession) return;
    setRevalidating(true);
    try {
      const found = await searchCopiesApi(accession);
      const fresh = found.find((hit) => hit.copy.Accession === accession);
      if (fresh) {
        setBook(fresh.book);
        setCopy(fresh.copy);
      }
    } catch {
    } finally {
      setRevalidating(false);
    }
  }, [copy, lookup]);

  return {
    ...lookup,
    book,
    copy,
    select,
    deselect,
    clear,
    revalidate,
    refreshing: lookup.searching || revalidating,
  } as const;
}
