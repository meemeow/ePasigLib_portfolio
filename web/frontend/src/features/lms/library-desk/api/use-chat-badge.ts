import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth/use-auth";
import { CHAT_ROLE } from "@/features/lms/library-desk/api/desk-sections";
import type { ChatBadge } from "@/features/lms/library-desk/types/chat-types";

export function useChatBadge(): {
  badge: ChatBadge | null;
  version: number;
  refresh: () => void;
} {
  const { staffRoles, staffCode } = useAuth();
  const enabled = !!staffRoles?.[CHAT_ROLE];

  const [badge, setBadge] = useState<ChatBadge | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setBadge(null);
      return;
    }

    const stop = onSnapshot(
      query(
        collection(db, "chats"),
        where("Status", "in", ["waiting", "active"]),
      ),
      (snapshot) => {
        let waiting = 0;
        let mine = 0;
        for (const doc of snapshot.docs) {
          const chat = doc.data() as Record<string, unknown>;
          if (chat.Status === "waiting") {
            waiting += 1;
            continue;
          }
          if (staffCode && String(chat.TakenBy ?? "") === staffCode) {
            mine += Number(chat.UnreadStaff) || 0;
          }
        }
        setBadge({ count: waiting + mine, waiting, mine });
        setVersion((n) => n + 1);
      },
      (error) => {
        console.warn("Could not watch the chat queue", error);
        setBadge(null);
      },
    );

    return stop;
  }, [enabled, staffCode]);

  return useMemo(
    () => ({
      badge,
      version,
      refresh: () => setVersion((n) => n + 1),
    }),
    [badge, version],
  );
}
