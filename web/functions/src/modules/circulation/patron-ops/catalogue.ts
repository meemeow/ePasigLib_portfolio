import { isLendable } from "../circulation-policy";
import { AnyObj } from "./shelf-common";


// ==========================================
// || CATALOGUE                             ||
// ==========================================

export async function reservableCopies(
  db: FirebaseFirestore.Firestore,
  bookId: string,
) {
  const id = String(bookId || "").trim();
  if (!id) return { count: 0, available: 0 };

  const snap = await db.collection("collections").doc(id).get();
  if (!snap.exists) return { count: 0, available: 0 };

  const copies: AnyObj[] = Array.isArray((snap.data() as AnyObj).Copies)
    ? (snap.data() as AnyObj).Copies
    : [];
  const lendable = copies.filter(isLendable);
  return {
    count: lendable.length,
    available: lendable.filter(
      (c) => String(c.Availability || "") === "Available",
    ).length,
  };
}
