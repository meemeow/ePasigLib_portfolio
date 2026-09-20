import { requireStaffActor } from "../../../core/guards";
import { buildCirculationEntry } from "../../lms/writes/writing-lms-circulation";
import { Timestamp, increment } from "../../../core/firebase";
import { allocateTransactionId, borrowId, returnId, formatDateLong, isAvailable, loadPolicy, loansRef, nextState, notifyPatron, patronCircRef, returnsRef, stageFor, toDateSafe, transactionsRef, notifyStandingChange } from "../circulation-policy";
import { loadCalendar } from "../library-calendar";
import { AnyObj, HttpsError, copyIndexOf, patronName, resolvePatron } from "./staff-common";
import { notifySavedListWatchers } from "./checkout";


// ==========================================
// || CHECK-IN                              ||
// ==========================================

export async function checkin(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { patronIdOrUID: string; collectionId: string; accession: string },
) {
  const { patronIdOrUID, collectionId, accession } = input;
  if (!patronIdOrUID || !collectionId || !accession) {
    throw new HttpsError("invalid-argument", "Missing parameters.");
  }

  const staff = await requireStaffActor(authUid, "Checkin");
  const [policy, calendar] = await Promise.all([
    loadPolicy(db),
    loadCalendar(db),
  ]);
  const { ref: patronRef, data: patron } = await resolvePatron(
    db,
    patronIdOrUID,
  );

  const patronUID = String(patron.UID || "");
  if (!patronUID)
    throw new HttpsError("failed-precondition", "Invalid patron record.");

  const colRef = db.collection("collections").doc(collectionId);
  const summaryRef = patronCircRef(db, patronUID);
  const loanId = borrowId(accession);
  const loanRef = loansRef(db, patronUID).doc(loanId);
  const now = Date.now();

  const result = await db.runTransaction(async (tx) => {
    const [loanSnap, colSnap, patronSnap] = await Promise.all([
      tx.get(loanRef),
      tx.get(colRef),
      tx.get(patronRef),
    ]);

    if (!loanSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This copy is not on loan to this patron, or has already been checked in.",
      );
    }
    if (!colSnap.exists)
      throw new HttpsError("not-found", "Collection not found.");

    const loan = loanSnap.data() as AnyObj;
    const collection = colSnap.data() as AnyObj;
    const collectionTitle = String(collection.CollectionTitle || "");
    const collectionUID = String(collection.UID || collectionId);

    const copies: AnyObj[] = Array.isArray(collection.Copies)
      ? [...collection.Copies]
      : [];
    const index = copyIndexOf(copies, accession);

    const due = toDateSafe(loan.DueDate);
    const stage = stageFor(due, now, policy, calendar);
    const overdue = stage !== "Borrowed";

    const alreadyCharged = Boolean(loan.PenaltyApplied);
    const stateBefore = String(
      (patronSnap.data() as AnyObj)?.State || "Verified",
    );
    const stateAfter =
      overdue && !alreadyCharged ? nextState(stateBefore) : stateBefore;
    const violations = overdue
      ? alreadyCharged
        ? `${stage} — already counted against this account`
        : `${stage} — ${stateBefore} → ${stateAfter}`
      : "None";

    const returnedOn = formatDateLong(now);
    const remarks = overdue
      ? `Book (${accession}) returned ${returnedOn}, past its due date of ${formatDateLong(due ?? now)}. ` +
        (alreadyCharged
          ? `Account standing already stepped for this loan and stays ${stateBefore}.`
          : `Account standing moved from ${stateBefore} to ${stateAfter}.`)
      : `Book (${accession}) returned on time on ${returnedOn}. No violations recorded.`;

    const { ids, commit } = await allocateTransactionId(tx, db);
    const entryId = ids[0];

    commit();

    const nowTs = Timestamp.now();
    copies[index] = { ...copies[index], Availability: "Available" };
    tx.update(colRef, {
      Copies: copies,
      BorrowCount: increment(1),
    });

    if (stateAfter !== stateBefore) tx.update(patronRef, { State: stateAfter });

    tx.delete(loanRef);
    tx.set(returnsRef(db, patronUID).doc(returnId(accession, now)), {
      Accession: String(accession),
      BookID: String(collectionId),
      CollectionTitle: collectionTitle,
      CheckoutDate: loan.CheckoutDate ?? null,
      CheckoutBy: loan.CheckoutBy ?? "",
      DueDate: loan.DueDate ?? null,
      CheckinDate: nowTs,
      CheckinBy: staff.fullName,
      Violations: violations,
      Remarks: remarks,
    });

    tx.set(
      summaryRef,
      {
        UID: patronUID,
        TargetName: patronName(patron),
        ActiveLoans: increment(-1),
        LastReturnedDate: nowTs,
      },
      { merge: true },
    );

    const originalId = String(loan.CheckoutTransactionId || "");
    tx.set(
      transactionsRef(db).doc(entryId),
      buildCirculationEntry(
        {
          case: "checkin",
          type: "Checkin",
          status: "Returned",
          action: "Checked in a book copy",
          description: `${staff.publicUID} checked in ${accession} from ${patronUID}`,
          processedBy: staff.fullName,
          targetName: patronName(patron),
          targetUID: patronUID,
          UID: staff.publicUID,
          accession: String(accession),
          collectionTitle,
          collectionUID,
          checkinDate: nowTs,
          dueDate: loan.DueDate ?? null,
          violations,
          remarks,
          borrowID: loanId,
          originalCheckoutTransaction: originalId || null,
        },
        nowTs,
      ),
    );

    if (originalId) {
      tx.update(transactionsRef(db).doc(originalId), {
        Status: "Returned",
        Remarks: remarks,
        CheckinDate: nowTs,
      });
    }

    return {
      entryId,
      collectionTitle,
      violations: overdue ? violations : "",
      originalId,
      stateBefore,
      stateAfter,
      becameAvailable: !collection.Copies?.some?.(
        (copy: AnyObj, at: number) => at !== index && isAvailable(copy),
      ),
    };
  });

  await notifyPatron(db, patronRef.id, {
    title: "Book Checked In Successfully!",
    content:
      `You have returned "${result.collectionTitle}" (Accession: ${accession}).` +
      (result.violations ? `\nNote: ${result.violations}` : ""),
    type: "checkin",
  });

  if (result.stateAfter !== result.stateBefore) {
    await notifyPatron(db, patronRef.id, notifyStandingChange(
      result.stateBefore,
      result.stateAfter,
    ));
  }

  if (result.becameAvailable) {
    await notifySavedListWatchers(db, {
      bookId: collectionId,
      title: result.collectionTitle,
      exceptPatronDocId: patronRef.id,
    });
  }

  return {
    ok: true,
    trnsId: result.entryId,
    original: result.originalId || null,
  };
}
