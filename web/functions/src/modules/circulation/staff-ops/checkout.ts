import { requireStaffActor } from "../../../core/guards";
import { buildCirculationEntry } from "../../lms/writes/writing-lms-circulation";
import { Timestamp, increment } from "../../../core/firebase";
import { BORROWING_STATES, allocateTransactionId, borrowId, dayStringToMillis, formatDateLong, holdsRef, isLendable, loadPolicy, loansRef, notifyPatron, patronCircRef, phDayEnd, phDayStart, phDateString, toDateSafe, transactionsRef, reservationPurgeAt } from "../circulation-policy";
import { closureReason, isOpenDay, loadCalendar } from "../library-calendar";
import { dueWithGrace } from "../circulation-dates";
import { AnyObj, HttpsError, copyIndexOf, describeSlots, patronName, pendingRequestsQuery, resolvePatron, slotUsage } from "./staff-common";


// ==========================================
// || CHECKOUT                              ||
// ==========================================

export async function checkout(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: {
    patronIdOrUID: string;
    collectionId: string;
    accession: string;
    dueDate?: string;
  },
) {
  const { patronIdOrUID, collectionId, accession } = input;
  if (!patronIdOrUID || !collectionId || !accession) {
    throw new HttpsError("invalid-argument", "Missing parameters.");
  }

  const staff = await requireStaffActor(authUid, "Checkout");
  const policy = await loadPolicy(db);
  const { ref: patronRef, data: patron } = await resolvePatron(
    db,
    patronIdOrUID,
  );

  const patronUID = String(patron.UID || "");
  if (!patronUID) {
    throw new HttpsError("failed-precondition", "Invalid patron record.");
  }

  const state = String(patron.State || "");
  if (!BORROWING_STATES.includes(state)) {
    throw new HttpsError(
      "failed-precondition",
      `Patron state "${state || "Unknown"}" is not eligible for checkout.`,
    );
  }
  if (String(patron.City || "") !== "City of Pasig") {
    throw new HttpsError(
      "failed-precondition",
      "Patron must be from the City of Pasig to borrow.",
    );
  }

  const now = Date.now();
  const todayPH = phDateString(now);

  const calendar = await loadCalendar(db);
  const maxDueMs = dueWithGrace(
    phDayEnd(now) + policy.LoanPeriodDays * 24 * 60 * 60 * 1000,
    calendar,
  );
  let dueTimestamp = Timestamp.fromMillis(maxDueMs);
  if (input.dueDate) {
    const requested = dayStringToMillis(input.dueDate);
    if (requested === null) {
      throw new HttpsError("invalid-argument", "Due date must be YYYY-MM-DD.");
    }
    const requestedEnd = phDayEnd(requested);
    if (requestedEnd < phDayStart(now)) {
      throw new HttpsError("failed-precondition", "Due date is in the past.");
    }
    if (requestedEnd > maxDueMs) {
      throw new HttpsError(
        "failed-precondition",
        `The loan period is ${policy.LoanPeriodDays} days. The latest due date is ${phDateString(maxDueMs)}.`,
      );
    }
    if (!isOpenDay(requestedEnd, calendar)) {
      const reason = closureReason(requestedEnd, calendar);
      throw new HttpsError(
        "failed-precondition",
        reason && reason !== "Closed"
          ? `The library is closed on ${phDateString(requestedEnd)} (${reason}). Choose a day the desk is open.`
          : `The library is closed on ${phDateString(requestedEnd)}. Choose a day the desk is open.`,
      );
    }
    dueTimestamp = Timestamp.fromMillis(requestedEnd);
  }

  const colRef = db.collection("collections").doc(collectionId);
  const summaryRef = patronCircRef(db, patronUID);
  const loanId = borrowId(accession);

  const result = await db.runTransaction(async (tx) => {
    const [colSnap, summarySnap, holdsSnap, loanSnap, pendingSnap] =
      await Promise.all([
        tx.get(colRef),
        tx.get(summaryRef),
        tx.get(holdsRef(db, patronUID)),
        tx.get(loansRef(db, patronUID).doc(loanId)),
        tx.get(pendingRequestsQuery(db, patronUID)),
      ]);

    if (!colSnap.exists)
      throw new HttpsError("not-found", "Collection not found.");
    if (loanSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This patron already has this copy checked out.",
      );
    }

    const collection = colSnap.data() as AnyObj;
    const copies: AnyObj[] = Array.isArray(collection.Copies)
      ? [...collection.Copies]
      : [];
    const index = copyIndexOf(copies, accession);
    const copy = copies[index];

    if (!isLendable(copy)) {
      throw new HttpsError(
        "failed-precondition",
        "This copy is for library use only and cannot be borrowed.",
      );
    }

    const summary = (summarySnap.exists ? summarySnap.data() : {}) as AnyObj;

    const matchingHold = holdsSnap.docs.find(
      (d) =>
        String((d.data() as AnyObj).Accession || "") === String(accession) &&
        String((d.data() as AnyObj).BookID || "") === String(collectionId),
    );

    const usage = slotUsage(summary, pendingSnap);
    if (!matchingHold && usage.total >= policy.MaxActiveLoans) {
      throw new HttpsError(
        "failed-precondition",
        `This patron is at the ${policy.MaxActiveLoans}-item limit — ` +
          `${describeSlots(usage)}. A reservation counts against the limit ` +
          `from the moment it is made, whether or not it has been approved.`,
      );
    }

    const availability = String(copy.Availability || "");
    if (availability === "Reserved") {
      if (!matchingHold) {
        throw new HttpsError(
          "failed-precondition",
          "This copy is held for another patron and cannot be checked out.",
        );
      }
      const hold = matchingHold.data() as AnyObj;
      const from = toDateSafe(hold.PickupFrom)?.getTime();
      const until = toDateSafe(hold.ShelfExpiresOn)?.getTime();
      if (from === undefined || until === undefined) {
        throw new HttpsError(
          "failed-precondition",
          "This hold is missing its pickup window and cannot be collected. " +
            "Cancel the reservation and ask the patron to request it again.",
        );
      }
      if (now < phDayStart(from)) {
        throw new HttpsError(
          "failed-precondition",
          `This hold opens on ${formatDateLong(from)}. Today is ${todayPH}.`,
        );
      }
      if (now > phDayEnd(until)) {
        throw new HttpsError(
          "failed-precondition",
          `This hold expired on ${formatDateLong(until)} and the copy is being returned to the shelf.`,
        );
      }
    } else if (availability === "Pending") {
      throw new HttpsError(
        "failed-precondition",
        "This copy is on a reservation that has not been approved yet. " +
          "Approve the request first, then check it out.",
      );
    } else if (availability !== "Available") {
      throw new HttpsError(
        "failed-precondition",
        `This copy is marked "${availability || "Unknown"}" and is not available for checkout.`,
      );
    }

    const requestId = matchingHold
      ? String((matchingHold.data() as AnyObj).RequestId || "")
      : "";
    const requestRef = requestId
      ? db.collection("reservationRequests").doc(requestId)
      : null;
    const requestSnap = requestRef ? await tx.get(requestRef) : null;

    const { ids, commit } = await allocateTransactionId(tx, db);
    const entryId = ids[0];

    commit();

    const nowTs = Timestamp.now();
    copies[index] = {
      ...copy,
      Availability: "Borrowed",
      LastBorrowedBy: patronName(patron),
      LastBorrowedDate: nowTs,
    };
    tx.update(colRef, { Copies: copies });

    tx.set(loansRef(db, patronUID).doc(loanId), {
      Accession: String(accession),
      BookID: String(collectionId),
      CollectionTitle: String(collection.CollectionTitle || ""),
      CollectionUID: String(collection.UID || collectionId),
      CollectionImage: String(collection.CollectionImage || ""),
      CheckoutBy: staff.fullName,
      CheckoutDate: nowTs,
      DueDate: dueTimestamp,
      RenewalCount: 0,
      Status: "Borrowed",
      CheckoutTransactionId: entryId,
    });

    tx.set(
      summaryRef,
      {
        UID: patronUID,
        TargetName: patronName(patron),
        ActiveLoans: increment(1),
        ...(matchingHold
          ? { ActiveHolds: increment(-1) }
          : {}),
        LastBorrowedDate: nowTs,
      },
      { merge: true },
    );

    if (matchingHold) tx.delete(matchingHold.ref);

    tx.set(
      transactionsRef(db).doc(entryId),
      buildCirculationEntry(
        {
          case: "checkout",
          type: "Checkout",
          status: "Borrowed",
          action: "Checked out a book copy",
          description: `${staff.publicUID} checked out ${accession} to ${patronUID}`,
          processedBy: staff.fullName,
          targetName: patronName(patron),
          targetUID: patronUID,
          UID: staff.publicUID,
          accession: String(accession),
          collectionTitle: String(collection.CollectionTitle || ""),
          collectionUID: String(collection.UID || collectionId),
          dueDate: dueTimestamp,
          borrowID: loanId,
        },
        nowTs,
      ),
    );

    if (requestRef && requestSnap?.exists) {
      const request = requestSnap.data() as AnyObj;
      tx.update(requestRef, {
        Status: "Fulfilled",
        PurgeAt: reservationPurgeAt(now),
      });
      if (request.TransactionId) {
        tx.update(transactionsRef(db).doc(String(request.TransactionId)), {
          Status: "Fulfilled",
          Remarks: `Reserved copy collected on ${formatDateLong(now)}.`,
        });
      }
    }

    return {
      entryId,
      title: String(collection.CollectionTitle || ""),
      due: dueTimestamp.toMillis(),
    };
  });

  await notifyPatron(db, patronRef.id, {
    title: "Book Borrowed Successfully!",
    content:
      `You have borrowed "${result.title}" (Accession: ${accession}).\n` +
      `Due date: ${phDateString(result.due)}.`,
    type: "checkout",
  });

  return { ok: true, trnsId: result.entryId };
}


export async function notifySavedListWatchers(
  db: FirebaseFirestore.Firestore,
  input: { bookId: string; title: string; exceptPatronDocId: string },
): Promise<void> {
  try {
    const watchers = await db
      .collection("patrons")
      .where("SavedIds", "array-contains", input.bookId)
      .get();

    await Promise.all(
      watchers.docs
        .filter(
          (doc) =>
            doc.id !== input.exceptPatronDocId &&
            String(doc.get("Status") ?? "Active") !== "Archived",
        )
        .map((doc) =>
          notifyPatron(db, doc.id, {
            title: "A Saved Book Is Available",
            content:
              `"${input.title || "A title on your saved list"}" has been returned and is on the shelf again.\n` +
              "It is first come, first served — reserve it from the catalogue if you still want it.",
            type: "saved_available",
          }),
        ),
    );
  } catch (error) {
    console.error("Could not notify saved-list watchers:", error);
  }
}
