import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import {
  normalizeStatus,
  now,
  requireString,
  requireUpdatesActor,
  sanitizeFiles,
} from "./desk-common";
import { allocateUpdateLogId, writeUpdateLogEntry } from "./desk-logs";
import { safeDeleteFiles } from "./desk-storage";
import { fanOutNotificationToPatrons } from "./desk-notifications";
import type {
  AnnouncementReply,
  MutationResponse,
  ReplyCreateResponse,
  UpdateFile,
} from "./crud-updates-types";
import { db } from "../../core/firebase";

type Payload = Record<string, unknown>;

function replyKey(reply: Record<string, unknown>, index: number): string {
  const id = String(reply.ReplyID ?? "").trim();
  return id || `legacy-${index}`;
}

function readReplies(doc: Record<string, unknown>): Record<string, unknown>[] {
  const raw = Array.isArray(doc.Replies)
    ? doc.Replies
    : Array.isArray(doc.replies)
      ? doc.replies
      : [];
  return raw.map((entry) => (entry ?? {}) as Record<string, unknown>);
}

function indexOfReply(
  replies: Record<string, unknown>[],
  replyId: string,
): number {
  const index = replies.findIndex((reply, i) => replyKey(reply, i) === replyId);
  if (index < 0) {
    throw new HttpsError(
      "not-found",
      "That reply no longer exists. Refresh and try again.",
    );
  }
  return index;
}

export async function addAnnouncementReply(
  data: Payload,
  authUid: string | null,
): Promise<ReplyCreateResponse> {
  const actor = await requireUpdatesActor(authUid);

  const ParentID = requireString(data, "ParentID");
  const Subject = requireString(data, "Subject");
  const Message = requireString(data, "Message");
  const Files = sanitizeFiles(data.Files) ?? [];

  const parentRef = db.collection("updates").doc(ParentID);
  const ReplyID = db.collection("updates").doc().id;
  let parentPublished = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(parentRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Announcement not found.");
    }
    const doc = (snap.data() ?? {}) as Record<string, unknown>;
    if (String(doc.Type ?? "") !== "Announcement") {
      throw new HttpsError(
        "failed-precondition",
        "That record is not an announcement.",
      );
    }
    const status = normalizeStatus(doc.Status);
    if (status === "Archived") {
      throw new HttpsError(
        "failed-precondition",
        "Restore this announcement before replying to it.",
      );
    }
    parentPublished = status === "Published";

    const { id: logId, commit } = await allocateUpdateLogId(tx, db);
    commit();

    const reply: AnnouncementReply = {
      ReplyID,
      Subject,
      Message,
      Files,
      CreatedOn: now(),
      AuthorName: actor.staffName,
      AuthorUID: actor.staffUID,
    };

    tx.update(parentRef, {
      Replies: [...readReplies(doc), reply],
      replies: admin.firestore.FieldValue.delete(),
    });

    writeUpdateLogEntry(tx, db, logId, {
      action: "AnnouncementReplyCreate",
      type: "Reply",
      targetUID: ParentID,
      targetName: String(doc.Subject ?? ""),
      replyID: ReplyID,
      actor,
    });
  });

  if (parentPublished) {
    await fanOutNotificationToPatrons(db, {
      title: Subject,
      content: Message,
      relatedUpdateId: ParentID,
      replyId: ReplyID,
      type: "AnnouncementReply",
      createdBy: actor.staffName,
      uid: actor.staffUID,
    });
  }

  return { success: true, replyId: ReplyID, message: "Reply posted." };
}

