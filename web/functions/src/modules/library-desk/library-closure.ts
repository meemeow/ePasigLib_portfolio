import { unreadIncrements } from "../notifications/notification-common";
import { HttpsError } from "firebase-functions/v2/https";
import { requireStaffActor } from "../../core/guards";
import { Timestamp, db, serverTimestamp } from "../../core/firebase";
import { commitInChunks } from "../../core/batch";
import { str } from "../../core/coerce";
import { toMillis } from "../../core/time";
import {
  BATCH_LIMIT,
  DAY_MS,
  chunk,
  formatDateLong,
  notifyPatron,
  phDateString,
  phDayStart,
  transactionsRef,
} from "../circulation/circulation-policy";
import { renewedDueDate } from "../circulation/circulation-dates";
import {
  calendarFrom,
  clearCalendarCache,
  closureReason,
  isOpenDay,
} from "../circulation/library-calendar";

type AnyObj = Record<string, any>;

export const CLOSURE_PERMISSION = "AnnouncementCreation";

const CALENDAR_DOC = "library_calendar";
const REASON_MAX = 50;

// ==========================================
// || THE REGISTER                          ||
// ==========================================

const LOG_DOC = "library_closures";
const COUNTER_DOC = "library_closures_log";
const ID_PREFIX = "CLSR_TRAIL_";

export interface LibraryClosureLogEntry {
  Action: "LibraryClosureDeclare";
  TargetUID: string;
  TargetName: string;
  Reason: string;
  LoansExtended: number;
  LoanIDs: string[];
  UID: string;
  CreatedBy: string;
  CreatedByRole: "Staff";
  CreatedOn: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  Description: string;
}

export function libraryClosureLogEntriesRef(
  db: FirebaseFirestore.Firestore,
): FirebaseFirestore.CollectionReference {
  return db.collection("lmslogs").doc(LOG_DOC).collection("entries");
}

async function allocateClosureLogId(
  db: FirebaseFirestore.Firestore,
): Promise<string> {
  const metaRef = db.collection("metadata").doc(COUNTER_DOC);
  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(metaRef);
    const next = snap.exists
      ? Number((snap.data() as AnyObj)?.nextUID) || 1
      : 1;
    tx.set(metaRef, { nextUID: next + 1 }, { merge: true });
    return `${ID_PREFIX}${String(next).padStart(7, "0")}`;
  });
}

// ==========================================
// || THE HANDLER                           ||
// ==========================================

export interface DeclareLibraryClosurePayload {
  reason?: unknown;
}

export interface DeclareLibraryClosureResult {
  success: true;
  date: string;
  reason: string;
  loansExtended: number;
  patronsNotified: number;
  alreadyClosed: boolean;
}


