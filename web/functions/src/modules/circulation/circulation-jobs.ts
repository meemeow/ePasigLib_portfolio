import { onSchedule } from "firebase-functions/v2/scheduler";
import { toMillis } from "../../core/time";
import {
  BATCH_LIMIT,
  CirculationPolicy,
  DAY_MS,
  LOAN_STAGE_ORDER,
  LoanStage,
  formatDateLong,
  loadPolicy,
  nextState,
  patronCircRef,
  phDateString,
  phDayStart,
  stageAdvanced,
  stageFor,
  transactionsRef,
  notifyPatron,
  notifyStandingChange,
  reservationPurgeAt,
  SETTLED_RESERVATION_STATUSES,
} from "./circulation-policy";
import { loadCalendar } from "./library-calendar";
import { dueWithGrace } from "./circulation-dates";
import { Timestamp, db, increment } from "../../core/firebase";

type AnyObj = Record<string, any>;

async function runBatched(
  db: FirebaseFirestore.Firestore,
  operations: Array<(batch: FirebaseFirestore.WriteBatch) => void>,
): Promise<number> {
  let committed = 0;
  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const apply of operations.slice(i, i + BATCH_LIMIT)) apply(batch);
    await batch.commit();
    committed += Math.min(BATCH_LIMIT, operations.length - i);
  }
  return committed;
}

async function releaseCopies(
  db: FirebaseFirestore.Firestore,
  byBook: Map<string, Set<string>>,
  from: readonly string[],
): Promise<number> {
  let released = 0;

  for (const [bookId, accessions] of byBook) {
    const ref = db.collection("collections").doc(bookId);
    try {
      released += await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return 0;
        const collection = snap.data() as AnyObj;
        if (!Array.isArray(collection.Copies)) return 0;

        let moved = 0;
        const copies = collection.Copies.map((copy: AnyObj) => {
          if (!accessions.has(String(copy?.Accession || ""))) return copy;
          if (!from.includes(String(copy?.Availability || ""))) return copy;
          moved++;
          return { ...copy, Availability: "Available" };
        });

        if (moved > 0) tx.update(ref, { Copies: copies });
        return moved;
      });
    } catch (error) {
      console.error(`Could not release copies of ${bookId}:`, error);
    }
  }

  return released;
}

function patronUidOf(ref: FirebaseFirestore.DocumentReference): string {
  const key = ref.parent.parent?.id || "";
  return key.replace(/^CIRC_PATRN_/, "");
}

async function notifyAll(
  db: FirebaseFirestore.Firestore,
  items: Array<{ patronUID: string; title: string; content: string; type: string }>,
): Promise<void> {
  if (!items.length) return;

  const uids = [...new Set(items.map((i) => i.patronUID))].filter(Boolean);
  const docIds = new Map<string, string>();
  await Promise.all(
    uids.map(async (uid) => {
      try {
        const direct = await db.collection("patrons").doc(uid).get();
        if (direct.exists) {
          docIds.set(uid, direct.id);
          return;
        }
        const q = await db
          .collection("patrons")
          .where("UID", "==", uid)
          .limit(1)
          .get();
        if (!q.empty) docIds.set(uid, q.docs[0].id);
      } catch (error) {
        console.error(`Failed to resolve patron ${uid} for notification:`, error);
      }
    }),
  );

  await Promise.all(
    items.map(async (item) => {
      const docId = docIds.get(item.patronUID);
      if (!docId) return;
      await notifyPatron(db, docId, {
        title: item.title,
        content: item.content,
        type: item.type,
      });
    }),
  );
}

// ==========================================
// || OVERDUE SWEEP                         ||
// ==========================================

const STAGE_MESSAGE: Record<Exclude<LoanStage, "Borrowed">, string> = {
  Overdue:
    "is past its due date. Please return it as soon as you can to keep your borrowing privileges.",
  LongOverdue:
    "is now long overdue. Please return it immediately — continued delay will see it recorded as lost.",
  AssumedLost:
    "has been recorded as lost. Please contact the library to resolve this.",
};

