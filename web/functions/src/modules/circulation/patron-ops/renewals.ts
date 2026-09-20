import { buildCirculationEntry } from "../../lms/writes/writing-lms-circulation";
import { patronName } from "../staff-ops";
import { BORROWING_STATES, allocateTransactionId, loadPolicy, loansRef, notifyPatron, phDateString, renewalOpensAt, stageFor, toDateSafe, transactionsRef } from "../circulation-policy";
import { loadCalendar } from "../library-calendar";
import { renewedDueDate } from "../circulation-dates";
import { Timestamp } from "../../../core/firebase";
import { AnyObj, HttpsError, requirePatronSelf } from "./shelf-common";


// ==========================================
// || RENEW                                 ||
// ==========================================

export async function renewSelf(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { patronIdOrUID?: string; borrowKey: string; days?: number },
) {
  const {
    ref: patronRef,
    data: patron,
    uid,
  } = await requirePatronSelf(db, authUid, String(input.patronIdOrUID || ""));
  const [policy, calendar] = await Promise.all([
    loadPolicy(db),
    loadCalendar(db),
  ]);
  const borrowKey = String(input.borrowKey || "").trim();
  if (!borrowKey) return { ok: false, error: "Invalid loan." };

  const days = Math.max(
    1,
    Math.min(
      policy.RenewalPeriodDays,
      Number(input.days) || policy.RenewalPeriodDays,
    ),
  );

  const state = String(patron.State || "");
  if (!BORROWING_STATES.includes(state)) {
    return {
      ok: false,
      error: `Your account is "${state || "Unknown"}" and cannot renew.`,
    };
  }

  const loanRef = loansRef(db, uid).doc(borrowKey);
  const now = Date.now();

  const result = await db.runTransaction(async (tx) => {
    const loanSnap = await tx.get(loanRef);
    if (!loanSnap.exists) {
      throw new HttpsError("not-found", "That loan is no longer open.");
    }
    const loan = loanSnap.data() as AnyObj;

    const renewalCount = Number(loan.RenewalCount || 0);
    if (renewalCount >= policy.MaxRenewals) {
      throw new HttpsError(
        "failed-precondition",
        `This loan has already been renewed ${renewalCount} of ${policy.MaxRenewals} times. Please return it.`,
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
        `You can renew this from ${phDateString(renewalOpensAt(due.getTime(), policy))}.`,
      );
    }

    const { ids, commit } = await allocateTransactionId(tx, db);
    const entryId = ids[0];
    const nowTs = Timestamp.now();
    const newDue = Timestamp.fromMillis(
      renewedDueDate(due?.getTime() ?? now, days, calendar),
    );

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
          action: "Renewed a loan",
          description: `${uid} renewed ${String(loan.Accession || "")} for ${days} day(s)`,
          processedBy: "Self-service",
          targetName: patronName(patron),
          targetUID: uid,
          UID: "",
          accession: String(loan.Accession || ""),
          collectionTitle: String(loan.CollectionTitle || ""),
          collectionUID: String(loan.CollectionUID || loan.BookID || ""),
          dueDate: loan.DueDate ?? null,
          newDueDate: newDue,
          daysOfExtension: days,
          hasRenewed: true,
          borrowID: borrowKey,
          remarks: `Renewal ${renewalCount + 1} of ${policy.MaxRenewals}, extended by ${days} day(s).`,
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
      `"${result.title}" (Accession: ${result.accession}) is now due ${phDateString(result.newDue)}.\n` +
      (result.renewalsLeft > 0
        ? `You may renew it ${result.renewalsLeft} more time(s).`
        : "This was your last renewal for this loan."),
    type: "renewal",
  });

  return { ok: true, trnsId: result.entryId, newDueDate: result.newDue };
}