export const declareLibraryClosure = async (
  data: DeclareLibraryClosurePayload,
  authUid: string | null,
): Promise<DeclareLibraryClosureResult> => {
  const staff = await requireStaffActor(authUid ?? undefined, CLOSURE_PERMISSION);
  const actorUid = staff.publicUID || staff.authUid;
  const actorName = staff.fullName || actorUid;

  const reason = str(data?.reason);
  if (!reason) {
    throw new HttpsError(
      "invalid-argument",
      "Say why the library is closed — the reason is what patrons see.",
    );
  }
  if (reason.length > REASON_MAX) {
    throw new HttpsError(
      "invalid-argument",
      `Keep the reason to ${REASON_MAX} characters or fewer.`,
    );
  }

  const now = Date.now();
  const today = phDateString(now);
  const dayStart = phDayStart(now);

  const claim = await db.runTransaction(async (tx) => {
    const calendarRef = db.collection("metadata").doc(CALENDAR_DOC);
    const snap = await tx.get(calendarRef);
    const fresh = calendarFrom(snap.data());

    if (!isOpenDay(now, fresh)) {
      return {
        taken: false,
        reason: fresh.closures[today] ?? closureReason(now, fresh) ?? "Closed",
        calendar: fresh,
      };
    }

    tx.set(calendarRef, { Closures: { [today]: reason } }, { merge: true });

    return { taken: true, reason, calendar: fresh };
  });

  clearCalendarCache();

  const calendar = claim.calendar;

  if (!claim.taken) {
    return {
      success: true,
      date: today,
      reason: claim.reason,
      loansExtended: 0,
      patronsNotified: 0,
      alreadyClosed: true,
    };
  }

  const dueToday = await db
    .collectionGroup("loans")
    .where("DueDate", ">=", Timestamp.fromMillis(dayStart))
    .where("DueDate", "<", Timestamp.fromMillis(dayStart + DAY_MS))
    .get();

  interface Moved {
    ref: FirebaseFirestore.DocumentReference;
    checkoutId: string;
    patronUID: string;
    title: string;
    accession: string;
    from: number;
    to: number;
  }

  const moved: Moved[] = [];

  for (const doc of dueToday.docs) {
    const loan = doc.data() as AnyObj;
    const from = toMillis(loan.DueDate);
    if (from === null) continue;

    const to = renewedDueDate(from, 1, calendar);
    if (to <= from) continue;

    moved.push({
      ref: doc.ref,
      checkoutId: str(loan.CheckoutTransactionId),
      patronUID: (doc.ref.parent.parent?.id ?? "").replace(/^CIRC_PATRN_/, ""),
      title: str(loan.CollectionTitle) || "your book",
      accession: str(loan.Accession),
      from,
      to,
    });
  }

  const shelfExpiringToday = await db
    .collectionGroup("holds")
    .where(
      "ShelfExpiresOn",
      ">=",
      Timestamp.fromMillis(dayStart),
    )
    .where(
      "ShelfExpiresOn",
      "<",
      Timestamp.fromMillis(dayStart + DAY_MS),
    )
    .get();

  interface MovedHold {
    ref: FirebaseFirestore.DocumentReference;
    patronUID: string;
    title: string;
    accession: string;
    from: number;
    to: number;
  }

  const heldOver: MovedHold[] = [];

  for (const doc of shelfExpiringToday.docs) {
    const hold = doc.data() as AnyObj;
    const from = toMillis(hold.ShelfExpiresOn);
    if (from === null) continue;

    const to = renewedDueDate(from, 1, calendar);
    if (to <= from) continue;

    heldOver.push({
      ref: doc.ref,
      patronUID: (doc.ref.parent.parent?.id ?? "").replace(/^CIRC_PATRN_/, ""),
      title: str(hold.CollectionTitle) || "your reserved book",
      accession: str(hold.Accession),
      from,
      to,
    });
  }

  for (const group of chunk(heldOver, BATCH_LIMIT)) {
    const batch = db.batch();
    for (const hold of group) {
      batch.update(hold.ref, {
        ShelfExpiresOn: Timestamp.fromMillis(hold.to),
      });
    }
    await batch.commit();
  }

  for (const group of chunk(moved, Math.floor(BATCH_LIMIT / 2))) {
    const batch = db.batch();
    for (const loan of group) {
      const to = Timestamp.fromMillis(loan.to);
      batch.update(loan.ref, {
        DueDate: to,
        Remarks: `Due date moved to ${phDateString(loan.to)} — library closed ${today}: ${reason}`,
      });
      if (loan.checkoutId) {
        batch.update(transactionsRef(db).doc(loan.checkoutId), { DueDate: to });
      }
    }
    await batch.commit();
  }

  const logId = await allocateClosureLogId(db);
  const entry: LibraryClosureLogEntry = {
    Action: "LibraryClosureDeclare",
    TargetUID: today,
    TargetName: formatDateLong(dayStart),
    Reason: reason,
    LoansExtended: moved.length,
    LoanIDs: moved.map((loan) => loan.ref.id),
    UID: actorUid,
    CreatedBy: actorName,
    CreatedByRole: "Staff",
    CreatedOn: serverTimestamp(),
    Description:
      `${actorName} closed the library on ${formatDateLong(dayStart)} (${reason})` +
      (moved.length > 0
        ? `, moving ${moved.length} due date${moved.length === 1 ? "" : "s"}.`
        : ", with no loans due that day."),
  };
  await libraryClosureLogEntriesRef(db).doc(logId).set(entry);

  const docIds = new Map<string, string>();
  for (const uid of new Set(
    [...moved, ...heldOver].map((row) => row.patronUID).filter(Boolean),
  )) {
    try {
      const direct = await db.collection("patrons").doc(uid).get();
      if (direct.exists) {
        docIds.set(uid, direct.id);
        continue;
      }
      const found = await db
        .collection("patrons")
        .where("UID", "==", uid)
        .limit(1)
        .get();
      if (!found.empty) docIds.set(uid, found.docs[0].id);
      else console.error(`Closure: no patron document for ${uid}`);
    } catch (error) {
      console.error(`Closure: could not resolve patron ${uid}:`, error);
    }
  }

  const told = new Set<string>();
  for (const loan of moved) {
    const docId = docIds.get(loan.patronUID);
    if (!docId) continue;
    told.add(docId);
    await notifyPatron(db, docId, {
      title: "Due Date Extended",
      content:
        `The library is closed today (${reason}), so "${loan.title}"` +
        (loan.accession ? ` (Accession: ${loan.accession})` : "") +
        ` is now due ${formatDateLong(loan.to)} instead of ${formatDateLong(loan.from)}.\n` +
        "You are not marked late for a day the library was shut.",
      type: "Circulation",
    });
  }

  for (const hold of heldOver) {
    const docId = docIds.get(hold.patronUID);
    if (!docId) continue;
    told.add(docId);
    await notifyPatron(db, docId, {
      title: "Pickup Window Extended",
      content:
        `The library is closed today (${reason}), so "${hold.title}"` +
        (hold.accession ? ` (Accession: ${hold.accession})` : "") +
        ` is still held for you until ${formatDateLong(hold.to)} instead of ${formatDateLong(hold.from)}.\n` +
        "You do not lose a reservation because of a day the library was shut.",
      type: "reservation",
    });
  }

  await fanOutClosureNotice(db, reason, told);

  return {
    success: true,
    date: today,
    reason,
    loansExtended: moved.length,
    patronsNotified: told.size,
    alreadyClosed: false,
  };
};

async function fanOutClosureNotice(
  db: FirebaseFirestore.Firestore,
  reason: string,
  skip: Set<string>,
): Promise<void> {
  try {
    const snap = await db.collection("patrons").select("Status").get();
    const targets = snap.docs.filter(
      (doc) =>
        !skip.has(doc.id) && String(doc.get("Status") ?? "Active") !== "Archived",
    );

    const notice = {
      title: "Library Closed Today",
      content:
        `The library is closed today (${reason}).\n` +
        "Any book due today has had its due date moved, and you will not be marked late for a day the library was shut.",
      type: "Circulation",
      pressable: false,
      isUpdate: false,
      read: false,
    };

    await commitInChunks(
      targets,
      (batch, doc) => {
        const patronRef = db.collection("patrons").doc(doc.id);
        batch.set(patronRef.collection("notifications").doc(), {
          ...notice,
          date: Timestamp.now(),
        });
        batch.set(patronRef, unreadIncrements(notice.type, 1), { merge: true });
      },
      200,
    );
  } catch (error) {
    console.error("Closure: could not fan out the closure notice:", error);
  }
}
