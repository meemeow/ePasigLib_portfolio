import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { writingLogsAttemptInternal } from "../lms/writes/writing-logs";
import { requireStaffActor } from "../../core/guards";
import {
  AddCopyRequest,
  ArchiveCopyRequest,
  CopyArchiveAction,
  CopyList,
  CopyMutationResult,
  EditCopyRequest,
  StoredCopy,
} from "./crud-collection-copies-types";
import { Timestamp, db } from "../../core/firebase";

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

function listFor(isOtherCopy: boolean | undefined): CopyList {
  return isOtherCopy ? "OtherCopies" : "Copies";
}

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

const CALL_NUMBER_PATTERN = /^(?=.*[A-Za-z0-9])[A-Za-z0-9./\-\s]+$/;

const ACCESSION_PATTERN = /^[A-Za-z0-9-]+$/;

function requireCollectionTarget(data: {
  collectionUID?: string;
  collectionTitle?: string;
}): { collectionUID: string; collectionTitle: string } {
  const collectionUID = text(data.collectionUID);
  const collectionTitle = text(data.collectionTitle);
  if (!collectionUID || !collectionTitle) {
    throw new HttpsError(
      "invalid-argument",
      "collectionUID and collectionTitle are required",
    );
  }
  return { collectionUID, collectionTitle };
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

interface CopyListSpec {
  key: "Accession" | "CallNumber";
  modifiedBy: "LastModifiedBy" | "ModifiedBy";
  read(data: AddCopyRequest): StoredCopy;
  createdExtras: StoredCopy;
  noun(record: StoredCopy): string;
  preflight?(
    fields: StoredCopy,
    self?: { docId: string; index: number },
  ): Promise<void>;
  clash(
    copies: StoredCopy[],
    fields: StoredCopy,
    selfIndex: number | null,
  ): string | null;
}

const LIST_SPEC: Record<CopyList, CopyListSpec> = {
  Copies: {
    key: "Accession",
    modifiedBy: "LastModifiedBy",
    createdExtras: { LastBorrowedBy: "", LastBorrowedDate: "" },

    read(data) {
      const Accession = text(data.accession);
      const LibraryLocation = text(data.libraryLocation);

      if (!Accession || !LibraryLocation) {
        throw new HttpsError(
          "invalid-argument",
          "Accession and library location are required",
        );
      }
      if (!ACCESSION_PATTERN.test(Accession)) {
        throw new HttpsError(
          "invalid-argument",
          "Accession must be alphanumeric (letters, digits and hyphens only)",
        );
      }

      return {
        Accession,
        LibraryLocation,
        Section: text(data.section),
        ForLibraryUse: Boolean(data.forLibraryUse),
      };
    },

    noun: (record) => `PKC copy ${text(record.Accession)}`,

    preflight: (fields, self) =>
      assertAccessionIsFree(text(fields.Accession), self),

    clash(copies, fields, selfIndex) {
      const wanted = text(fields.Accession);
      const taken = copies.some(
        (copy, index) =>
          index !== selfIndex && text(copy.Accession) === wanted,
      );
      return taken ? `Accession "${wanted}" already exists` : null;
    },
  },

  OtherCopies: {
    key: "CallNumber",
    modifiedBy: "ModifiedBy",
    createdExtras: {},

    read(data) {
      const CallNumber = text(data.callNumber);
      const LibraryLocation = text(data.libraryLocation);
      const CopiesAvailable = Number(data.copiesAvailable);

      if (!CallNumber || !LibraryLocation) {
        throw new HttpsError(
          "invalid-argument",
          "Call number and library location are required",
        );
      }
      if (!Number.isFinite(CopiesAvailable) || CopiesAvailable <= 0) {
        throw new HttpsError(
          "invalid-argument",
          "Copies available must be a positive number",
        );
      }
      if (!CALL_NUMBER_PATTERN.test(CallNumber)) {
        throw new HttpsError(
          "invalid-argument",
          "Call number may only contain letters, digits, dots, slashes, hyphens and spaces",
        );
      }

      return { CallNumber, LibraryLocation, CopiesAvailable };
    },

    noun: (record) =>
      `Other Library copy ${text(record.CallNumber)} at ${text(record.LibraryLocation)}`,

    clash(copies, fields, selfIndex) {
      const call = text(fields.CallNumber);
      const where = text(fields.LibraryLocation);
      const taken = copies.some(
        (copy, index) =>
          index !== selfIndex &&
          text(copy.CallNumber) === call &&
          text(copy.LibraryLocation) === where,
      );
      return taken
        ? `${where} is already recorded for this title under call number "${call}". Edit that row instead.`
        : null;
    },
  },
};

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

interface CopyActor {
  uid: string;
  name: string;
}

async function requireCopyActor(
  authUid: string | null,
  permission: string,
): Promise<CopyActor> {
  const actor = await requireStaffActor(authUid ?? undefined, permission);
  return {
    uid: actor.publicUID || actor.authUid,
    name: actor.fullName || actor.publicUID || actor.authUid,
  };
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

async function assertAccessionIsFree(
  accession: string,
  except?: { docId: string; index: number },
): Promise<void> {
  const wanted = text(accession);
  if (!wanted) return;

  const snap = await db
    .collection("collections")
    .select("Copies")
    .get();

  const clash = snap.docs.some((doc) => {
    const copies = (doc.data() as { Copies?: StoredCopy[] }).Copies;
    if (!Array.isArray(copies)) return false;
    return copies.some(
      (copy, index) =>
        text(copy?.Accession) === wanted &&
        !(except && doc.id === except.docId && index === except.index),
    );
  });

  if (clash) {
    throw new HttpsError(
      "already-exists",
      `Accession "${wanted}" already exists`,
    );
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

async function findCollectionRef(
  collectionUID: string,
): Promise<admin.firestore.DocumentReference> {
  const snap = await db
    .collection("collections")
    .where("UID", "==", collectionUID)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError("not-found", "Collection not found");
  }
  return snap.docs[0].ref;
}

async function reviseCopyList(
  collectionUID: string,
  list: CopyList,
  actor: CopyActor,
  revise: (
    copies: StoredCopy[],
    now: admin.firestore.Timestamp,
  ) => StoredCopy[],
): Promise<admin.firestore.Timestamp> {
  const ref = await findCollectionRef(collectionUID);

  return db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists) {
      throw new HttpsError("not-found", "Collection not found");
    }

    const stored = (fresh.data() || {}) as Record<string, unknown>;
    const current = Array.isArray(stored[list])
      ? ([...(stored[list] as StoredCopy[])] as StoredCopy[])
      : [];

    const now = Timestamp.now();

    tx.update(ref, {
      [list]: revise(current, now),
      ModifiedOn: now,
      LastModifiedBy: actor.name,
    });

    return now;
  });
}

