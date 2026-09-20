import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cachedFetch } from "@/lib/fetching-data-cache";
import {
  libraryStatus,
  msUntilStatusChange,
  type LibraryStatus,
  type RuntimeClosures,
} from "@/lib/library-hours";

export function useLibraryStatus(refreshKey?: unknown): LibraryStatus {
  const [now, setNow] = useState(() => new Date());
  const [closures, setClosures] = useState<RuntimeClosures>({});

  const live = useRef(false);

  useEffect(() => {
    const stop = onSnapshot(
      doc(db, "metadata", "library_calendar"),
      (snap) => {
        const data = snap.data() as { Closures?: RuntimeClosures } | undefined;
        live.current = true;
        setClosures(data?.Closures ?? {});
      },
      (error) => {
        live.current = false;
        console.error("Could not watch the library calendar:", error);
      },
    );
    return stop;
  }, []);

  useEffect(() => {
    const wait = msUntilStatusChange(now) + 1000;
    const timer = window.setTimeout(() => setNow(new Date()), wait);
    return () => window.clearTimeout(timer);
  }, [now]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const data = await cachedFetch<{ closures?: RuntimeClosures }>(
          "libraryCalendar",
          {},
          refreshKey === undefined ? undefined : { force: true },
        );
        if (mounted && !live.current && data?.closures) {
          setClosures(data.closures);
        }
      } catch {
      }
    })();
    return () => {
      mounted = false;
    };
  }, [now, refreshKey]);

  return useMemo(() => libraryStatus(now, closures), [now, closures]);
}