export async function editAnnouncementReply(
  data: Payload,
  authUid: string | null,
): Promise<MutationResponse> {
  const actor = await requireUpdatesActor(authUid);

  const ParentID = requireString(data, "ParentID");
  const ReplyID = requireString(data, "ReplyID");
  const Subject = requireString(data, "Subject");
  const Message = requireString(data, "Message");
  const Files = sanitizeFiles(data.Files);

  const ref = db.collection("updates").doc(ParentID);
  let removedFiles: UpdateFile[] = [];
  let changed = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Announcement not found.");
    }
    const doc = (snap.data() ?? {}) as Record<string, unknown>;
    const replies = readReplies(doc);
    const index = indexOfReply(replies, ReplyID);
    const current = replies[index];

    const previousFiles = (
      Array.isArray(current.Files) ? current.Files : []
    ) as UpdateFile[];
    const subjectChanged = String(current.Subject ?? "") !== Subject;
    const messageChanged = String(current.Message ?? "") !== Message;
    const textChanged = subjectChanged || messageChanged;
    const filesChanged =
      Files !== undefined &&
      JSON.stringify(previousFiles.map((f) => f.URL).sort()) !==
        JSON.stringify(Files.map((f) => f.URL).sort());

    if (!textChanged && !filesChanged) return;
    changed = true;

    const { id: logId, commit } = await allocateUpdateLogId(tx, db);
    commit();

    if (Files) {
      const kept = new Set(Files.map((file) => file.URL));
      removedFiles = previousFiles.filter((file) => !kept.has(file.URL));
    }

    const next = [...replies];
    next[index] = {
      ...current,
      ReplyID: String(current.ReplyID ?? "") || db.collection("updates").doc().id,
      Subject,
      Message,
      ...(Files ? { Files } : {}),
      ModifiedBy: actor.staffName,
      ModifiedOn: now(),
    };

    tx.update(ref, {
      Replies: next,
      replies: admin.firestore.FieldValue.delete(),
    });

    const changedFields = [
      ...(subjectChanged ? ["Subject"] : []),
      ...(messageChanged ? ["Message"] : []),
      ...(filesChanged ? ["Files"] : []),
    ];
    writeUpdateLogEntry(tx, db, logId, {
      action: "AnnouncementReplyEdit",
      type: "Reply",
      targetUID: ParentID,
      targetName: String(doc.Subject ?? ""),
      replyID: String(next[index].ReplyID ?? ReplyID),
      changedFields,
      actor,
    });
  });

  if (!changed) return { success: true, message: "No changes to save." };

  if (removedFiles.length > 0) await safeDeleteFiles(removedFiles);

  return { success: true, message: "Reply updated." };
}

export async function deleteAnnouncementReply(
  data: Payload,
  authUid: string | null,
): Promise<MutationResponse> {
  const actor = await requireUpdatesActor(authUid);

  const ParentID = requireString(data, "ParentID");
  const ReplyID = requireString(data, "ReplyID");

  const ref = db.collection("updates").doc(ParentID);
  let parentSubject = "";
  let replySubject = "";
  let removedFiles: UpdateFile[] = [];

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Announcement not found.");
    }
    const doc = (snap.data() ?? {}) as Record<string, unknown>;
    parentSubject = String(doc.Subject ?? "");

    const replies = readReplies(doc);
    const index = indexOfReply(replies, ReplyID);
    const target = replies[index];
    replySubject = String(target.Subject ?? "");
    removedFiles = (
      Array.isArray(target.Files) ? target.Files : []
    ) as UpdateFile[];

    const { id: logId, commit } = await allocateUpdateLogId(tx, db);
    commit();

    const next = replies.filter((_, i) => i !== index);
    tx.update(ref, {
      Replies: next,
      replies: admin.firestore.FieldValue.delete(),
    });

    writeUpdateLogEntry(tx, db, logId, {
      action: "AnnouncementReplyDelete",
      type: "Reply",
      targetUID: ParentID,
      targetName: parentSubject,
      replyID: ReplyID,
      actor,
      description: `${actor.staffName} deleted the reply "${replySubject}" on "${parentSubject}".`,
    });
  });

  if (removedFiles.length > 0) await safeDeleteFiles(removedFiles);

  return { success: true, message: "Reply deleted." };
}