export const rollDueDatesForClosures = onSchedule(
  { schedule: "30 0 * * *", timeZone: "Asia/Manila", timeoutSeconds: 540 },
  async () => {
    const calendar = await loadCalendar(db);
    const now = Date.now();

    const [loans, holds] = await Promise.all([
      db
        .collectionGroup("loans")
        .where(
          "DueDate",
          ">=",
          Timestamp.fromMillis(phDayStart(now)),
        )
        .get(),
      db
        .collectionGroup("holds")
        .where(
          "ShelfExpiresOn",
          ">=",
          Timestamp.fromMillis(phDayStart(now)),
        )
        .get(),
    ]);

    if (loans.empty && holds.empty) {
      console.log("Due-date roll: nothing open due today or later.");
      return;
    }

    const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
    const notifications: Array<{
      patronUID: string;
      title: string;
      content: string;
      type: string;
    }> = [];

    for (const doc of loans.docs) {
      const loan = doc.data() as AnyObj;
      const due = toMillis(loan.DueDate);
      if (due === null) continue;

      const rolled = dueWithGrace(due, calendar);
      if (rolled <= due) continue;

      const newDue = Timestamp.fromMillis(rolled);
      operations.push((batch) => batch.update(doc.ref, { DueDate: newDue }));

      if (loan.CheckoutTransactionId) {
        operations.push((batch) =>
          batch.update(
            transactionsRef(db).doc(String(loan.CheckoutTransactionId)),
            { DueDate: newDue },
          ),
        );
      }

      notifications.push({
        patronUID: patronUidOf(doc.ref),
        title: "Due Date Moved",
        content:
          `The library is closed on ${phDateString(due)}, so "${String(loan.CollectionTitle || "")}" ` +
          `(Accession: ${String(loan.Accession || "")}) is now due ${formatDateLong(rolled)}.\n` +
          `You are not late — nothing is owed for a day we are shut.`,
        type: "due_reminder",
      });
    }

    let holdsMoved = 0;
    for (const doc of holds.docs) {
      const hold = doc.data() as AnyObj;
      const expires = toMillis(hold.ShelfExpiresOn);
      if (expires === null) continue;

      const rolled = dueWithGrace(expires, calendar);
      if (rolled <= expires) continue;

      holdsMoved++;
      const newExpiry = Timestamp.fromMillis(rolled);
      operations.push((batch) =>
        batch.update(doc.ref, { ShelfExpiresOn: newExpiry }),
      );

      notifications.push({
        patronUID: patronUidOf(doc.ref),
        title: "Pickup Window Extended",
        content:
          `The library is closed on ${phDateString(expires)}, so "${String(hold.CollectionTitle || "")}" ` +
          `(Accession: ${String(hold.Accession || "")}) is held for you until ${formatDateLong(rolled)}.\n` +
          `You do not lose a reservation because of a day we are shut.`,
        type: "reservation",
      });
    }

    const written = await runBatched(db, operations);
    await notifyAll(db, notifications);
    console.log(
      `Due-date roll: ${notifications.length - holdsMoved} loan(s) and ${holdsMoved} hold(s) moved, ${written} writes.`,
    );
  },
);

