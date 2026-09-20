import * as functions from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";
import { writingLogsAttemptInternal } from "../lms/writes/writing-logs";
import { requireStaffActor } from "../../core/guards";
import {  AddCollectionRequest,
  AddCollectionResult,
  CollectionArchiveAction,
  CollectionArchiveRequest,
  CollectionArchiveResult,
  EditCollectionInformationRequest,
  EditCollectionInformationResult,
  UpdateCollectionImageRequest,
} from "./crud-collection-record-types";
import { db, serverTimestamp } from "../../core/firebase";

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/**
 * Trims every string on its way into the store, including strings nested in
 * arrays (Subjects, Copies) and sub-objects.
 *
 * Cataloguing forms let stray whitespace through, and it does not stay
 * invisible: a title saved as " Critters of the Night" surfaces with that
 * leading space in the OPAC heading, the browser tab, the sitemap and the
 * search-result snippet. Cleaning it here means the store never holds the
 * problem, rather than every reader having to trim defensively.
 *
 * Only plain objects are walked, so Firestore sentinels and Timestamps are
 * passed through untouched.
 */
function deepTrim<T>(value: T): T {
  if (typeof value === "string") return value.trim() as unknown as T;

  if (Array.isArray(value)) {
    return value.map((entry) => deepTrim(entry)) as unknown as T;
  }

  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        deepTrim(entry),
      ]),
    ) as unknown as T;
  }

  return value;
}

async function assertIsbnIsFree(
  field: "ISBN10" | "ISBN13",
  value: string,
  exceptDocId?: string,
): Promise<void> {
  if (!value) return;
  const snap = await db
    .collection("collections")
    .where(field, "==", value)
    .limit(2)
    .get();
  const clash = snap.docs.find((doc) => doc.id !== exceptDocId);
  if (clash) {
    throw new HttpsError(
      "already-exists",
      `A collection with ${field === "ISBN13" ? "ISBN-13" : "ISBN-10"} "${value}" already exists.`,
    );
  }
}

const SERVER_OWNED_FIELDS = [
  "UID",
  "CreatedOn",
  "CreatedBy",
  "ModifiedOn",
  "LastModifiedBy",
  "Status",
  "LastBorrowedDate",
] as const;

const COPY_OUT_STATES = new Set(["Borrowed", "Reserved", "Pending"]);

function assertNoCopiesOut(copies: unknown): void {
  if (!Array.isArray(copies)) return;

  const out = copies.filter((copy) =>
    COPY_OUT_STATES.has(text((copy as { Availability?: unknown })?.Availability)),
  );
  if (out.length === 0) return;

  const accessions = out
    .map((copy) => text((copy as { Accession?: unknown })?.Accession))
    .filter(Boolean)
    .slice(0, 5);

  throw new HttpsError(
    "failed-precondition",
    `${out.length} cop${out.length === 1 ? "y is" : "ies are"} still spoken ` +
      `for${accessions.length ? ` (${accessions.join(", ")})` : ""} — borrowed, ` +
      "on the hold shelf, or on a reservation awaiting a decision. Settle them " +
      "before archiving this collection.",
  );
}

function stripServerOwnedFields(
  profileData: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...profileData };
  for (const field of SERVER_OWNED_FIELDS) delete clean[field];
  return clean;
}

export const addCollectionRecord = async (
  data: AddCollectionRequest,
  authUid: string | null,
): Promise<AddCollectionResult> => {
  try {
    const actor = await requireStaffActor(authUid ?? undefined, "CatalogingAdd");

    if (!data || !data.CollectionTitle || !data.MainAuthor) {
      throw new HttpsError(
        "invalid-argument",
        "CollectionTitle and MainAuthor are required",
      );
    }

    await assertIsbnIsFree("ISBN13", text(data.ISBN13));
    await assertIsbnIsFree("ISBN10", text(data.ISBN10));

    const actorDisplay = actor.fullName || actor.publicUID;
    const { case: _omitCase, ...rawData } = data;
    const cleanData = deepTrim(rawData);

    const costPrice =
      typeof data.CostPrice === "string" ? parseFloat(data.CostPrice) : NaN;

    const result = await db.runTransaction<AddCollectionResult>(
      async (transaction) => {
        const metaRef = db.collection("metadata").doc("collection_uid_counter");
        const metaSnap = await transaction.get(metaRef);
        const stored = metaSnap.exists
          ? Number((metaSnap.data() as { nextUID?: number })?.nextUID)
          : NaN;
        const current = Number.isFinite(stored) && stored > 0 ? stored : 1;

        const generatedUID = `C${String(current).padStart(7, "0")}`;
        transaction.set(metaRef, { nextUID: current + 1 }, { merge: true });

        const nowTs = serverTimestamp();
        const createdBy = actorDisplay || authUid || null;

        const colRef = db.collection("collections").doc();
        transaction.set(
          colRef,
          {
            ...cleanData,
            ...(Number.isNaN(costPrice) ? {} : { CostPrice: costPrice }),
            UID: generatedUID,
            CreatedBy: createdBy,
            LastModifiedBy: createdBy,
            CreatedOn: nowTs,
            ModifiedOn: nowTs,
            LastBorrowedDate: "",
            Status: "Available",
          },
          { merge: true },
        );

        return {
          success: true,
          id: colRef.id,
          UID: generatedUID,
          CreatedBy: createdBy,
        };
      },
    );

    try {
      await writingLogsAttemptInternal({
        case: "collectionAdd",
        Action: "CatalogingAdd",
        UID: authUid || "",
        TargetUID: result.UID,
        TargetName: text(data.CollectionTitle),
      });
    } catch (logError) {
      console.error("Failed to write collection add log (non-fatal):", logError);
    }

    return result;
  } catch (error) {
    console.error("Error in addCollectionRecord:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to add collection record");
  }
};

