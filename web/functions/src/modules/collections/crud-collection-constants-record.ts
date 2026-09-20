import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { writingLogsAttemptInternal } from "../lms/writes/writing-logs";
import { requireStaffActor } from "../../core/guards";
import {
  ConstantsBlocker,
  ConstantsRename,
  ConstantsRequest,
  ConstantsResult,
  CollectionCopyDoc,
  CollectionDoc,
  CopyArrayField,
  CopyProperty,
  PendingRewrite,
} from "./crud-collection-constants-types";
import { db } from "../../core/firebase";

const BATCH_LIMIT = 450;

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]", "g");

function normalize(value: unknown): string {
  return (
    text(value)
      .replace(CONTROL_CHARS, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

const MAX_NAME_LENGTH = 80;

const MAX_ITEMS_PER_REQUEST = 50;

function assertRequestSize(count: number, listTitle: string): void {
  if (count > MAX_ITEMS_PER_REQUEST) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `${count} changes to ${listTitle} in one request is past the limit of ` +
        `${MAX_ITEMS_PER_REQUEST}. Save them in smaller batches.`,
    );
  }
}

function assertNameLengths(values: string[], listTitle: string): void {
  const tooLong = values.find((value) => value.length > MAX_NAME_LENGTH);
  if (tooLong) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `A ${listTitle} entry may be at most ${MAX_NAME_LENGTH} characters. ` +
        `"${tooLong.slice(0, 40)}..." is ${tooLong.length}.`,
    );
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text) : [];
}

function copyList(value: unknown): CollectionCopyDoc[] {
  return Array.isArray(value) ? (value as CollectionCopyDoc[]) : [];
}

function parseItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalize).filter(Boolean);
}

function parseRenames(value: unknown): ConstantsRename[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const change = (entry || {}) as Partial<ConstantsRename>;
      return { from: normalize(change.from), to: normalize(change.to) };
    })
    .filter((change) => change.from && change.to);
}

class BatchWriter {
  private batch = db.batch();
  private pending = 0;

  async update(
    ref: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
  ): Promise<void> {
    this.batch.update(ref, data);
    this.pending += 1;
    if (this.pending >= BATCH_LIMIT) await this.flush();
  }

  async flush(): Promise<void> {
    if (this.pending === 0) return;
    await this.batch.commit();
    this.batch = db.batch();
    this.pending = 0;
  }
}

async function readListInTx(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  field: string,
): Promise<string[]> {
  const snap = await tx.get(ref);
  const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
  return stringList(data[field]);
}

// ===========================================================
// || Journal: catalogue rewrites still owed after a rename ||
// ===========================================================

const PENDING_REWRITES_DOC = "constants_pending_rewrites";

function pendingRef(): FirebaseFirestore.DocumentReference {
  return db.collection("metadata").doc(PENDING_REWRITES_DOC);
}

function newRewriteId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function journalRewrites(
  tx: FirebaseFirestore.Transaction,
  entries: PendingRewrite[],
): void {
  if (entries.length === 0) return;
  tx.set(
    pendingRef(),
    { entries: admin.firestore.FieldValue.arrayUnion(...entries) },
    { merge: true },
  );
}

async function dropRewrites(entries: PendingRewrite[]): Promise<void> {
  if (entries.length === 0) return;
  await pendingRef().set(
    { entries: admin.firestore.FieldValue.arrayRemove(...entries) },
    { merge: true },
  );
}

