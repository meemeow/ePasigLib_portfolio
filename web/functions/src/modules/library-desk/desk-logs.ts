import type { UpdatesActor } from "./desk-common";
import type { UpdateStatus } from "./crud-updates-types";
import { db, now, serverTimestamp } from "../../core/firebase";

const LOG_DOC = "updates";
const ENTRIES = "entries";
const COUNTER_DOC = "updates_log";
const ID_PREFIX = "UPDT_TRAIL_";

export type UpdateLogType = "Announcement" | "News" | "Reply";

export type UpdateLogAction =
  | "AnnouncementCreate"
  | "AnnouncementEdit"
  | "AnnouncementPublish"
  | "AnnouncementDelete"
  | "AnnouncementReplyCreate"
  | "AnnouncementReplyEdit"
  | "AnnouncementReplyDelete"
  | "NewsCreate"
  | "NewsEdit"
  | "NewsPublish"
  | "NewsDelete";

export interface UpdateLogParams {
  action: UpdateLogAction;
  type: UpdateLogType;
  targetUID: string;
  targetName: string;
  replyID?: string | null;
  fromStatus?: UpdateStatus | null;
  toStatus?: UpdateStatus | null;
  changedFields?: string[];
  actor: UpdatesActor;
  description?: string;
}

export interface UpdateLogEntry {
  Action: UpdateLogAction;
  Type: UpdateLogType;
  TargetUID: string;
  TargetName: string;
  ReplyID: string | null;
  FromStatus: UpdateStatus | null;
  ToStatus: UpdateStatus | null;
  ChangedFields: string[];
  UID: string;
  CreatedBy: string;
  CreatedOn: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  Description: string;
}

export function updateLogEntriesRef(
  db: FirebaseFirestore.Firestore,
): FirebaseFirestore.CollectionReference {
  return db.collection("lmslogs").doc(LOG_DOC).collection(ENTRIES);
}

export async function allocateUpdateLogId(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
): Promise<{ id: string; commit: () => void }> {
  const metaRef = db.collection("metadata").doc(COUNTER_DOC);
  const snap = await tx.get(metaRef);
  const next = snap.exists
    ? Number((snap.data() as Record<string, unknown>)?.nextUID) || 1
    : 1;
  return {
    id: `${ID_PREFIX}${String(next).padStart(7, "0")}`,
    commit: () => tx.set(metaRef, { nextUID: next + 1 }, { merge: true }),
  };
}

const VERB: Record<UpdateLogAction, string> = {
  AnnouncementCreate: "created the announcement",
  AnnouncementEdit: "edited the announcement",
  AnnouncementPublish: "published the announcement",
  AnnouncementDelete: "deleted the announcement",
  AnnouncementReplyCreate: "replied to",
  AnnouncementReplyEdit: "edited a reply on",
  AnnouncementReplyDelete: "deleted a reply on",
  NewsCreate: "created the news item",
  NewsEdit: "edited the news item",
  NewsPublish: "published the news item",
  NewsDelete: "deleted the news item",
};

export function describeUpdateLog(params: UpdateLogParams): string {
  if (params.description) return params.description;

  const who = params.actor.staffName || params.actor.staffUID;
  const what = params.targetName ? ` "${params.targetName}"` : "";
  const base = `${who} ${VERB[params.action]}${what}`;

  if (params.fromStatus && params.toStatus) {
    return `${base} (${params.fromStatus} to ${params.toStatus}).`;
  }
  if (params.toStatus) {
    return `${base} (${params.toStatus}).`;
  }
  if (params.changedFields && params.changedFields.length > 0) {
    return `${base} — ${params.changedFields.join(", ")}.`;
  }
  return `${base}.`;
}

export function buildUpdateLogEntry(
  params: UpdateLogParams,
  createdOn:
    | FirebaseFirestore.Timestamp
    | FirebaseFirestore.FieldValue = serverTimestamp(),
): UpdateLogEntry {
  return {
    Action: params.action,
    Type: params.type,
    TargetUID: params.targetUID,
    TargetName: params.targetName,
    ReplyID: params.replyID || null,
    FromStatus: params.fromStatus ?? null,
    ToStatus: params.toStatus ?? null,
    ChangedFields: params.changedFields ?? [],
    UID: params.actor.staffUID,
    CreatedBy: params.actor.staffName,
    CreatedOn: createdOn,
    Description: describeUpdateLog(params),
  };
}

export function writeUpdateLogEntry(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  logId: string,
  params: UpdateLogParams,
): void {
  tx.set(
    updateLogEntriesRef(db).doc(logId),
    buildUpdateLogEntry(params, now()),
  );
}

export async function logUpdateEntry(params: UpdateLogParams): Promise<void> {
  try {
    await db.runTransaction(async (tx) => {
      const { id, commit } = await allocateUpdateLogId(tx, db);
      commit();
      writeUpdateLogEntry(tx, db, id, params);
    });
  } catch (error) {
    console.warn(`Failed to write ${params.action} log entry`, error);
  }
}
