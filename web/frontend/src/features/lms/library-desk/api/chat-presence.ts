import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatSenderRole } from "@/features/lms/library-desk/types/chat-types";

const PRESENCE_TTL_MS = 10_000;

function presenceRef(chatId: string, uid: string) {
  return doc(db, "chats", chatId, "presence", uid);
}

function toMillis(value: unknown): number | null {
  const candidate = value as { toMillis?: () => number } | null;
  if (candidate && typeof candidate.toMillis === "function") {
    try {
      return candidate.toMillis();
    } catch {
      return null;
    }
  }
  return null;
}

export async function publishTyping(
  chatId: string,
  uid: string,
  role: ChatSenderRole,
  name: string,
  typing: boolean,
): Promise<void> {
  if (!chatId || !uid) return;
  try {
    if (!typing) {
      await deleteDoc(presenceRef(chatId, uid));
      return;
    }
    await setDoc(presenceRef(chatId, uid), {
      typing: true,
      role,
      name,
      at: serverTimestamp(),
    });
  } catch {
  }
}

export interface TypingState {
  typing: boolean;
  name: string;
}

export function useOtherTyping(
  chatId: string | null,
  ownUid: string | null,
): TypingState {
  const [state, setState] = useState<TypingState>({ typing: false, name: "" });

  useEffect(() => {
    if (!chatId) {
      setState({ typing: false, name: "" });
      return;
    }

    let expiry: ReturnType<typeof setTimeout> | null = null;

    const stop = onSnapshot(
      collection(db, "chats", chatId, "presence"),
      (snapshot) => {
        if (expiry) clearTimeout(expiry);

        for (const entry of snapshot.docs) {
          if (entry.id === ownUid) continue;
          const data = entry.data({ serverTimestamps: "estimate" }) as Record<
            string,
            unknown
          >;
          if (data.typing !== true) continue;

          const at = toMillis(data.at);
          const age = at === null ? 0 : Date.now() - at;
          if (age > PRESENCE_TTL_MS) continue;

          setState({ typing: true, name: String(data.name ?? "") });
          expiry = setTimeout(
            () => setState({ typing: false, name: "" }),
            PRESENCE_TTL_MS - age,
          );
          return;
        }

        setState({ typing: false, name: "" });
      },
      () => {
        setState({ typing: false, name: "" });
      },
    );

    return () => {
      if (expiry) clearTimeout(expiry);
      stop();
    };
  }, [chatId, ownUid]);

  return state;
}

export function clearTyping(chatId: string, uid: string): void {
  if (!chatId || !uid) return;
  void deleteDoc(presenceRef(chatId, uid)).catch(() => {
  });
}