export const sweepOverdueLoans = onSchedule(
  { schedule: "0 1 * * *", timeZone: "Asia/Manila", timeoutSeconds: 540 },
  async () => {
    const [policy, calendar] = await Promise.all([
      loadPolicy(db),
      loadCalendar(db),
    ]);
    const now = Date.now();

    const cutoff = Timestamp.fromMillis(phDayStart(now));
    const loans = await db
      .collectionGroup("loans")
      .where("DueDate", "<", cutoff)
      .get();

    if (loans.empty) {
      console.log("Overdue sweep: nothing past due.");
      return;
    }

    const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
    const notifications: Array<{
      patronUID: string;
      title: string;
      content: string;
      type: string;
    }> = [];
    const advancedPatrons = new Map<string, FirebaseFirestore.DocumentReference>();

    const loanUpdates = new Map<
      string,
      { ref: FirebaseFirestore.DocumentReference; data: AnyObj }
    >();

    for (const doc of loans.docs) {
      const loan = doc.data() as AnyObj;
      const current = String(loan.Status || "Borrowed");
      const stage = stageFor(toMillis(loan.DueDate), now, policy, calendar);
      if (stage === "Borrowed" || !stageAdvanced(current, stage)) continue;

      const patronUID = patronUidOf(doc.ref);
      const title = String(loan.CollectionTitle || "the book");
      const accession = String(loan.Accession || "");
      const due = toMillis(loan.DueDate);
      const remarks = `"${title}" (${accession}) was due ${due === null ? "earlier" : formatDateLong(due)} and is ${stage === "AssumedLost" ? "recorded as lost" : stage.toLowerCase()}.`;

      loanUpdates.set(doc.ref.path, {
        ref: doc.ref,
        data: { Status: stage, Remarks: remarks },
      });

      if (loan.CheckoutTransactionId) {
        operations.push((batch) => {
          batch.update(
            transactionsRef(db).doc(String(loan.CheckoutTransactionId)),
            { Status: stage, Remarks: remarks },
          );
        });
      }

      notifications.push({
        patronUID,
        title:
          stage === "AssumedLost"
            ? "Borrowed Book Recorded as Lost"
            : `Book ${stage === "LongOverdue" ? "Long " : ""}Overdue`,
        content: `Your borrowed book "${title}" (Accession: ${accession}) ${STAGE_MESSAGE[stage]}`,
        type: "violation",
      });

      if (!loan.PenaltyApplied && !advancedPatrons.has(patronUID)) {
        advancedPatrons.set(patronUID, doc.ref);
      }
    }

    for (const [patronUID, loanRef] of advancedPatrons) {
      const q = await db
        .collection("patrons")
        .where("UID", "==", patronUID)
        .limit(1)
        .get();
      if (q.empty) continue;
      const before = String((q.docs[0].data() as AnyObj).State || "Verified");
      const after = nextState(before);
      if (after === before) continue;
      operations.push((batch) => batch.update(q.docs[0].ref, { State: after }));
      const pending = loanUpdates.get(loanRef.path);
      if (pending) pending.data.PenaltyApplied = true;
      notifications.push({
        patronUID,
        ...notifyStandingChange(before, after),
      });
    }

    for (const { ref, data } of loanUpdates.values()) {
      operations.push((batch) => batch.update(ref, data));
    }

    const written = await runBatched(db, operations);
    await notifyAll(db, notifications);
    console.log(
      `Overdue sweep: ${written} writes across ${advancedPatrons.size} patron(s).`,
    );
  },
);

// ==========================================
// || HOLD SHELF EXPIRY                     ||
// ==========================================

export const expireHoldShelf = onSchedule(
  { schedule: "5 0 * * *", timeZone: "Asia/Manila", timeoutSeconds: 540 },
  async () => {
    const now = Timestamp.now();

    const holds = await db
      .collectionGroup("holds")
      .where("ShelfExpiresOn", "<", now)
      .get();

    if (holds.empty) {
      console.log("Hold shelf: nothing expired.");
      return;
    }

    const byBook = new Map<string, Set<string>>();
    for (const doc of holds.docs) {
      const hold = doc.data() as AnyObj;
      const bookId = String(hold.BookID || "");
      const accession = String(hold.Accession || "");
      if (!bookId || !accession) continue;
      if (!byBook.has(bookId)) byBook.set(bookId, new Set());
      byBook.get(bookId)!.add(accession);
    }

    const released = await releaseCopies(db, byBook, ["Reserved"]);
    console.log(`Hold shelf: released ${released} cop(ies).`);

    const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];

    const perPatron = new Map<string, number>();
    const requestIds = new Set<string>();
    const notifications: Array<{
      patronUID: string;
      title: string;
      content: string;
      type: string;
    }> = [];

    for (const doc of holds.docs) {
      const hold = doc.data() as AnyObj;
      const patronUID = patronUidOf(doc.ref);
      perPatron.set(patronUID, (perPatron.get(patronUID) || 0) + 1);
      if (hold.RequestId) requestIds.add(String(hold.RequestId));
      operations.push((batch) => batch.delete(doc.ref));

      notifications.push({
        patronUID,
        title: "Reserved Book Returned to the Shelf",
        content:
          `Your reserved copy of "${String(hold.CollectionTitle || "")}" (Accession: ${String(hold.Accession || "")}) ` +
          `was not collected by ${formatDateLong(toMillis(hold.ShelfExpiresOn) ?? Date.now())} and has gone back into circulation.\n` +
          `You are welcome to reserve it again.`,
        type: "reservation",
      });
    }

    for (const [patronUID, count] of perPatron) {
      operations.push((batch) =>
        batch.set(
          patronCircRef(db, patronUID),
          { ActiveHolds: increment(-count) },
          { merge: true },
        ),
      );
    }

    const requestSnaps = requestIds.size
      ? await db.getAll(
          ...[...requestIds].map((id) =>
            db.collection("reservationRequests").doc(id),
          ),
        )
      : [];

    for (const snap of requestSnaps) {
      if (!snap.exists) continue;
      const request = snap.data() as AnyObj;
      if (String(request.Status || "") !== "Approved") continue;
      const remarks = `Not collected by the pickup deadline. The copy was returned to the shelf on ${formatDateLong(Date.now())}.`;

      operations.push((batch) =>
        batch.update(snap.ref, { Status: "Pickup Failed", Remarks: remarks }),
      );
      if (request.TransactionId) {
        operations.push((batch) =>
          batch.update(transactionsRef(db).doc(String(request.TransactionId)), {
            Status: "Pickup Failed",
            Remarks: remarks,
          }),
        );
      }
    }

    const written = await runBatched(db, operations);
    await notifyAll(db, notifications);
    console.log(`Hold shelf: ${holds.size} expired, ${written} writes.`);
  },
);