async function runPendingRewrites(): Promise<void> {
  const snap = await pendingRef().get();
  const entries = (
    snap.exists ? (snap.data() as { entries?: unknown })?.entries : []
  ) as PendingRewrite[] | undefined;
  if (!Array.isArray(entries) || entries.length === 0) return;

  const fieldEntries = entries.filter((entry) => entry.kind === "field");
  const copyGroups = new Map<string, PendingRewrite[]>();

  for (const entry of entries) {
    if (entry.kind !== "copies") continue;
    const key = `${(entry.arrays || []).join(",")}|${entry.property}`;
    copyGroups.set(key, [...(copyGroups.get(key) || []), entry]);
  }

  for (const entry of fieldEntries) {
    if (!entry.field) continue;
    try {
      await rewriteField(entry.field, entry.from, entry.to);
      await dropRewrites([entry]);
    } catch (error) {
      console.error("Pending field rewrite failed, left queued:", entry, error);
    }
  }

  for (const group of copyGroups.values()) {
    const { arrays, property } = group[0];
    if (!arrays || !property) continue;
    try {
      await rewriteInCopies(
        arrays,
        property,
        new Map(group.map((entry) => [dedupeKey(entry.from), entry.to])),
      );
      await dropRewrites(group);
    } catch (error) {
      console.error("Pending copy rewrite failed, left queued:", group, error);
    }
  }
}

export async function drainPendingConstantsRewrites(): Promise<void> {
  try {
    await runPendingRewrites();
  } catch (error) {
    console.error("Failed to drain pending constants rewrites:", error);
  }
}

function requireAction(value: unknown): "add" | "edit" | "remove" {
  const action = normalize(value).toLowerCase();
  if (action !== "add" && action !== "edit" && action !== "remove") {
    throw new functions.https.HttpsError("invalid-argument", "Invalid action");
  }
  return action;
}

function requireNonEmpty<T>(values: T[], message: string): T[] {
  if (values.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", message);
  }
  return values;
}

// ======================================================
// || Class Codes & Material Types — top-level fields  ||
// ======================================================

async function blockersOnField(
  field: "ClassCode" | "MaterialType",
  values: string[],
): Promise<ConstantsBlocker[]> {
  const collections = db.collection("collections");
  const blockers: ConstantsBlocker[] = [];

  for (const value of values) {
    const snap = await collections.where(field, "==", value).get();
    if (snap.empty) continue;
    blockers.push({
      value,
      blocking: snap.docs.map((doc) => {
        const record = doc.data() as CollectionDoc;
        return {
          id: doc.id,
          title: text(record.CollectionTitle),
          status: text(record.Status) || "Available",
        };
      }),
    });
  }

  return blockers;
}

async function rewriteField(
  field: "ClassCode" | "MaterialType",
  from: string,
  to: string,
): Promise<void> {
  const snap = await db
    .collection("collections")
    .where(field, "==", from)
    .get();

  const writer = new BatchWriter();
  for (const doc of snap.docs) {
    await writer.update(doc.ref, { [field]: to });
  }
  await writer.flush();
}

const CONSTANTS_PERMISSIONS = ["StaffAdd", "StaffEdit", "StaffArchive"];

const LOG_ACTION: Record<"add" | "edit" | "remove", string> = {
  add: "CatalogingAdd",
  edit: "CatalogingEdit",
  remove: "CatalogingArchive",
};

type ConstantsActor = Awaited<ReturnType<typeof requireStaffActor>>;

async function logConstantsChange(
  actor: ConstantsActor,
  action: "add" | "edit" | "remove",
  targetName: string,
): Promise<void> {
  try {
    const actorUID = actor.publicUID || actor.authUid;
    await writingLogsAttemptInternal({
      case: "collectionConfigure",
      Action: LOG_ACTION[action],
      UID: actor.authUid,
      StaffName: actor.fullName,
      TargetName: targetName,
      Description: `${targetName} has been configured by ${actorUID}`,
    });
  } catch (error) {
    console.error("Failed to write configure log (non-fatal):", error);
  }
}

export const PKC_LOCATION =
  "Pasig Knowledge Center (PKC)";

const PROTECTED_VALUES: Record<string, string[]> = {
  library_locations: [PKC_LOCATION],
};

