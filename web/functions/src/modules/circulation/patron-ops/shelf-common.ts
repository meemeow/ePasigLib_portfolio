import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { isLendable } from "../circulation-policy";


export type AnyObj = Record<string, any>;


export const HttpsError = functions.https.HttpsError;


export function bookRef(bookId: string, book: AnyObj) {
  return {
    id: bookId,
    CollectionTitle: String(book.CollectionTitle || ""),
    MainAuthor: String(book.MainAuthor || ""),
    CollectionImage: String(book.CollectionImage || ""),
    ClassCode: String(book.ClassCode || ""),
    MaterialType: String(book.MaterialType || ""),
    Year: String(book.PublicationYear || book.CopyrightYear || ""),
    CartStatus: cartStatus(book),
  };
}


export type CartStatus =
  "ok" | "availableSoon" | "allOut" | "libraryUse" | "noCopies";


export function cartStatus(book: AnyObj): CartStatus {
  const copies = Array.isArray(book.Copies) ? book.Copies : [];
  if (copies.length === 0) return "noCopies";
  const lendable = copies.filter((copy: AnyObj) => isLendable(copy));
  if (!lendable.length) return "libraryUse";
  if (
    lendable.some(
      (copy: AnyObj) => String(copy?.Availability || "") === "Available",
    )
  ) {
    return "ok";
  }
  return lendable.some((copy: AnyObj) => {
    const state = String(copy?.Availability || "");
    return state === "Pending" || state === "Reserved";
  })
    ? "availableSoon"
    : "allOut";
}


export const CART_STATUS_MESSAGE: Record<Exclude<CartStatus, "ok">, string> = {
  availableSoon:
    "Every copy is spoken for, but one is on a reservation rather than on loan — those usually come back within a few days. Try again shortly.",
  allOut:
    "Every copy of this title is out on loan right now. Try again once one comes back.",
  libraryUse: "This title is for library use only and cannot be borrowed.",
  noCopies: "No copies of this title are catalogued yet.",
};


export async function requirePatronSelf(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  claimed: string,
): Promise<{
  ref: FirebaseFirestore.DocumentReference;
  data: AnyObj;
  uid: string;
}> {
  if (!authUid) throw new HttpsError("unauthenticated", "Sign in to continue.");

  const snap = await db.collection("patrons").doc(authUid).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "Only patrons can do this.");
  }
  const data = snap.data() as AnyObj;
  const uid = String(data.UID || "");

  const target = String(claimed || "").trim();
  if (target && target !== authUid && target !== uid) {
    throw new HttpsError(
      "permission-denied",
      "You may only act on your own record.",
    );
  }
  return { ref: snap.ref, data, uid };
}


export async function freshLists(
  db: FirebaseFirestore.Firestore,
  ref: FirebaseFirestore.DocumentReference,
  cart: AnyObj,
  saved: AnyObj,
): Promise<{ cart: AnyObj; saved: AnyObj }> {
  const cartIds = Object.keys(cart);
  const savedIds = Object.keys(saved);
  const ids = [...new Set([...cartIds, ...savedIds])];
  if (!ids.length) return { cart, saved };

  const snaps = await db.getAll(
    ...ids.map((id) => db.collection("collections").doc(id)),
  );
  const byId = new Map<string, FirebaseFirestore.DocumentSnapshot>();
  for (const snap of snaps) byId.set(snap.id, snap);

  const statusOf = (id: string): CartStatus => {
    const snap = byId.get(id);
    return snap?.exists ? cartStatus(snap.data() as AnyObj) : "noCopies";
  };

  const outCart: AnyObj = {};
  for (const id of cartIds) {
    outCart[id] = { ...cart[id], CartStatus: statusOf(id) };
  }

  const outSaved: AnyObj = {};
  const writes: unknown[] = [];
  for (const id of savedIds) {
    const row = saved[id];
    const snap = byId.get(id);
    const incomplete = !(row && "CartStatus" in row && "ClassCode" in row);

    if (incomplete && snap?.exists) {
      const rebuilt = bookRef(id, snap.data() as AnyObj);
      outSaved[id] = rebuilt;
      writes.push(new admin.firestore.FieldPath("SavedList", id), rebuilt);
      continue;
    }
    outSaved[id] = { ...row, CartStatus: statusOf(id) };
  }

  if (writes.length) {
    try {
      await ref.update(
        writes[0] as admin.firestore.FieldPath,
        writes[1],
        ...writes.slice(2),
      );
    } catch (error) {
      console.warn("Could not persist backfilled saved rows", error);
    }
  }

  return { cart: outCart, saved: outSaved };
}
