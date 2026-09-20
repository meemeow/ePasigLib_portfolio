import * as admin from "firebase-admin";
import { increment } from "../../core/firebase";

export const UNREAD_PERSONAL_FIELD = "UnreadPersonal";
export const UNREAD_ANNOUNCEMENTS_FIELD = "UnreadAnnouncements";
export const UNREAD_NEWS_FIELD = "UnreadNews";

export const NEWS_BADGE_MUTED_FIELD = "NewsBadgeMuted";

const ANNOUNCEMENT_TYPES = new Set(["Announcement", "AnnouncementReply"]);
const NEWS_TYPES = new Set(["News"]);

export function isUpdateType(type: unknown): boolean {
  const key = String(type ?? "");
  return ANNOUNCEMENT_TYPES.has(key) || NEWS_TYPES.has(key);
}

export function unreadFieldFor(type: unknown): string {
  const key = String(type ?? "");
  if (ANNOUNCEMENT_TYPES.has(key)) return UNREAD_ANNOUNCEMENTS_FIELD;
  if (NEWS_TYPES.has(key)) return UNREAD_NEWS_FIELD;
  return UNREAD_PERSONAL_FIELD;
}

export function unreadIncrements(
  type: unknown,
  by: number,
): Record<string, admin.firestore.FieldValue> {
  return {
    [unreadFieldFor(type)]: increment(by),
  };
}

export async function markRowsReadAndSettle(
  db: FirebaseFirestore.Firestore,
  ownerRef: FirebaseFirestore.DocumentReference,
  rowRefs: FirebaseFirestore.DocumentReference[],
): Promise<number> {
  if (rowRefs.length === 0) return 0;

  return db.runTransaction(async (tx) => {
    const [ownerSnap, ...rowSnaps] = await tx.getAll(ownerRef, ...rowRefs);

    const perField = new Map<string, number>();
    const toFlip: FirebaseFirestore.DocumentReference[] = [];

    for (const snap of rowSnaps) {
      if (!snap.exists || snap.get("read") === true) continue;
      toFlip.push(snap.ref);
      const field = unreadFieldFor(snap.get("type"));
      perField.set(field, (perField.get(field) ?? 0) + 1);
    }

    if (toFlip.length === 0) return 0;

    for (const ref of toFlip) tx.update(ref, { read: true });

    const owner = ownerSnap.data() ?? {};
    const patch: Record<string, number> = {};
    for (const [field, count] of perField) {
      patch[field] = Math.max(0, readCounter(owner[field]) - count);
    }
    tx.set(ownerRef, patch, { merge: true });

    return toFlip.length;
  });
}

export function readCounter(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