function assertNotProtected(docId: string, values: string[]): void {
  const locked = PROTECTED_VALUES[docId];
  if (!locked || locked.length === 0) return;

  const hit = values.find((value) =>
    locked.some((entry) => entry.toLowerCase() === normalize(value).toLowerCase()),
  );
  if (hit) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `"${hit}" is the library's own location and cannot be renamed or removed. ` +
        "The catalogue identifies PKC copies by this name.",
    );
  }
}

function dedupeKey(value: unknown): string {
  return normalize(value).toLowerCase();
}

function assertPresent(
  currentList: string[],
  values: string[],
  listTitle: string,
): void {
  const known = new Set(currentList.map(dedupeKey));
  const missing = values.find((value) => !known.has(dedupeKey(value)));
  if (missing) {
    throw new functions.https.HttpsError(
      "not-found",
      `"${normalize(missing)}" is not in ${listTitle}. It may have been ` +
        "renamed or removed already — reopen the list to see the latest.",
    );
  }
}

function assertNoDuplicates(
  currentList: string[],
  incoming: string[],
  listTitle: string,
  freed: string[] = [],
): void {
  const freedKeys = new Set(freed.map(dedupeKey));
  const taken = new Set(
    currentList.map(dedupeKey).filter((key) => !freedKeys.has(key)),
  );

  for (const value of incoming) {
    const key = dedupeKey(value);
    if (!key) continue;
    if (taken.has(key)) {
      throw new functions.https.HttpsError(
        "already-exists",
        `"${normalize(value)}" is already in ${listTitle}. ` +
          "Names are matched ignoring capitalisation and surrounding spaces.",
      );
    }
    taken.add(key);
  }
}

const LIST_TITLE: Record<string, string> = {
  classCodes: "Class Codes",
  materialTypes: "Material Types",
  libraryLocations: "Library Locations",
  sections: "Sections",
};

export const editClassCodesAndMaterialTypes = async (
  data: ConstantsRequest,
  authUid: string | null,
): Promise<ConstantsResult> => {
  const actor = await requireStaffActor(
    authUid ?? undefined,
    CONSTANTS_PERMISSIONS,
  );
  await drainPendingConstantsRewrites();
  const action = requireAction(data?.action);
  const type = text(data?.type);
  if (type !== "classCodes" && type !== "materialTypes") {
    throw new functions.https.HttpsError("invalid-argument", "Invalid type");
  }

  const field: "ClassCode" | "MaterialType" =
    type === "classCodes" ? "ClassCode" : "MaterialType";
  const constantsRef = db
    .collection("constants")
    .doc("classcode_materialtypes");
  const title = LIST_TITLE[type];

  if (action === "add") {
    const items = requireNonEmpty(parseItems(data?.items), "No items to add");
    assertRequestSize(items.length, title);
    assertNameLengths(items, title);

    await db.runTransaction(async (tx) => {
      const currentList = await readListInTx(tx, constantsRef, type);
      assertNoDuplicates(currentList, items, title);
      tx.set(
        constantsRef,
        { [type]: Array.from(new Set([...currentList, ...items])) },
        { merge: true },
      );
    });
  }

  if (action === "edit") {
    const changes = requireNonEmpty(
      parseRenames(data?.changes),
      "No changes provided",
    );
    assertRequestSize(changes.length, title);
    assertNameLengths(
      changes.map((change) => change.to),
      title,
    );

    await db.runTransaction(async (tx) => {
      const currentList = await readListInTx(tx, constantsRef, type);
      assertPresent(
        currentList,
        changes.map((change) => change.from),
        title,
      );
      assertNoDuplicates(
        currentList,
        changes.map((change) => change.to),
        title,
        changes.map((change) => change.from),
      );

      let updated = currentList.slice();
      for (const change of changes) {
        updated = updated.map((value) =>
          dedupeKey(value) === dedupeKey(change.from) ? change.to : value,
        );
      }
      tx.set(constantsRef, { [type]: updated }, { merge: true });

      journalRewrites(
        tx,
        changes.map((change) => ({
          id: newRewriteId(),
          kind: "field" as const,
          field,
          from: change.from,
          to: change.to,
          startedOn: new Date().toISOString(),
        })),
      );
    });

    await runPendingRewrites();
  }

  if (action === "remove") {
    const toRemove = requireNonEmpty(
      parseItems(data?.remove),
      "No items to remove",
    );
    assertRequestSize(toRemove.length, title);

    const blocked = await blockersOnField(field, toRemove);
    if (blocked.length) {
      return {
        status: "blocked",
        case: "editClassCodesAndMaterialTypes",
        success: false,
        blocked,
      };
    }

    const removeKeys = new Set(toRemove.map(dedupeKey));
    await db.runTransaction(async (tx) => {
      const currentList = await readListInTx(tx, constantsRef, type);
      assertPresent(currentList, toRemove, title);
      tx.set(
        constantsRef,
        {
          [type]: currentList.filter(
            (value) => !removeKeys.has(dedupeKey(value)),
          ),
        },
        { merge: true },
      );

      journalRewrites(
        tx,
        toRemove.map((value) => ({
          id: newRewriteId(),
          kind: "field" as const,
          field,
          from: value,
          to: "",
          startedOn: new Date().toISOString(),
        })),
      );
    });

    await runPendingRewrites();
  }

  await logConstantsChange(actor, action, LIST_TITLE[type]);

  return {
    status: "updated",
    case: "editClassCodesAndMaterialTypes",
    success: true,
  };
};

