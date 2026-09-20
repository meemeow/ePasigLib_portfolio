import { requireStaffActor } from "../../../core/guards";
import { Timestamp, increment } from "../../../core/firebase";
import { holdId, formatDateLong, holdsRef, loadPolicy, notifyPatron, patronCircRef, toDateSafe, transactionsRef, reservationPurgeAt } from "../circulation-policy";
import { loadCalendar } from "../library-calendar";
import { pickupWindowFor } from "../circulation-dates";
import { AnyObj, HttpsError } from "./staff-common";


// ==========================================
// || RESERVATION APPROVAL                  ||
// ==========================================

export async function reservationAction(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  input: { docId: string; action: "approve" | "reject"; remarks?: string },
) {
  const { docId, action } = input;
  const remarks = String(input.remarks || "").trim();
  if (!docId || (action !== "approve" && action !== "reject")) {
    throw new HttpsError("invalid-argument", "Missing parameters.");
  }

  const staff = await requireStaffActor(authUid, "Checkout");
  const [policy, calendar] = await Promise.all([
    loadPolicy(db),
    loadCalendar(db),
  ]);
  const requestRef = db.collection("reservationRequests").doc(docId);

  const outcome = await db.runTransaction(async (tx) => {
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists)
      throw new HttpsError("not-found", "Reservation not found.");

    const request = requestSnap.data() as AnyObj;
    if (String(request.Status || "") !== "Pending") {
      throw new HttpsError(
        "failed-precondition",
        `This reservation has already been ${String(request.Status || "actioned").toLowerCase()}.`,
      );
    }

    const expiresAt =
      toDateSafe(request.ExpiresAt)?.getTime() ??
      (toDateSafe(request.RequestedOn)?.getTime() ?? 0) +
        policy.HoldRequestExpiryHours * 60 * 60 * 1000;
    if (expiresAt && Date.now() > expiresAt) {
      throw new HttpsError(
        "failed-precondition",
        `This request expired on ${formatDateLong(expiresAt)} and can no longer be ` +
          `approved or rejected. The copy returns to the shelf automatically — ` +
          `refresh the queue.`,
      );
    }

    const patronUID = String(request.PatronUID || "");
    const patronDocId = String(request.PatronDocId || "");
    const books: AnyObj[] = Array.isArray(request.Books) ? request.Books : [];
    const entryId = String(request.TransactionId || "");
    const nowTs = Timestamp.now();

    const wanted = new Map<string, Set<string>>();
    for (const book of books) {
      const bookId = String(book.BookID || "");
      const accession = String(book.Accession || "");
      if (!bookId || !accession) continue;
      const set = wanted.get(bookId) ?? new Set<string>();
      set.add(accession);
      wanted.set(bookId, set);
    }

    const colRefs = [...wanted.keys()].map((id) =>
      db.collection("collections").doc(id),
    );
    const colSnaps = colRefs.length ? await tx.getAll(...colRefs) : [];

    const moved: AnyObj[] = [];
    const copyWrites: Array<{
      ref: FirebaseFirestore.DocumentReference;
      copies: AnyObj[];
    }> = [];
    const destination = action === "approve" ? "Reserved" : "Available";

    for (let i = 0; i < colRefs.length; i++) {
      const snap = colSnaps[i];
      const bookId = colRefs[i].id;
      const accessions = wanted.get(bookId) ?? new Set<string>();
      if (!snap.exists) {
        throw new HttpsError(
          "not-found",
          "A reserved title is no longer catalogued.",
        );
      }
      const collection = snap.data() as AnyObj;
      const copies: AnyObj[] = Array.isArray(collection.Copies)
        ? [...collection.Copies]
        : [];

      for (let index = 0; index < copies.length; index++) {
        const copy = copies[index];
        if (!accessions.has(String(copy?.Accession || ""))) continue;

        if (String(copy?.Availability || "") !== "Pending") {
          throw new HttpsError(
            "failed-precondition",
            `Copy ${String(copy?.Accession || "")} is no longer held by this ` +
              `reservation (it is now "${String(copy?.Availability || "Unknown")}"). ` +
              "Refresh the queue — the request has probably expired.",
          );
        }

        copies[index] = { ...copy, Availability: destination };
        moved.push({
          BookID: bookId,
          Accession: String(copy.Accession || ""),
          CollectionTitle: String(collection.CollectionTitle || ""),
          MainAuthor: String(collection.MainAuthor || ""),
          CollectionImage: String(collection.CollectionImage || ""),
        });
      }
      copyWrites.push({ ref: colRefs[i], copies });
    }

    for (const write of copyWrites)
      tx.update(write.ref, { Copies: write.copies });

    if (action === "reject") {
      tx.update(requestRef, {
        Status: "Rejected",
        Remarks: remarks,
        ProcessedBy: staff.fullName,
        ProcessedOn: nowTs,
        UID: staff.publicUID,
        PurgeAt: reservationPurgeAt(),
      });
      if (entryId) {
        tx.update(transactionsRef(db).doc(entryId), {
          Status: "Rejected",
          Remarks: remarks,
          ProcessedBy: staff.fullName,
          ProcessedOn: nowTs,
          UID: staff.publicUID,
        });
      }
      return { action, patronDocId, trapped: [] as AnyObj[] };
    }

    const trapped = moved;
    const summaryRef = patronCircRef(db, patronUID);

    const { from, until } = pickupWindowFor(nowTs.toMillis(), policy, calendar);
    const pickupFrom = Timestamp.fromMillis(from);
    const shelfExpires = Timestamp.fromMillis(until);

    for (const book of trapped) {
      tx.set(holdsRef(db, patronUID).doc(holdId(book.Accession)), {
        BookID: book.BookID,
        Accession: book.Accession,
        CollectionTitle: book.CollectionTitle,
        CollectionImage: book.CollectionImage,
        TrappedOn: nowTs,
        PickupFrom: pickupFrom,
        ShelfExpiresOn: shelfExpires,
        ApprovedBy: staff.fullName,
        UID: staff.publicUID,
        RequestId: docId,
      });
    }

    tx.set(
      summaryRef,
      {
        UID: patronUID,
        TargetName: String(request.PatronName || ""),
        ActiveHolds: increment(trapped.length),
      },
      { merge: true },
    );

    tx.update(requestRef, {
      Status: "Approved",
      Books: trapped,
      PickupFrom: pickupFrom,
      ShelfExpiresOn: shelfExpires,
      ProcessedBy: staff.fullName,
      ProcessedOn: nowTs,
      UID: staff.publicUID,
    });

    if (entryId) {
      tx.update(transactionsRef(db).doc(entryId), {
        Status: "Approved",
        Books: trapped,
        ProcessedBy: staff.fullName,
        ProcessedOn: nowTs,
        UID: staff.publicUID,
        Remarks: `Ready to collect from ${formatDateLong(from)}, held until ${formatDateLong(until)}.`,
      });
    }

    return { action, patronDocId, trapped, from, until };
  });

  if (outcome.patronDocId) {
    if (outcome.action === "approve") {
      const list = outcome.trapped
        .map((b) => `• ${b.CollectionTitle} (Accession: ${b.Accession})`)
        .join("\n");
      const from = Number((outcome as AnyObj).from);
      const until = Number((outcome as AnyObj).until);
      await notifyPatron(db, outcome.patronDocId, {
        title: "Book Reservation Approved!",
        content:
          `Your reservation is ready to collect from ${formatDateLong(from)}.\n${list}\n` +
          `Please collect it on or before ${formatDateLong(until)}, after which the copies return to the shelf.`,
        type: "reservation",
      });
    } else {
      await notifyPatron(db, outcome.patronDocId, {
        title: "Book Reservation Rejected",
        content: `Your reservation request was rejected. Reason: ${remarks || "No remarks provided."}`,
        type: "reservation",
      });
    }
  }

  return {
    ok: true,
    pickupFrom: outcome.action === "approve" ? (outcome as AnyObj).from : null,
    shelfExpiresOn:
      outcome.action === "approve" ? (outcome as AnyObj).until : null,
  };
}
