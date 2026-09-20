import { HttpsError } from "firebase-functions/v2/https";
import { requireStaffActor } from "../../core/guards";
import {
  loadPolicy,
  notifyPatronByUid,
  SUGGESTIONS_COLLECTION,
} from "../circulation/circulation-policy";
import {
  identityKeyOf,
  identityOf,
  isbnSet,
  sameSuggestion,
  type SuggestionIdentity,
} from "./book-request-matching";
import {
  allocateBookRequestLogId,
  allocateBookRequestLogIdStandalone,
  buildBookRequestLogEntry,
  bookRequestLogEntriesRef,
  writeBookRequestLogEntry,
  type BookRequestActor,
} from "./book-request-logs";
import { resolveBookRequestGroup } from "./book-request-reads";
import {
  isBookRequestStatus,
  type AddBookRequestPayload,
  type AddBookRequestResult,
  type BookRequestActionResult,
  type BookRequestGroupActionPayload,
  type BookRequestStatus,
  type SetBookRequestStatusPayload,
  type SetBookRequestStatusResult,
} from "./book-request-types";
import { Timestamp, db } from "../../core/firebase";
import { str } from "../../core/coerce";

export const BOOK_REQUESTS_PERMISSION = "LiveChat";


interface HeldSuggestion {
  identity: SuggestionIdentity;
  label: string;
}

export function suggestionQuotaQuery(
  db: FirebaseFirestore.Firestore,
  requestedBy: string,
): FirebaseFirestore.Query {
  return db
    .collection(SUGGESTIONS_COLLECTION)
    .where("RequestedBy", "==", requestedBy);
}

export function summariseSuggestionQuota(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  limit: number,
  windowDays: number,
) {
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const held: HeldSuggestion[] = [];

  for (const doc of docs) {
    const d = (doc.data() as Record<string, unknown>) || {};
    const raw = d.CreatedOn as { toMillis?: () => number } | undefined;
    const createdOn = raw?.toMillis ? raw.toMillis() : null;
    if (createdOn !== null && createdOn < since) continue;

    const label = str(d.Title ?? d.title);
    if (!label) continue;

    const identity = identityOf({
      title: label,
      author: d.Author ?? d.author,
      isbn10: d.ISBN10 ?? d.isbn10,
      isbn13: d.ISBN13 ?? d.isbn13,
    });

    if (held.some((entry) => sameSuggestion(entry.identity, identity))) continue;
    held.push({ identity, label });
  }

  const used = held.length;
  return {
    limit,
    windowDays,
    used,
    remaining: Math.max(0, limit - used),
    titles: held.map((entry) => entry.label),
    held,
  };
}

export async function readSuggestionQuota(
  db: FirebaseFirestore.Firestore,
  requestedBy: string,
) {
  const policy = await loadPolicy(db);
  const limit = policy.MaxWeeklySuggestions;
  const windowDays = policy.SuggestionWindowDays;

  if (!requestedBy) {
    return {
      limit,
      windowDays,
      used: 0,
      remaining: limit,
      titles: [] as string[],
      held: [] as HeldSuggestion[],
    };
  }

  const snap = await suggestionQuotaQuery(db, requestedBy).get();
  return summariseSuggestionQuota(snap.docs, limit, windowDays);
}

async function requirePatronActor(
  db: FirebaseFirestore.Firestore,
  authUid: string | null,
): Promise<BookRequestActor> {
  if (!authUid) {
    throw new HttpsError(
      "unauthenticated",
      "Please sign in to suggest a book.",
    );
  }

  const snap = await db.collection("patrons").doc(authUid).get();
  if (!snap.exists) {
    throw new HttpsError(
      "permission-denied",
      "Only library patrons can suggest a book.",
    );
  }

  const data = (snap.data() as Record<string, unknown>) || {};
  if (str(data.Status) === "Archived") {
    throw new HttpsError("permission-denied", "This account is archived.");
  }

  const name = `${str(data.FirstName)} ${str(data.LastName)}`.trim();
  const uid = str(data.UID) || authUid;
  return { uid, name: name || uid, role: "Patron" };
}