// ======================================================
// || Library Locations & Sections — nested in arrays  ||
// ======================================================

async function blockersInCopies(
  arrays: CopyArrayField[],
  property: CopyProperty,
  values: string[],
): Promise<ConstantsBlocker[]> {
  const snap = await db.collection("collections").get();
  const blockers = new Map<string, ConstantsBlocker>();
  const wanted = new Map(values.map((value) => [dedupeKey(value), value]));

  for (const doc of snap.docs) {
    const record = doc.data() as CollectionDoc;
    const used = new Set<string>();
    for (const arrayField of arrays) {
      for (const copy of copyList(record[arrayField])) {
        const match = wanted.get(dedupeKey(copy[property]));
        if (match) used.add(match);
      }
    }

    for (const value of used) {
      const blocker = blockers.get(value) || { value, blocking: [] };
      blocker.blocking.push({
        id: doc.id,
        title: text(record.CollectionTitle),
        status: text(record.Status) || "Available",
      });
      blockers.set(value, blocker);
    }
  }

  return Array.from(blockers.values());
}

async function rewriteInCopies(
  arrays: CopyArrayField[],
  property: CopyProperty,
  renames: Map<string, string>,
): Promise<void> {
  if (renames.size === 0) return;

  const snap = await db.collection("collections").get();
  const writer = new BatchWriter();

  for (const doc of snap.docs) {
    const record = doc.data() as CollectionDoc;
    const update: Record<string, unknown> = {};
    let changed = false;

    for (const arrayField of arrays) {
      const copies = copyList(record[arrayField]);
      if (copies.length === 0) continue;

      let arrayChanged = false;
      const next = copies.map((copy) => {
        const target = renames.get(dedupeKey(copy[property]));
        if (target === undefined) return copy;
        arrayChanged = true;
        return { ...copy, [property]: target };
      });

      if (arrayChanged) {
        update[arrayField] = next;
        changed = true;
      }
    }

    if (changed) await writer.update(doc.ref, update);
  }

  await writer.flush();
}

