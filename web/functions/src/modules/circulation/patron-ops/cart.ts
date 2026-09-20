import * as admin from "firebase-admin";
import { toMillis } from "../../../core/time";
import { CirculationPolicy, holdsRef, loadPolicy, loansRef, patronCircRef, phDateString, renewalOpensAt, stageFor, transactionsRef } from "../circulation-policy";
import { loadCalendar } from "../library-calendar";
import { renewedDueDate } from "../circulation-dates";
import { AnyObj, CART_STATUS_MESSAGE, bookRef, cartStatus, freshLists, requirePatronSelf } from "./shelf-common";


// ==========================================
// || CART                                  ||
// ==========================================

export async function cartAdd(
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

  const book = bookSnap.data() as AnyObj;
  const status = cartStatus(book);
  if (status !== "ok") {
    return { ok: false, error: CART_STATUS_MESSAGE[status] };
  }

  const row = bookRef(bookId, book);

  const full = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cart = ((snap.data() as AnyObj)?.CartList || {}) as AnyObj;
    if (!(bookId in cart) && Object.keys(cart).length >= policy.MaxCartItems) {
      return true;
    }
    tx.update(ref, new admin.firestore.FieldPath("CartList", bookId), row);
    return false;
  });

  if (full) {
    return {
      ok: false,
      error: `Your cart is full (${policy.MaxCartItems} titles).`,
    };
  }
  return { ok: true, book: row };
}


export async function cartRemove(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { patronIdOrUID: string; bookId: string },
) {
  const { ref } = await requirePatronSelf(db, authUid, input.patronIdOrUID);
  const bookId = String(input.bookId || "").trim();
  if (!bookId) return { ok: false, error: "Invalid book." };

  await ref.update(
    new admin.firestore.FieldPath("CartList", bookId),
    admin.firestore.FieldValue.delete(),
  );
  return { ok: true };
}


// ==========================================
// || OVERVIEW                              ||
// ==========================================

export interface CartOverview {
  slotsLeft: number;
  maxSlots: number;
  counts: { loans: number; holds: number; pending: number; total: number };
  cart: AnyObj;
  saved: AnyObj;
  loans: AnyObj[];
  holds: AnyObj[];
  requests: AnyObj[];
  history: { rows: AnyObj[]; hasMore: boolean };
  policy: Pick<
    CirculationPolicy,
    | "LoanPeriodDays"
    | "MaxRenewals"
    | "RenewalPeriodDays"
    | "PickupWindowDays"
    | "HoldRequestExpiryHours"
    | "MaxCartItems"
    | "MaxSavedItems"
  >;
  generatedAt: number;
}