async function requireDeskActor(
  authUid: string | null,
): Promise<BookRequestActor> {
  const actor = await requireStaffActor(
    authUid ?? undefined,
    BOOK_REQUESTS_PERMISSION,
  );
  const uid = actor.publicUID || actor.authUid;
  return { uid, name: actor.fullName || uid, role: "Staff" };
}

export const addBookRequest = async (
  data: AddBookRequestPayload,
  authUid: string | null,
): Promise<AddBookRequestResult> => {
  const actor = await requirePatronActor(db, authUid);

  const title = str(data?.title);
  const author = str(data?.author);
  if (!title || !author) {
    throw new HttpsError("invalid-argument", "A title and an author are required.");
  }

  const isbn10 = str(data?.isbn10);
  const isbn13 = str(data?.isbn13);
  const source = str(data?.source) === "GoogleBooks" ? "GoogleBooks" : "Manual";

  const policy = await loadPolicy(db);

  const candidate = identityOf({ title, author, isbn10, isbn13 });
  const identityKey = identityKeyOf({ title, author });
  const requestRef = db.collection(SUGGESTIONS_COLLECTION).doc();

  const spent = await db.runTransaction(async (tx) => {
    const heldSnap = await tx.get(suggestionQuotaQuery(db, actor.uid));
    const quota = summariseSuggestionQuota(
      heldSnap.docs,
      policy.MaxWeeklySuggestions,
      policy.SuggestionWindowDays,
    );

    const clash = quota.held.find((entry) =>
      sameSuggestion(entry.identity, candidate),
    );
    if (clash) {
      throw new HttpsError(
        "already-exists",
        `You have already suggested "${clash.label}" this week.`,
      );
    }

    if (quota.remaining <= 0) {
      throw new HttpsError(
        "resource-exhausted",
        `You have used all ${quota.limit} suggestions for this week. Please try again next week.`,
      );
    }

    const { id: logId, commit } = await allocateBookRequestLogId(tx, db);

    tx.set(requestRef, {
      Title: title,
      Author: author,
      Publisher: str(data?.publisher) || null,
      Description: str(data?.description) || null,
      RequestedBy: actor.uid,
      RequestedByName: actor.name,
      ISBN10: isbn10 || null,
      ISBN13: isbn13 || null,
      ISBNs: Array.from(isbnSet({ isbn10, isbn13 })),
      IdentityKey: identityKey,
      Source: source,
      GoogleBookId: str(data?.googleBookId) || null,
      GoogleBookInfoLink: str(data?.googleBookInfoLink) || null,
      GoogleBookImage: str(data?.googleBookImage) || null,
      Status: "Under Review" satisfies BookRequestStatus,
      ReviewedBy: null,
      ReviewedOn: null,
      CreatedOn: Timestamp.now(),
    });

    commit();
    writeBookRequestLogEntry(tx, db, logId, {
      action: "BookRequestCreate",
      targetUID: identityKey,
      targetName: title,
      author,
      requestIds: [requestRef.id],
      toStatus: "Under Review",
      actor,
    });

    return {
      limit: quota.limit,
      used: quota.used + 1,
      remaining: Math.max(0, quota.remaining - 1),
    };
  });

  await notifyPatronByUid(db, authUid ?? actor.uid, {
    title: "Book Suggestion Received",
    content:
      `Thanks — the library has your suggestion for "${title}"${
        author ? ` by ${author}` : ""
      }.\n` +
      "A librarian will review it and you will be told what they decide.",
    type: "book_request",
  });

  return {
    success: true,
    id: requestRef.id,
    limit: spent.limit,
    used: spent.used,
    remaining: spent.remaining,
  };
};

async function requireGroup(
  db: FirebaseFirestore.Firestore,
  data: BookRequestGroupActionPayload,
) {
  const id = str(data?.id);
  const title = str(data?.Title);
  const author = str(data?.Author);

  if (!id && !title) {
    throw new HttpsError(
      "invalid-argument",
      "Which book? Send the group id or its title.",
    );
  }

  const group = await resolveBookRequestGroup(db, id, title, author);
  if (!group) {
    throw new HttpsError(
      "not-found",
      "That book is no longer in the request queue.",
    );
  }
  return group;
}