async function editCopyConstants(
  caseName: string,
  docId: string,
  listField: string,
  arrays: CopyArrayField[],
  property: CopyProperty,
  data: ConstantsRequest,
  actor: ConstantsActor,
): Promise<ConstantsResult> {
  await drainPendingConstantsRewrites();
  const action = requireAction(data?.action);
  const constantsRef = db.collection("constants").doc(docId);
  const title = LIST_TITLE[listField];

  if (action === "add") {
    const items = requireNonEmpty(parseItems(data?.items), "No items to add");
    assertRequestSize(items.length, title);
    assertNameLengths(items, title);

    await db.runTransaction(async (tx) => {
      const currentList = await readListInTx(tx, constantsRef, listField);
      assertNoDuplicates(currentList, items, title);
      tx.set(
        constantsRef,
        { [listField]: Array.from(new Set([...currentList, ...items])) },
        { merge: true },
      );
    });
  }

  if (action === "edit") {
    const changes = requireNonEmpty(
      parseRenames(data?.changes),
      "No changes provided",
    );
    assertRequestSize(changes.length, title);
    assertNameLengths(
      changes.map((change) => change.to),
      title,
    );
    assertNotProtected(
      docId,
      changes.map((change) => change.from),
    );

    const renames = new Map(
      changes.map((change) => [dedupeKey(change.from), change.to]),
    );
    await db.runTransaction(async (tx) => {
      const currentList = await readListInTx(tx, constantsRef, listField);
      assertPresent(
        currentList,
        changes.map((change) => change.from),
        title,
      );
      assertNoDuplicates(
        currentList,
        changes.map((change) => change.to),
        title,
        changes.map((change) => change.from),
      );

      tx.set(
        constantsRef,
        {
          [listField]: currentList.map((value) => {
            const target = renames.get(dedupeKey(value));
            return target === undefined ? value : target;
          }),
        },
        { merge: true },
      );

      journalRewrites(
        tx,
        changes.map((change) => ({
          id: newRewriteId(),
          kind: "copies" as const,
          arrays,
          property,
          from: change.from,
          to: change.to,
          startedOn: new Date().toISOString(),
        })),
      );
    });

    await runPendingRewrites();
  }

  if (action === "remove") {
    const toRemove = requireNonEmpty(
      parseItems(data?.remove),
      "No items to remove",
    );
    assertRequestSize(toRemove.length, title);
    assertNotProtected(docId, toRemove);

    const blocked = await blockersInCopies(arrays, property, toRemove);
    if (blocked.length) {
      return { status: "blocked", case: caseName, success: false, blocked };
    }

    const removeKeys = new Set(toRemove.map(dedupeKey));
    await db.runTransaction(async (tx) => {
      const currentList = await readListInTx(tx, constantsRef, listField);
      assertPresent(currentList, toRemove, title);
      tx.set(
        constantsRef,
        {
          [listField]: currentList.filter(
            (value) => !removeKeys.has(dedupeKey(value)),
          ),
        },
        { merge: true },
      );

      journalRewrites(
        tx,
        toRemove.map((value) => ({
          id: newRewriteId(),
          kind: "copies" as const,
          arrays,
          property,
          from: value,
          to: "",
          startedOn: new Date().toISOString(),
        })),
      );
    });

    await runPendingRewrites();
  }

  await logConstantsChange(actor, action, LIST_TITLE[listField]);

  return { status: "updated", case: caseName, success: true };
}

export const editLibraryLocations = async (
  data: ConstantsRequest,
  authUid: string | null,
): Promise<ConstantsResult> => {
  const actor = await requireStaffActor(
    authUid ?? undefined,
    CONSTANTS_PERMISSIONS,
  );
  return editCopyConstants(
    "editLibraryLocations",
    "library_locations",
    "libraryLocations",
    ["Copies", "OtherCopies"],
    "LibraryLocation",
    data,
    actor,
  );
};

export const editSections = async (
  data: ConstantsRequest,
  authUid: string | null,
): Promise<ConstantsResult> => {
  const actor = await requireStaffActor(
    authUid ?? undefined,
    CONSTANTS_PERMISSIONS,
  );
  return editCopyConstants(
    "editSections",
    "sections",
    "sections",
    ["Copies"],
    "Section",
    data,
    actor,
  );
};