export async function cartOverview(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { patronIdOrUID?: string; historyLimit?: number },
): Promise<CartOverview> {
  const {
    data: patron,
    uid,
    ref: patronRef,
  } = await requirePatronSelf(db, authUid, String(input.patronIdOrUID || ""));
  const [policy, calendar] = await Promise.all([
    loadPolicy(db),
    loadCalendar(db),
  ]);
  const historyLimit = Math.max(
    1,
    Math.min(50, Number(input.historyLimit) || 10),
  );

  const [summarySnap, loansSnap, holdsSnap, requestsSnap, historySnap] =
    await Promise.all([
      patronCircRef(db, uid).get(),
      loansRef(db, uid).orderBy("DueDate", "asc").get(),
      holdsRef(db, uid).orderBy("ShelfExpiresOn", "asc").get(),
      db
        .collection("reservationRequests")
        .where("PatronUID", "==", uid)
        .where("Status", "==", "Pending")
        .get(),
      transactionsRef(db)
        .where("TargetUID", "==", uid)
        .orderBy("ProcessedOn", "desc")
        .limit(historyLimit + 1)
        .get(),
    ]);

  const summary = (summarySnap.exists ? summarySnap.data() : {}) as AnyObj;
  const now = Date.now();

  let pending = 0;
  const requests = requestsSnap.docs.map((doc) => {
    const raw = doc.data() as AnyObj;
    const books = Array.isArray(raw.Books) ? raw.Books : [];
    pending += books.length;
    return {
      id: doc.id,
      Status: String(raw.Status || "Pending"),
      Purpose: String(raw.Purpose || ""),
      RequestedOn: toMillis(raw.RequestedOn),
      ExpiresAt: toMillis(raw.ExpiresAt),
      Books: books,
      BookCount: books.length,
    };
  });

  const loans = loansSnap.docs.map((doc) => {
    const raw = doc.data() as AnyObj;
    const due = toMillis(raw.DueDate);
    const renewalCount = Number(raw.RenewalCount || 0);
    const stage = stageFor(due, now, policy, calendar);

    let ineligible: string | null = null;
    if (renewalCount >= policy.MaxRenewals) {
      ineligible = `Renewed ${renewalCount} of ${policy.MaxRenewals} times`;
    } else if (stage !== "Borrowed") {
      ineligible = "Overdue — return it first";
    } else if (due !== null && now < renewalOpensAt(due, policy)) {
      ineligible = `Renewable from ${phDateString(renewalOpensAt(due, policy))}`;
    }

    return {
      BorrowID: doc.id,
      Accession: String(raw.Accession || ""),
      BookID: String(raw.BookID || ""),
      CollectionTitle: String(raw.CollectionTitle || ""),
      CollectionImage: String(raw.CollectionImage || ""),
      CheckoutBy: String(raw.CheckoutBy || ""),
      CheckoutDate: toMillis(raw.CheckoutDate),
      DueDate: due,
      RenewalCount: renewalCount,
      MaxRenewals: policy.MaxRenewals,
      Status: stage,
      IsOverdue: stage !== "Borrowed",
      IneligibleReason: ineligible,
      RenewsTo:
        due === null
          ? null
          : renewedDueDate(due, policy.RenewalPeriodDays, calendar),
    };
  });

  const holds = holdsSnap.docs.map((doc) => {
    const raw = doc.data() as AnyObj;
    return {
      HoldID: doc.id,
      BookID: String(raw.BookID || ""),
      Accession: String(raw.Accession || ""),
      CollectionTitle: String(raw.CollectionTitle || ""),
      CollectionImage: String(raw.CollectionImage || ""),
      PickupFrom: toMillis(raw.PickupFrom),
      ShelfExpiresOn: toMillis(raw.ShelfExpiresOn),
      ApprovedBy: String(raw.ApprovedBy || ""),
      RequestId: String(raw.RequestId || ""),
      Collectable: (toMillis(raw.PickupFrom) ?? 0) <= now,
    };
  });

  const historyDocs = historySnap.docs.slice(0, historyLimit);
  const history = {
    rows: historyDocs.map((doc) => {
      const raw = doc.data() as AnyObj;
      return {
        id: doc.id,
        Type: String(raw.Type || ""),
        Status: String(raw.Status || ""),
        ProcessedOn: toMillis(raw.ProcessedOn),
        Accession: String(raw.Accession || ""),
        CollectionTitle: String(raw.CollectionTitle || ""),
        Books: Array.isArray(raw.Books) ? raw.Books : [],
        DueDate: toMillis(raw.DueDate),
        NewDueDate: toMillis(raw.NewDueDate),
        CheckinDate: toMillis(raw.CheckinDate),
        Purpose: String(raw.Purpose || ""),
        Remarks: String(raw.Remarks || ""),
        Violations: String(raw.Violations || "None"),
      };
    }),
    hasMore: historySnap.docs.length > historyLimit,
  };

  const activeLoans = Number(summary.ActiveLoans || 0);
  const activeHolds = Number(summary.ActiveHolds || 0);
  const total = activeLoans + activeHolds + pending;

  const lists = await freshLists(
    db,
    patronRef,
    (patron.CartList || {}) as AnyObj,
    (patron.SavedList || {}) as AnyObj,
  );

  return {
    slotsLeft: Math.max(0, policy.MaxActiveLoans - total),
    maxSlots: policy.MaxActiveLoans,
    counts: { loans: activeLoans, holds: activeHolds, pending, total },
    cart: lists.cart,
    saved: lists.saved,
    loans,
    holds,
    requests,
    history,
    policy: {
      LoanPeriodDays: policy.LoanPeriodDays,
      MaxRenewals: policy.MaxRenewals,
      RenewalPeriodDays: policy.RenewalPeriodDays,
      PickupWindowDays: policy.PickupWindowDays,
      HoldRequestExpiryHours: policy.HoldRequestExpiryHours,
      MaxCartItems: policy.MaxCartItems,
      MaxSavedItems: policy.MaxSavedItems,
    },
    generatedAt: now,
  };
}


export async function cartHistory(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { patronIdOrUID?: string; limit?: number; startAfterId?: string },
) {
  const { uid } = await requirePatronSelf(
    db,
    authUid,
    String(input.patronIdOrUID || ""),
  );
  const limit = Math.max(1, Math.min(50, Number(input.limit) || 10));

  let query = transactionsRef(db)
    .where("TargetUID", "==", uid)
    .orderBy("ProcessedOn", "desc")
    .limit(limit + 1);

  if (input.startAfterId) {
    const cursor = await transactionsRef(db)
      .doc(String(input.startAfterId))
      .get();
    if (cursor.exists) query = query.startAfter(cursor);
  }

  const snap = await query.get();
  const docs = snap.docs.slice(0, limit);
  return {
    rows: docs.map((doc) => {
      const raw = doc.data() as AnyObj;
      return {
        id: doc.id,
        Type: String(raw.Type || ""),
        Status: String(raw.Status || ""),
        ProcessedOn: toMillis(raw.ProcessedOn),
        Accession: String(raw.Accession || ""),
        CollectionTitle: String(raw.CollectionTitle || ""),
        Books: Array.isArray(raw.Books) ? raw.Books : [],
        DueDate: toMillis(raw.DueDate),
        NewDueDate: toMillis(raw.NewDueDate),
        CheckinDate: toMillis(raw.CheckinDate),
        Purpose: String(raw.Purpose || ""),
        Remarks: String(raw.Remarks || ""),
        Violations: String(raw.Violations || "None"),
      };
    }),
    lastDocId: docs.length ? docs[docs.length - 1].id : null,
    hasMore: snap.docs.length > limit,
  };
}