// ==========================================
// || REQUEST EXPIRY                        ||
// ==========================================

export const expirePendingRequests = onSchedule(
  { schedule: "0 * * * *", timeZone: "Asia/Manila" },
  async () => {
    const now = Timestamp.now();

    const requests = await db
      .collection("reservationRequests")
      .where("Status", "==", "Pending")
      .where("ExpiresAt", "<", now)
      .get();

    if (requests.empty) return;

    const byBook = new Map<string, Set<string>>();
    for (const doc of requests.docs) {
      const books = (doc.data() as AnyObj).Books;
      if (!Array.isArray(books)) continue;
      for (const book of books) {
        const bookId = String(book?.BookID || "");
        const accession = String(book?.Accession || "");
        if (!bookId || !accession) continue;
        if (!byBook.has(bookId)) byBook.set(bookId, new Set());
        byBook.get(bookId)!.add(accession);
      }
    }

    const released = await releaseCopies(db, byBook, ["Pending"]);

    const remarks =
      "Expired — no action was taken within the required timeframe. The copy is back on the shelf; please submit a new request or contact the library.";
    const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
    const notifications: Array<{
      patronUID: string;
      title: string;
      content: string;
      type: string;
    }> = [];

    for (const doc of requests.docs) {
      const request = doc.data() as AnyObj;
      operations.push((batch) =>
        batch.update(doc.ref, {
          Status: "Expired",
          Remarks: remarks,
          PurgeAt: reservationPurgeAt(),
        }),
      );
      if (request.TransactionId) {
        operations.push((batch) =>
          batch.update(transactionsRef(db).doc(String(request.TransactionId)), {
            Status: "Expired",
            Remarks: remarks,
          }),
        );
      }
      notifications.push({
        patronUID: String(request.PatronUID || ""),
        title: "Reservation Request Expired",
        content: `Your reservation request has expired because it was not reviewed in time. ${remarks}`,
        type: "reservation",
      });
    }

    await runBatched(db, operations);
    await notifyAll(db, notifications);
    console.log(
      `Request expiry: ${requests.size} retired, ${released} cop(ies) released.`,
    );
  },
);

// ==========================================
// || REMINDERS                             ||
// ==========================================

async function claimDailyRun(
  db: FirebaseFirestore.Firestore,
  job: string,
  dayStart: number,
): Promise<boolean> {
  const ref = db.collection("metadata").doc("job_runs");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const last = Number((snap.data() as AnyObj | undefined)?.[job]);
    if (Number.isFinite(last) && last === dayStart) return false;
    tx.set(ref, { [job]: dayStart }, { merge: true });
    return true;
  });
}

