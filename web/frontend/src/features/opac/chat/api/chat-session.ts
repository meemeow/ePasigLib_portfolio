import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";

export async function ensureChatIdentity(): Promise<string> {
  const existing = auth.currentUser;
  if (existing) return existing.uid;

  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

export function currentChatUid(): string | null {
  return auth.currentUser?.uid ?? null;
}