export const updateCollectionImage = async (
  data: UpdateCollectionImageRequest,
  authUid: string | null,
): Promise<{ success: true }> => {
  try {
    const actor = await requireStaffActor(authUid ?? undefined, [
      "CatalogingAdd",
      "CatalogingEdit",
    ]);
    const docId = text(data.docId || data.id).trim();
    const imageUrl = text(data.imageUrl).trim();
    if (!docId || !imageUrl) {
      throw new HttpsError(
        "invalid-argument",
        "docId and imageUrl are required",
      );
    }

    const colRef = db.collection("collections").doc(docId);
    const snap = await colRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Collection document not found");
    }

    const actorDisplay = actor.fullName || actor.publicUID;

    await colRef.update({
      CollectionImage: imageUrl,
      ModifiedOn: serverTimestamp(),
      LastModifiedBy: actorDisplay || authUid || null,
    });

    return { success: true };
  } catch (error) {
    console.error("Error in updateCollectionImage:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to update collection image");
  }
};

export const editCollectionInformation = async (
  data: EditCollectionInformationRequest,
  authUid: string | null,
): Promise<EditCollectionInformationResult> => {
  try {
    const actor = await requireStaffActor(authUid ?? undefined, "CatalogingEdit");
    const { targetUID, profileData } = data;

    if (!targetUID || !profileData || typeof profileData !== "object") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "targetUID and profileData are required",
      );
    }

    const docId = String(targetUID);
    const docRef = db.collection("collections").doc(docId);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "That collection no longer exists.",
      );
    }

    const clean = deepTrim(stripServerOwnedFields(profileData));
    await assertIsbnIsFree("ISBN13", text(clean.ISBN13), docId);
    await assertIsbnIsFree("ISBN10", text(clean.ISBN10), docId);

    const actorDisplay = actor.fullName || actor.publicUID;

    await docRef.set(
      {
        ...clean,
        ModifiedOn: serverTimestamp(),
        LastModifiedBy: actorDisplay || authUid || null,
      },
      { merge: true },
    );

    const collectionUID = text(
      (existing.data() as { UID?: string } | undefined)?.UID,
    );

    try {
      await writingLogsAttemptInternal({
        case: "collectionEdit",
        Action: "CatalogingEdit",
        UID: authUid || "",
        TargetUID: collectionUID || docId,
        TargetName: text(clean.CollectionTitle),
      });
    } catch (logError) {
      console.error("Failed to write collection edit log (non-fatal):", logError);
    }

    return {
      status: "updated",
      case: "editCollectionInformation",
      success: true,
      updatedFields: Object.keys(clean),
    };
  } catch (error) {
    console.error("Error in editCollectionInformation:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError(
      "internal",
      "Failed to update collection information",
    );
  }
};

export const collectionArchiveUnarchive = async (
  data: CollectionArchiveRequest,
  authUid: string | null,
): Promise<CollectionArchiveResult> => {
  const actor = await requireStaffActor(authUid ?? undefined, "CatalogingArchive");

  const targetUID = text(data?.targetUID).trim();
  const action = text(data?.action) as CollectionArchiveAction;

  if (!targetUID) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "targetUID is required",
    );
  }
  if (action !== "archive" && action !== "unarchive") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Valid action (archive|unarchive) is required",
    );
  }

  const snap = await db
    .collection("collections")
    .where("UID", "==", targetUID)
    .limit(1)
    .get();
  if (snap.empty) {
    throw new functions.https.HttpsError("not-found", "Collection not found");
  }

  const ref = snap.docs[0].ref;
  const desiredStatus = action === "archive" ? "Archived" : "Available";
  const targetCollection = text(
    (snap.docs[0].data() as { CollectionTitle?: string }).CollectionTitle,
  );

  const previousStatus = await db.runTransaction<string>(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Collection not found during transaction",
      );
    }

    const data = fresh.data() || {};
    const current = text(data.Status) || "Available";

    if (action === "archive") {
      assertNoCopiesOut(data.Copies);
    }

    if (current !== desiredStatus) {
      tx.update(ref, { Status: desiredStatus });
    }
    return current;
  });

  try {
    const actorUID = actor.publicUID || actor.authUid;
    const verb = action === "archive" ? "archived" : "unarchived";
    await writingLogsAttemptInternal({
      case: "collectionArchiveUnarchive",
      Action: "CatalogingArchive",
      ArchiveAction: action,
      UID: authUid || "",
      StaffUID: actor.publicUID,
      StaffName: actor.fullName,
      TargetUID: targetUID,
      TargetCollection: targetCollection,
      Description: `${targetUID} ${verb} by ${actorUID}`,
    });
  } catch (logError) {
    console.error(
      "Failed to write collection archive log (non-fatal):",
      logError,
    );
  }

  return {
    success: true,
    message:
      action === "archive"
        ? "Collection archived successfully"
        : "Collection unarchived successfully",
    collectionUID: targetUID,
    previousStatus,
    newStatus: desiredStatus,
  };
};