function locateCopy(
  copies: StoredCopy[],
  index: unknown,
  expectedKey: string,
  list: CopyList,
): number {
  const position = Number(index);
  if (!Number.isInteger(position) || position < 0 || position >= copies.length) {
    throw new HttpsError(
      "not-found",
      "That copy no longer exists. Refresh the page and try again.",
    );
  }

  const actual = text(copies[position]?.[LIST_SPEC[list].key]);
  const expected = text(expectedKey);

  if (expected && actual !== expected) {
    throw new HttpsError(
      "aborted",
      "This copy changed while the page was open. Refresh and try again.",
    );
  }

  return position;
}

type CopyLogAction = "add" | "edit" | "archive" | "unarchive";

async function logCopyChange(params: {
  actor: CopyActor;
  action: CopyLogAction;
  collectionUID: string;
  collectionTitle: string;
  description: string;
  at: admin.firestore.Timestamp;
}): Promise<void> {
  const { actor, action, collectionUID, collectionTitle, description } = params;
  const at = params.at.toDate().toISOString();

  const base = {
    Description: description,
    TargetUID: collectionUID,
    TargetName: collectionTitle,
    TargetCollection: collectionTitle,
    StaffName: actor.name,
    UID: actor.uid,
  };

  try {
    if (action === "add") {
      await writingLogsAttemptInternal({
        ...base,
        case: "collectionAdd",
        Action: "CatalogingAdd",
        CreatedOn: at,
        CreatedBy: actor.name,
      });
      return;
    }

    if (action === "edit") {
      await writingLogsAttemptInternal({
        ...base,
        case: "collectionEdit",
        Action: "CatalogingEdit",
        ModifiedOn: at,
        ModifiedBy: actor.name,
      });
      return;
    }

    await writingLogsAttemptInternal({
      ...base,
      case: "collectionArchiveUnarchive",
      Action:
        action === "archive" ? "CatalogingArchive" : "CatalogingUnarchive",
      ArchiveAction: action,
    });
  } catch (error) {
    console.error("Failed to write copy log (non-fatal):", error);
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

export const addCollectionCopies = async (
  data: AddCopyRequest,
  authUid: string | null,
): Promise<CopyMutationResult> => {
  const { collectionUID, collectionTitle } = requireCollectionTarget(data);
  const list = listFor(data.isOtherCopy);
  const spec = LIST_SPEC[list];
  const actor = await requireCopyActor(authUid, "CatalogingAdd");

  const fields = spec.read(data);
  await spec.preflight?.(fields);

  const writtenAt = await reviseCopyList(
    collectionUID,
    list,
    actor,
    (copies, now) => {
      const refusal = spec.clash(copies, fields, null);
      if (refusal) throw new HttpsError("already-exists", refusal);

      return [
        ...copies,
        {
          ...fields,
          ...spec.createdExtras,
          CreatedBy: actor.name,
          CreatedOn: now,
          [spec.modifiedBy]: actor.name,
          ModifiedOn: now,
          Availability: "Available",
        },
      ];
    },
  );

  await logCopyChange({
    actor,
    collectionUID,
    collectionTitle,
    action: "add",
    description: `Added ${spec.noun(fields)} to ${collectionTitle}`,
    at: writtenAt,
  });

  return { success: true, message: "Copy added successfully" };
};

export const editCollectionCopies = async (
  data: EditCopyRequest,
  authUid: string | null,
): Promise<CopyMutationResult> => {
  const { collectionUID, collectionTitle } = requireCollectionTarget(data);
  const list = listFor(data.isOtherCopy);
  const spec = LIST_SPEC[list];
  const actor = await requireCopyActor(authUid, "CatalogingEdit");
  const expectedKey = text(data.expectedKey);

  const fields = spec.read(data);

  if (spec.preflight && text(fields[spec.key]) !== expectedKey) {
    const ref = await findCollectionRef(collectionUID);
    await spec.preflight(fields, {
      docId: ref.id,
      index: Number(data.copyIndex),
    });
  }

  const writtenAt = await reviseCopyList(
    collectionUID,
    list,
    actor,
    (copies, now) => {
      const at = locateCopy(copies, data.copyIndex, expectedKey, list);

      const refusal = spec.clash(copies, fields, at);
      if (refusal) throw new HttpsError("already-exists", refusal);

      copies[at] = {
        ...copies[at],
        ...fields,
        [spec.modifiedBy]: actor.name,
        ModifiedOn: now,
      };
      return copies;
    },
  );

  await logCopyChange({
    actor,
    collectionUID,
    collectionTitle,
    action: "edit",
    description: `Edited ${spec.noun(fields)} of ${collectionTitle}`,
    at: writtenAt,
  });

  return { success: true, message: "Copy updated successfully" };
};

export const archiveUnarchiveCollectionCopies = async (
  data: ArchiveCopyRequest,
  authUid: string | null,
): Promise<CopyMutationResult> => {
  const { collectionUID, collectionTitle } = requireCollectionTarget(data);
  const list = listFor(data.isOtherCopy);
  const spec = LIST_SPEC[list];
  const action = text(data.action) as CopyArchiveAction;

  if (action !== "archive" && action !== "unarchive") {
    throw new HttpsError(
      "invalid-argument",
      "Valid action (archive|unarchive) is required",
    );
  }

  const actor = await requireCopyActor(authUid, "CatalogingArchive");
  const expectedKey = text(data.expectedKey) || text(data.accession);
  const newStatus = action === "archive" ? "Archived" : "Available";

  let noun = "";

  const writtenAt = await reviseCopyList(
    collectionUID,
    list,
    actor,
    (copies, now) => {
      const at = locateCopy(copies, data.copyIndex, expectedKey, list);
      noun = spec.noun(copies[at]);

      if (action === "archive" && list === "Copies") {
        const state = text(copies[at]?.Availability);
        if (state === "Borrowed" || state === "Reserved" || state === "Pending") {
          throw new HttpsError(
            "failed-precondition",
            state === "Pending"
              ? "This copy is on a reservation awaiting a decision. Approve or " +
                "reject that request before archiving it."
              : `This copy is currently ${state.toLowerCase()}. ` +
                "Check it in before archiving it.",
          );
        }
      }

      copies[at] = {
        ...copies[at],
        Availability: newStatus,
        [spec.modifiedBy]: actor.name,
        ModifiedOn: now,
      };
      return copies;
    },
  );

  await logCopyChange({
    actor,
    collectionUID,
    collectionTitle,
    action,
    description: `${action === "archive" ? "Archived" : "Unarchived"} ${noun} of ${collectionTitle}`,
    at: writtenAt,
  });

  return {
    success: true,
    message: `Copy ${action === "archive" ? "archived" : "unarchived"} successfully`,
  };
};
