import { requireStaffActor } from "../../../core/guards";
import { buildCirculationEntry } from "../../lms/writes/writing-lms-circulation";
import { Timestamp } from "../../../core/firebase";
import { BORROWING_STATES, allocateTransactionId, loadPolicy, loansRef, notifyPatron, phDateString, renewalOpensAt, stageFor, toDateSafe, transactionsRef } from "../circulation-policy";
import { loadCalendar } from "../library-calendar";
import { renewedDueDate } from "../circulation-dates";
import { AnyObj, HttpsError, patronName, resolvePatron } from "./staff-common";


// ==========================================
// || RENEWAL AT THE DESK (staff)           ||
// ==========================================

export async function renewalApprove(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { patronIdOrUID: string; borrowKey: string; days: number },
) {
  const { patronIdOrUID, borrowKey } = input;
  if (!patronIdOrUID || !borrowKey) {
    throw new HttpsError("invalid-argument", "Missing parameters.");
  }

  const staff = await requireStaffActor(authUid, "ApproveRenewals");
  const [policy, calendar] = await Promise.all([
    loadPolicy(db),
    loadCalendar(db),
  ]);
  const days = Math.max(
    1,
    Math.min(
      policy.RenewalPeriodDays,
      Number(input.days) || policy.RenewalPeriodDays,
    ),
  );

  const { ref: patronRef, data: patron } = await resolvePatron(
    db,
    patronIdOrUID,
  );
  const patronUID = String(patron.UID || "");
  const loanRef = loansRef(db, patronUID).doc(borrowKey);
  const now = Date.now();

  const state = String(patron.State || "");
  if (!BORROWING_STATES.includes(state)) {
    throw new HttpsError(
      "failed-precondition",
      `This patron's account is "${state || "Unknown"}" and cannot renew.`,
    );
  }

  const result = await db.runTransaction(async (tx) => {
    const loanSnap = await tx.get(loanRef);
    if (!loanSnap.exists)
      throw new HttpsError("not-found", "That loan is no longer open.");

    const loan = loanSnap.data() as AnyObj;
    const renewalCount = Number(loan.RenewalCount || 0);
    if (renewalCount >= policy.MaxRenewals) {
      throw new HttpsError(
        "failed-precondition",
        `This loan has already been renewed ${renewalCount} of ${policy.MaxRenewals} times. It has to come back.`,
      );
    }

    const due = toDateSafe(loan.DueDate);
    if (stageFor(due, now, policy, calendar) !== "Borrowed") {
      throw new HttpsError(
        "failed-precondition",
        "This book is overdue and must be returned before it can be renewed.",
      );
    }
    if (due && now < renewalOpensAt(due.getTime(), policy)) {
      throw new HttpsError(
        "failed-precondition",
        `This loan can be renewed from ${phDateString(renewalOpensAt(due.getTime(), policy))}.`,
      );
    }

    const newDue = Timestamp.fromMillis(
      renewedDueDate((due ?? new Date(now)).getTime(), days, calendar),
    );

    const { ids, commit } = await allocateTransactionId(tx, db);
    const entryId = ids[0];
    const nowTs = Timestamp.now();

    commit();

    tx.update(loanRef, {
      DueDate: newDue,
      RenewalCount: renewalCount + 1,
    });

    tx.set(
      transactionsRef(db).doc(entryId),
      buildCirculationEntry(
        {
          case: "renewal",
          type: "Renewal",
          status: "Approved",
          action: "Renewed a loan at the desk",
          description: `${staff.publicUID} renewed ${String(loan.Accession || "")} for ${patronUID} by ${days} day(s)`,
          processedBy: staff.fullName,
          targetName: patronName(patron),
          targetUID: patronUID,
          UID: staff.publicUID,
          accession: String(loan.Accession || ""),
          collectionTitle: String(loan.CollectionTitle || ""),
          collectionUID: String(loan.CollectionUID || loan.BookID || ""),
          dueDate: loan.DueDate ?? null,
          newDueDate: newDue,
          daysOfExtension: days,
          hasRenewed: true,
          borrowID: borrowKey,
        },
        nowTs,
      ),
    );

    if (loan.CheckoutTransactionId) {
      tx.update(transactionsRef(db).doc(String(loan.CheckoutTransactionId)), {
        HasRenewed: true,
        DueDate: newDue,
      });
    }

    return {
      entryId,
      title: String(loan.CollectionTitle || ""),
      accession: String(loan.Accession || ""),
      newDue: newDue.toMillis(),
      renewalsLeft: policy.MaxRenewals - (renewalCount + 1),
    };
  });

  await notifyPatron(db, patronRef.id, {
    title: "Book Renewed",
    content:
      `"${result.title}" (Accession: ${result.accession}) was renewed for you at the library and is now due ${phDateString(result.newDue)}.\n` +
      (result.renewalsLeft > 0
        ? `You may renew it ${result.renewalsLeft} more time(s).`
        : "This was the renewal for this loan — it has to come back by then."),
    type: "renewal",
  });

  return { ok: true, trnsId: result.entryId };
}