export const sendCirculationReminders = onSchedule(
  { schedule: "0 7 * * *", timeZone: "Asia/Manila", timeoutSeconds: 540 },
  async () => {
    const now = Date.now();
    const todayStart = phDayStart(now);

    if (!(await claimDailyRun(db, "sendCirculationReminders", todayStart))) {
      console.log("Reminders: already sent today, skipping this run.");
      return;
    }
    const dayAfterTomorrow = todayStart + 2 * DAY_MS;
    const loanHorizon = todayStart + 4 * DAY_MS;
    const REMIND_DAYS_OUT = new Set([0, 1, 3]);

    const window = (field: string, collection: string, until: number) =>
      db
        .collectionGroup(collection)
        .where(field, ">=", Timestamp.fromMillis(todayStart))
        .where(field, "<", Timestamp.fromMillis(until))
        .get();

    const policy = await loadPolicy(db);
    const renewOpensDay = todayStart + policy.RenewalNotBeforeDays * DAY_MS;

    const [loans, holds, renewable] = await Promise.all([
      window("DueDate", "loans", loanHorizon),
      window("ShelfExpiresOn", "holds", dayAfterTomorrow),
      db
        .collectionGroup("loans")
        .where(
          "DueDate",
          ">=",
          Timestamp.fromMillis(renewOpensDay),
        )
        .where(
          "DueDate",
          "<",
          Timestamp.fromMillis(renewOpensDay + DAY_MS),
        )
        .get(),
    ]);

    const notifications: Array<{
      patronUID: string;
      title: string;
      content: string;
      type: string;
    }> = [];

    for (const doc of loans.docs) {
      const loan = doc.data() as AnyObj;
      const due = toMillis(loan.DueDate);
      if (due === null) continue;

      const daysOut = Math.round((phDayStart(due) - todayStart) / DAY_MS);
      if (!REMIND_DAYS_OUT.has(daysOut)) continue;

      const when =
        daysOut === 0 ? "today" : daysOut === 1 ? "tomorrow" : "in 3 days";
      notifications.push({
        patronUID: patronUidOf(doc.ref),
        title:
          daysOut === 0
            ? "Book Due Today"
            : daysOut === 1
              ? "Book Due Tomorrow"
              : "Book Due in 3 Days",
        content:
          `Your borrowed book "${String(loan.CollectionTitle || "")}" (Accession: ${String(loan.Accession || "")}) ` +
          `is due ${when} (${phDateString(due)}). Please return or renew it in time.\n` +
          `Returning it late moves your account standing one step along Verified → Watchlisted → Warning → Suspended, and a suspended account is permanently unable to borrow, reserve or renew.`,
        type: "due_reminder",
      });
    }

    for (const doc of holds.docs) {
      const hold = doc.data() as AnyObj;
      const expires = toMillis(hold.ShelfExpiresOn);
      if (expires === null) continue;
      const today = phDayStart(expires) === todayStart;
      notifications.push({
        patronUID: patronUidOf(doc.ref),
        title: `Book Pickup Reminder: ${today ? "Today" : "Tomorrow"}`,
        content:
          `Your reserved book "${String(hold.CollectionTitle || "")}" (Accession: ${String(hold.Accession || "")}) ` +
          `is waiting at the desk, and ${today ? "today" : "tomorrow"} (${phDateString(expires)}) is the last day to collect it.\n` +
          `After that it goes back on the shelf for other patrons.`,
        type: "pickup_reminder",
      });
    }

    let renewableSent = 0;
    for (const doc of renewable.docs) {
      const loan = doc.data() as AnyObj;
      const due = toMillis(loan.DueDate);
      if (due === null) continue;
      if (Number(loan.RenewalCount || 0) >= policy.MaxRenewals) continue;

      renewableSent++;
      notifications.push({
        patronUID: patronUidOf(doc.ref),
        title: "Book Can Now Be Renewed",
        content:
          `"${String(loan.CollectionTitle || "")}" (Accession: ${String(loan.Accession || "")}) ` +
          `is due ${phDateString(due)}, and you can renew it from today.\n` +
          "Renewing only works while a loan is not yet overdue, so it is worth doing before the due date passes.",
        type: "renewal",
      });
    }

    await notifyAll(db, notifications);
    console.log(
      `Reminders: ${loans.size} due, ${holds.size} pickups, ${renewableSent} renewable, ${notifications.length} sent.`,
    );
  },
);

export const purgeSettledReservations = onSchedule(
  { schedule: "45 2 * * *", timeZone: "Asia/Manila", timeoutSeconds: 540 },
  async () => {

    const expired = await db
      .collection("reservationRequests")
      .where("PurgeAt", "<=", Timestamp.fromMillis(Date.now()))
      .get();

    if (expired.empty) {
      console.log("Reservation purge: nothing due.");
      return;
    }

    const settled = new Set<string>(SETTLED_RESERVATION_STATUSES);
    const doomed = expired.docs.filter((doc) =>
      settled.has(String(doc.get("Status") ?? "")),
    );
    const skipped = expired.size - doomed.length;

    for (let i = 0; i < doomed.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      for (const doc of doomed.slice(i, i + BATCH_LIMIT)) batch.delete(doc.ref);
      await batch.commit();
    }

    console.log(
      `Reservation purge: deleted ${doomed.length} settled request(s)` +
        (skipped > 0
          ? `; left ${skipped} whose status was no longer settled.`
          : "."),
    );
  },
);

export type { CirculationPolicy, LoanStage };
export { LOAN_STAGE_ORDER };
