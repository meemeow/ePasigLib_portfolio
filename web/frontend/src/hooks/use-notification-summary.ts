import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { callCirculation as callable } from "@/lib/api/callables";

export interface NotificationSummary {
  unread: number;
  unreadUpdates: number;
  unreadAnnouncements: number;
  unreadNews: number;
  unreadChats: number;
  newsMuted: boolean;
}

const EMPTY: NotificationSummary = {
  unread: 0,
  unreadUpdates: 0,
  unreadAnnouncements: 0,
  unreadNews: 0,
  unreadChats: 0,
  newsMuted: false,
};

let state: NotificationSummary = EMPTY;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NotificationSummary {
  return state;
}

function setState(next: NotificationSummary): void {
  const same =
    next.unread === state.unread &&
    next.unreadUpdates === state.unreadUpdates &&
    next.unreadAnnouncements === state.unreadAnnouncements &&
    next.unreadNews === state.unreadNews &&
    next.unreadChats === state.unreadChats &&
    next.newsMuted === state.newsMuted;
  if (same) return;
  state = next;
  for (const listener of listeners) listener();
}

let latestRequest = 0;

export function useNotificationSummary(): NotificationSummary & {
  refresh: () => void;
  setNewsMuted: (muted: boolean) => Promise<void>;
  markUpdateRead: (updateId: string) => Promise<void>;
  markAllRead: (kind: "personal" | "announcements" | "news") => Promise<void>;
} {
  const { user, userType } = useAuth();
  const summary = useSyncExternalStore(subscribe, getSnapshot);

  const isPatron = Boolean(user) && userType === "Patron";
  const uid = user?.uid ?? "";

  const refresh = useCallback(async () => {
    const ticket = ++latestRequest;

    if (!isPatron || !uid) {
      setState(EMPTY);
      return;
    }
    try {
            const res = await callable({ case: "notification_summary", uid });
      const data = (res.data ?? {}) as Partial<NotificationSummary>;
      if (ticket !== latestRequest) return;
      setState({
        unread: Number(data.unread) || 0,
        unreadUpdates: Number(data.unreadUpdates) || 0,
        unreadAnnouncements: Number(data.unreadAnnouncements) || 0,
        unreadNews: Number(data.unreadNews) || 0,
        unreadChats: Number(data.unreadChats) || 0,
        newsMuted: Boolean(data.newsMuted),
      });
    } catch (error) {
      console.error("Failed to read the notification summary:", error);
    }
  }, [isPatron, uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setNewsMuted = useCallback(
    async (muted: boolean) => {
      if (!isPatron || !uid) return;
      setState({ ...state, newsMuted: muted });
      try {
                await callable({ case: "set_news_badge_muted", uid, muted });
      } catch (error) {
        console.error("Could not change the news badge setting:", error);
      } finally {
        await refresh();
      }
    },
    [isPatron, uid, refresh],
  );

  const markUpdateRead = useCallback(
    async (updateId: string) => {
      if (!isPatron || !uid || !updateId) return;
      setState({
        ...state,
        unreadUpdates: Math.max(0, state.unreadUpdates - 1),
      });
      try {
                await callable({ case: "mark_update_read", uid, updateId });
      } catch (error) {
        console.error("Could not mark the update read:", error);
      } finally {
        await refresh();
      }
    },
    [isPatron, uid, refresh],
  );

  const markAllRead = useCallback(
    async (kind: "personal" | "announcements" | "news") => {
      if (!isPatron || !uid) return;

      const announcements =
        kind === "announcements" ? 0 : state.unreadAnnouncements;
      const news = kind === "news" ? 0 : state.unreadNews;
      setState({
        ...state,
        unread: kind === "personal" ? 0 : state.unread,
        unreadAnnouncements: announcements,
        unreadNews: news,
        unreadUpdates: announcements + (state.newsMuted ? 0 : news),
      });

      try {
                await callable({ case: "mark_bucket_read", uid, kind });
      } catch (error) {
        console.error("Could not mark the notifications read:", error);
      } finally {
        await refresh();
      }
    },
    [isPatron, uid, refresh],
  );

  return {
    ...summary,
    refresh,
    setNewsMuted,
    markUpdateRead,
    markAllRead,
  };
}
