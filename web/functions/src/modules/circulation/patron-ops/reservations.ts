import { buildCirculationEntry } from "../../lms/writes/writing-lms-circulation";
import { patronName } from "../staff-ops";
import { BORROWING_STATES, allocateTransactionId, formatDateLong, holdsRef, isAvailable, allocateReservationId, loadPolicy, notifyPatron, notifyPatronByUid, patronCircRef, transactionsRef, reservationPurgeAt } from "../circulation-policy";
import { Timestamp, increment } from "../../../core/firebase";
import { AnyObj, HttpsError, requirePatronSelf } from "./shelf-common";


// ==========================================
// || RESERVE                               ||
// ==========================================

const MAX_PURPOSE_LENGTH = 300;


function cleanPurpose(value: unknown): string {
  const text = String(value ?? "");
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const control = (code < 32 && code !== 9) || (code >= 127 && code <= 159);
    out += control ? " " : ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, MAX_PURPOSE_LENGTH);
}


export async function reservationBatch(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { patronIdOrUID: string; books: AnyObj[]; purpose?: string },
) {
  const {
    ref: patronRef,
    data: patron,
    uid,
  } = await requirePatronSelf(db, authUid, input.patronIdOrUID);
  const policy = await loadPolicy(db);

  const items = Array.isArray(input.books) ? input.books : [];
  const purpose = cleanPurpose(input.purpose);
  if (!items.length) return { ok: false, error: "No books selected." };
  if (!purpose) {
    return { ok: false, error: "Tell us what you need the book for." };
  }

  const state = String(patron.State || "");
  if (!BORROWING_STATES.includes(state)) {
    return {
      ok: false,
      error: `Your account is "${state || "Unknown"}" and cannot reserve books.`,
    };
  }
  if (String(patron.City || "") !== "City of Pasig") {
    return {
      ok: false,
      error: "Only residents of the City of Pasig may reserve books.",
    };
  }

  const wanted = new Map<string, number>();
  for (const item of items) {
    const bookId = String(item?.book?.id || "");
    const quantity = Number(item?.quantity || 0);
    if (!bookId) return { ok: false, error: "Invalid book in cart." };
    if (quantity <= 0) continue;
    wanted.set(bookId, (wanted.get(bookId) || 0) + quantity);
  }
  if (!wanted.size) return { ok: false, error: "No books selected." };

  const bookIds = [...wanted.keys()];
  const name = patronName(patron);

  const expiresAt = Timestamp.fromMillis(
    Date.now() + policy.HoldRequestExpiryHours * 60 * 60 * 1000,
  );

  const outcome = await db.runTransaction(async (tx) => {
    const summaryRef = patronCircRef(db, uid);
    const pendingQuery = db
      .collection("reservationRequests")
      .where("PatronUID", "==", uid)
      .where("Status", "==", "Pending");
    const colRefs = bookIds.map((id) => db.collection("collections").doc(id));

    const [summarySnap, pendingSnap, colSnaps] = await Promise.all([
      tx.get(summaryRef),
      tx.get(pendingQuery),
      tx.getAll(...colRefs),
    ]);

    const summary = (summarySnap.exists ? summarySnap.data() : {}) as AnyObj;
    let pending = 0;
    for (const doc of pendingSnap.docs) {
      const books = (doc.data() as AnyObj).Books;
      pending += Array.isArray(books) ? books.length : 0;
    }
    const used =
      Number(summary.ActiveLoans || 0) +
      Number(summary.ActiveHolds || 0) +
      pending;

    let slotsLeft = Math.max(0, policy.MaxActiveLoans - used);
    if (slotsLeft <= 0) {
      return {
        units: [] as AnyObj[],
        shortfalls: [] as Array<{ title: string; reason: string }>,
        capped: true,
        used,
      };
    }

    const units: AnyObj[] = [];
    const shortfalls: Array<{ title: string; reason: string }> = [];
    const copyWrites: Array<{
      ref: FirebaseFirestore.DocumentReference;
      copies: AnyObj[];
    }> = [];
    const uidByBook = new Map<string, string>();

    for (let i = 0; i < colRefs.length; i++) {
      const snap = colSnaps[i];
      const bookId = colRefs[i].id;
      const asked = wanted.get(bookId) || 0;

      if (!snap.exists) {
        shortfalls.push({
          title: bookId,
          reason: "is no longer in the catalogue",
        });
        continue;
      }

      const collection = snap.data() as AnyObj;
      const title = String(collection.CollectionTitle || bookId);
      uidByBook.set(bookId, String(collection.UID || bookId));
      const copies: AnyObj[] = Array.isArray(collection.Copies)
        ? [...collection.Copies]
        : [];

      const free = copies
        .map((copy, index) => ({ copy, index }))
        .filter(({ copy }) => isAvailable(copy));

      const take = Math.min(asked, free.length, slotsLeft);

      if (take < asked) {
        shortfalls.push({
          title,
          reason:
            free.length < asked
              ? `only ${free.length} of the ${asked} copies you asked for ` +
                `${free.length === 1 ? "is" : "are"} still free — ` +
                `someone else reserved or borrowed the ${
                  asked - free.length === 1 ? "other" : "others"
                }`
              : `you have ${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left, ` +
                `and this title alone asks for ${asked}`,
        });
        slotsLeft -= Math.max(0, take);
        continue;
      }

      for (const { copy, index } of free.slice(0, take)) {
        copies[index] = { ...copy, Availability: "Pending" };
        units.push({
          BookID: bookId,
          Accession: String(copy.Accession || ""),
          CollectionTitle: title,
          MainAuthor: String(collection.MainAuthor || ""),
          CollectionImage: String(collection.CollectionImage || ""),
        });
      }
      slotsLeft -= take;
      copyWrites.push({ ref: colRefs[i], copies });
    }

    if (shortfalls.length) {
      return { units: [], shortfalls, capped: false, used };
    }

    if (!units.length) {
      return { units, shortfalls, capped: false, used };
    }

    const { ids: entryIds, commit } = await allocateTransactionId(
      tx,
      db,
      units.length,
    );
    const { ids: newRequestIds, commit: commitRequestId } =
      await allocateReservationId(tx, db, units.length);
    const nowTs = Timestamp.now();

    commit();
    commitRequestId();
    for (const write of copyWrites)
      tx.update(write.ref, { Copies: write.copies });

    const requestIds: string[] = [];
    units.forEach((unit, index) => {
      const entryId = entryIds[index];
      const requestId = newRequestIds[index];
      requestIds.push(requestId);

      tx.set(db.collection("reservationRequests").doc(requestId), {
        PatronUID: uid,
        PatronDocId: patronRef.id,
        PatronName: name,
        Books: [unit],
        BookIDs: [unit.BookID],
        Purpose: purpose,
        RequestedOn: nowTs,
        ExpiresAt: expiresAt,
        Status: "Pending",
        TransactionId: entryId,
      });

      tx.set(
        transactionsRef(db).doc(entryId),
        buildCirculationEntry(
          {
            case: "reservation",
            type: "Reservation",
            status: "Pending",
            action: "Requested a book reservation",
            description: `${uid} reserved copy ${unit.Accession} of "${unit.CollectionTitle}"`,
            processedBy: "",
            targetName: name,
            targetUID: uid,
            UID: "",
            accession: unit.Accession,
            collectionTitle: unit.CollectionTitle,
            collectionUID: uidByBook.get(unit.BookID) || unit.BookID,
            books: [unit] as any,
            purpose,
          },
          nowTs,
        ),
      );
    });

    return { units, shortfalls, requestIds, capped: false, used };
  });

  if (!outcome.units.length) {
    if (outcome.capped) {
      return {
        ok: false,
        error: `You may hold ${policy.MaxActiveLoans} items at a time and already have ${outcome.used}.`,
      };
    }
    const reasons = outcome.shortfalls;
    if (!reasons.length) {
      return { ok: false, error: "No copies are free to reserve right now." };
    }
    const detail =
      reasons.length === 1
        ? `“${reasons[0].title}” — ${reasons[0].reason}.`
        : reasons.map((s) => `“${s.title}” — ${s.reason}.`).join(" ");
    return {
      ok: false,
      error:
        `${detail} Nothing has been reserved, so your cart is untouched — ` +
        `adjust how many copies you are asking for and send it again.`,
    };
  }

  const list = outcome.units.map((u) => `• ${u.CollectionTitle}`).join("\n");
  await notifyPatron(db, patronRef.id, {
    title: "Book Reservation Request Submitted",
    content:
      `A copy of each of these is now set aside pending approval:\n${list}\n` +
      `\n${
        outcome.units.length > 1
          ? "Each copy is reserved separately, so they may be confirmed at different times. "
          : ""
      }A librarian has ${policy.HoldRequestExpiryHours} hours to ` +
      `answer, and if nobody does, the ` +
      `${outcome.units.length > 1 ? "copies go" : "copy goes"} back on the shelf. ` +
      `Say yes and you will get ${policy.PickupWindowDays} open days to collect — ` +
      `we will tell you the exact dates then.`,
    type: "reservation",
  });

  return { ok: true, requestIds: outcome.requestIds };
}