export const setBookRequestStatus = async (
  data: SetBookRequestStatusPayload,
  authUid: string | null,
): Promise<SetBookRequestStatusResult> => {
  const actor = await requireDeskActor(authUid);

  const status = data?.status;
  if (!isBookRequestStatus(status)) {
    throw new HttpsError(
      "invalid-argument",
      "Status must be Under Review, Approved or Declined.",
    );
  }

  const group = await requireGroup(db, data);
  if (group.Status === status) {
    throw new HttpsError(
      "failed-precondition",
      `"${group.Title}" is already ${status.toLowerCase()}.`,
    );
  }

  const logId = await allocateBookRequestLogIdStandalone(db);
  const now = Timestamp.now();
  const batch = db.batch();

  const requestRefs = group.RequestIDs.map((id) =>
    db.collection(SUGGESTIONS_COLLECTION).doc(id),
  );
  const requestSnaps = requestRefs.length ? await db.getAll(...requestRefs) : [];
  const requesters = new Set<string>();
  for (const snap of requestSnaps) {
    const uid = str((snap.data() || {}).RequestedBy);
    if (uid) requesters.add(uid);
  }

  for (const requestId of group.RequestIDs) {
    batch.update(db.collection(SUGGESTIONS_COLLECTION).doc(requestId), {
      Status: status,
      ReviewedBy: actor.uid,
      ReviewedOn: now,
    });
  }

  batch.set(
    bookRequestLogEntriesRef(db).doc(logId),
    buildBookRequestLogEntry(
      {
        action:
          status === "Approved"
            ? "BookRequestApprove"
            : status === "Declined"
              ? "BookRequestDecline"
              : "BookRequestReopen",
        targetUID: group.id,
        targetName: group.Title,
        author: group.Author,
        requestIds: group.RequestIDs,
        fromStatus: group.Status,
        toStatus: status,
        actor,
      },
      now,
    ),
  );

  await batch.commit();

  if (status !== "Under Review") {
    const book = `"${group.Title}"${group.Author ? ` by ${group.Author}` : ""}`;
    await Promise.all(
      [...requesters].map((uid) =>
        notifyPatronByUid(db, uid, {
          title:
            status === "Approved"
              ? "Book Suggestion Approved"
              : "Book Suggestion Declined",
          content:
            status === "Approved"
              ? `The library approved your suggestion for ${book}. It will be added to the catalogue, and you will be told when it is available to borrow.`
              : `The library reviewed your suggestion for ${book} and decided not to add it this time. Thank you for suggesting it.`,
          type: "book_request",
        }),
      ),
    );
  }

  return {
    success: true,
    id: group.id,
    status,
    affected: group.RequestIDs.length,
    requestIds: group.RequestIDs,
  };
};

export const deleteBookRequestGroup = async (
  data: BookRequestGroupActionPayload,
  authUid: string | null,
): Promise<BookRequestActionResult> => {
  const actor = await requireDeskActor(authUid);

  const group = await requireGroup(db, data);
  const logId = await allocateBookRequestLogIdStandalone(db);
  const now = Timestamp.now();
  const batch = db.batch();

  for (const requestId of group.RequestIDs) {
    batch.delete(db.collection(SUGGESTIONS_COLLECTION).doc(requestId));
  }

  batch.set(
    bookRequestLogEntriesRef(db).doc(logId),
    buildBookRequestLogEntry(
      {
        action: "BookRequestDelete",
        targetUID: group.id,
        targetName: group.Title,
        author: group.Author,
        requestIds: group.RequestIDs,
        fromStatus: group.Status,
        actor,
      },
      now,
    ),
  );

  await batch.commit();

  return {
    success: true,
    id: group.id,
    affected: group.RequestIDs.length,
    requestIds: group.RequestIDs,
  };
};
