import * as admin from "firebase-admin";
import { loadPolicy } from "../circulation-policy";
import { AnyObj, bookRef, requirePatronSelf } from "./shelf-common";


// ==========================================
// || SAVED                                 ||
// ==========================================

export async function savedAdd(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { patronIdOrUID: string; book: AnyObj },
) {
  const { ref } = await requirePatronSelf(db, authUid, input.patronIdOrUID);
  const bookId = String(input.book?.id || "").trim();
  if (!bookId) return { ok: false, error: "Invalid book." };

  const [bookSnap, policy] = await Promise.all([
    db.collection("collections").doc(bookId).get(),
    loadPolicy(db),
  ]);
  if (!bookSnap.exists) return { ok: false, error: "Book not found." };

  const row = bookRef(bookId, bookSnap.data() as AnyObj);

  const full = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const saved = ((snap.data() as AnyObj)?.SavedList || {}) as AnyObj;
    if (
      !(bookId in saved) &&
      Object.keys(saved).length >= policy.MaxSavedItems
    ) {
      return true;
    }
    tx.update(ref, new admin.firestore.FieldPath("SavedList", bookId), row);
    tx.update(ref, {
      SavedIds: admin.firestore.FieldValue.arrayUnion(bookId),
    });
    return false;
  });

  if (full) {
    return {
      ok: false,
      error: `Your saved list is full (${policy.MaxSavedItems} titles).`,
    };
  }
  return { ok: true, book: row };
}

export async function savedRemove(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { patronIdOrUID: string; bookId: string },
) {
  const { ref } = await requirePatronSelf(db, authUid, input.patronIdOrUID);
  const bookId = String(input.bookId || "").trim();
  if (!bookId) return { ok: false, error: "Invalid book." };
  await ref.update(
    new admin.firestore.FieldPath("SavedList", bookId),
    admin.firestore.FieldValue.delete(),
  );
  await ref.update({
    SavedIds: admin.firestore.FieldValue.arrayRemove(bookId),
  });
  return { ok: true };
}