export async function reservationCancel(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { requestId: string },
) {
  const { uid } = await requirePatronSelf(db, authUid, "");
  const requestId = String(input.requestId || "").trim();
  if (!requestId) return { ok: false, error: "Invalid request." };

  const requestRef = db.collection("reservationRequests").doc(requestId);

  await db.runTransaction(async (tx) => {
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists)
      throw new HttpsError("not-found", "Reservation not found.");

    const request = requestSnap.data() as AnyObj;
    if (String(request.PatronUID || "") !== uid) {
      throw new HttpsError(
        "permission-denied",
        "That is not your reservation.",
      );
    }

    const status = String(request.Status || "");
    if (status !== "Pending" && status !== "Approved") {
      throw new HttpsError(
        "failed-precondition",
        `This reservation is already ${status.toLowerCase()}.`,
      );
    }

    const books: AnyObj[] = Array.isArray(request.Books) ? request.Books : [];
    const trapped = books.filter((b) => String(b.Accession || ""));

    const byBook = new Map<string, Set<string>>();
    for (const book of trapped) {
      const id = String(book.BookID || "");
      if (!id) continue;
      if (!byBook.has(id)) byBook.set(id, new Set());
      byBook.get(id)!.add(String(book.Accession || ""));
    }

    const colRefs = [...byBook.keys()].map((id) =>
      db.collection("collections").doc(id),
    );
    const colSnaps = await Promise.all(colRefs.map((ref) => tx.get(ref)));
    const holdsSnap = await tx.get(
      holdsRef(db, uid).where("RequestId", "==", requestId),
    );

    const nowTs = Timestamp.now();

    for (let i = 0; i < colRefs.length; i++) {
      if (!colSnaps[i].exists) continue;
      const collection = colSnaps[i].data() as AnyObj;
      if (!Array.isArray(collection.Copies)) continue;
      const wanted = byBook.get(colRefs[i].id)!;
      const copies = collection.Copies.map((copy: AnyObj) => {
        const state = String(copy?.Availability || "");
        return wanted.has(String(copy?.Accession || "")) &&
          (state === "Pending" || state === "Reserved")
          ? { ...copy, Availability: "Available" }
          : copy;
      });
      tx.update(colRefs[i], { Copies: copies });
    }

    for (const doc of holdsSnap.docs) tx.delete(doc.ref);
    if (holdsSnap.size > 0) {
      tx.set(
        patronCircRef(db, uid),
        { ActiveHolds: increment(-holdsSnap.size) },
        { merge: true },
      );
    }

    const remarks = `Cancelled by the patron on ${formatDateLong(Date.now())}.`;
    tx.update(requestRef, {
      Status: "Cancelled",
      Remarks: remarks,
      ProcessedOn: nowTs,
      PurgeAt: reservationPurgeAt(),
    });
    if (request.TransactionId) {
      tx.update(transactionsRef(db).doc(String(request.TransactionId)), {
        Status: "Cancelled",
        Remarks: remarks,
        ProcessedOn: nowTs,
      });
    }
  });

  await notifyPatronByUid(db, uid, {
    title: "Reservation Cancelled",
    content:
      "Your reservation request has been cancelled and the copies are back on the shelf for other patrons.",
    type: "reservation",
  });

  return { ok: true };
}
