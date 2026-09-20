import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import {
  buildSearchText,
  normalizeStatus,
  requireString,
  requireUpdatesActor,
  sanitizeFiles,
  serverTimestamp,
} from "./desk-common";
import {
  allocateUpdateLogId,
  writeUpdateLogEntry,
} from "./desk-logs";
import { safeDeleteFiles, safeDeletePrefix } from "./desk-storage";
import { fanOutNotificationToPatrons } from "./desk-notifications";
import type {
  CreateResponse,
  MutationResponse,
  PublishResponse,
  UpdateFile,
  UpdateStatus,
} from "./crud-updates-types";
import { db } from "../../core/firebase";

const SUBJECT_LIMIT = 200;
const MESSAGE_LIMIT = 1000;

type Payload = Record<string, unknown>;

function assertLength(value: string, limit: number, label: string): void {
  if (value.length > limit) {
    throw new HttpsError(
      "invalid-argument",
      `${label} must be ${limit} characters or fewer.`,
    );
  }
}

export async function addAnnouncement(
  data: Payload,
  authUid: string | null,
): Promise<CreateResponse> {
  const actor = await requireUpdatesActor(authUid);

  const Subject = requireString(data, "Subject");
  const Message = requireString(data, "Message");
  assertLength(Subject, SUBJECT_LIMIT, "Subject");
  assertLength(Message, MESSAGE_LIMIT, "Message");
  const Files = sanitizeFiles(data.Files) ?? [];
  const publishNow = data.Publish === true;

  const ref = db.collection("updates").doc();

  await db.runTransaction(async (tx) => {
    const { id: logId, commit } = await allocateUpdateLogId(tx, db);
    commit();

    tx.set(ref, {
      Type: "Announcement",
      Status: publishNow ? "Published" : "Draft",
      Subject,
      Message,
      Files,
      Replies: [],
      SearchText: buildSearchText(Subject, Message, actor.staffName),
      CreatedOn: serverTimestamp(),
      AuthorName: actor.staffName,
      AuthorUID: actor.staffUID,
    });

    writeUpdateLogEntry(tx, db, logId, {
      action: "AnnouncementCreate",
      type: "Announcement",
      targetUID: ref.id,
      targetName: Subject,
      toStatus: publishNow ? "Published" : "Draft",
      actor,
    });
  });

  if (!publishNow) {
    return {
      success: true,
      id: ref.id,
      status: "Draft",
      message: "Announcement saved as a draft.",
    };
  }

  await announceToPatrons(db, {
    id: ref.id,
    Subject,
    Message,
    actor,
  });

  return {
    success: true,
    id: ref.id,
    status: "Published",
    message: "Announcement published.",
  };
}

export async function editAnnouncement(
  data: Payload,
  authUid: string | null,
): Promise<MutationResponse> {
  const actor = await requireUpdatesActor(authUid);

  const id = requireString(data, "id");
  const Subject = requireString(data, "Subject");
  const Message = requireString(data, "Message");
  assertLength(Subject, SUBJECT_LIMIT, "Subject");
  assertLength(Message, MESSAGE_LIMIT, "Message");
  const Files = sanitizeFiles(data.Files);

  const ref = db.collection("updates").doc(id);
  let removed: UpdateFile[] = [];
  let changed = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Announcement not found.");
    }
    const current = (snap.data() ?? {}) as Record<string, unknown>;
    if (String(current.Type ?? "") !== "Announcement") {
      throw new HttpsError(
        "failed-precondition",
        "That record is not an announcement.",
      );
    }

    const previousSubject = String(current.Subject ?? "");
    const previousMessage = String(current.Message ?? "");
    const previousFiles = (
      Array.isArray(current.Files) ? current.Files : []
    ) as UpdateFile[];

    const changedFields: string[] = [];
    if (previousSubject !== Subject) changedFields.push("Subject");
    if (previousMessage !== Message) changedFields.push("Message");
    if (
      Files !== undefined &&
      JSON.stringify(previousFiles.map((f) => f.URL).sort()) !==
        JSON.stringify(Files.map((f) => f.URL).sort())
    ) {
      changedFields.push("Files");
    }
    if (changedFields.length === 0) return;
    changed = true;

    const isDraft = normalizeStatus(current.Status) === "Draft";

    const allocation = isDraft ? null : await allocateUpdateLogId(tx, db);

    if (Files) {
      const kept = new Set(Files.map((file) => file.URL));
      removed = previousFiles.filter((file) => !kept.has(file.URL));
    }

    tx.set(
      ref,
      {
        Subject,
        Message,
        ...(Files ? { Files } : {}),
        SearchText: buildSearchText(
          Subject,
          Message,
          String(current.AuthorName ?? ""),
        ),
        ...(isDraft
          ? {}
          : { ModifiedBy: actor.staffName, ModifiedOn: serverTimestamp() }),
      },
      { merge: true },
    );

    if (allocation) {
      allocation.commit();
      writeUpdateLogEntry(tx, db, allocation.id, {
        action: "AnnouncementEdit",
        type: "Announcement",
        targetUID: id,
        targetName: Subject,
        changedFields,
        actor,
      });
    }
  });

  if (!changed) return { success: true, message: "No changes to save." };

  if (removed.length > 0) await safeDeleteFiles(removed);

  return { success: true, message: "Announcement updated." };
}

async function announceToPatrons(
  db: admin.firestore.Firestore,
  post: {
    id: string;
    Subject: string;
    Message: string;
    actor: { staffName: string; staffUID: string };
  },
): Promise<void> {
  await fanOutNotificationToPatrons(db, {
    title: post.Subject,
    content: post.Message,
    relatedUpdateId: post.id,
    type: "Announcement",
    createdBy: post.actor.staffName,
    uid: post.actor.staffUID,
  });
}

export async function publishAnnouncement(
  data: Payload,
  authUid: string | null,
): Promise<PublishResponse> {
  const actor = await requireUpdatesActor(authUid);
  const id = requireString(data, "id");
  const ref = db.collection("updates").doc(id);

  let Subject = "";
  let Message = "";
  let previousStatus: UpdateStatus = "Draft";

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
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
    previousStatus = normalizeStatus(doc.Status);
    if (previousStatus === "Published") {
      throw new HttpsError(
        "failed-precondition",
        "This announcement is already published.",
      );
    }
    Subject = String(doc.Subject ?? "");
    Message = String(doc.Message ?? "");

    const { id: logId, commit } = await allocateUpdateLogId(tx, db);
    commit();

    tx.update(ref, { Status: "Published" });

    writeUpdateLogEntry(tx, db, logId, {
      action: "AnnouncementPublish",
      type: "Announcement",
      targetUID: id,
      targetName: Subject,
      fromStatus: previousStatus,
      toStatus: "Published",
      actor,
    });
  });

  await announceToPatrons(db, { id, Subject, Message, actor });

  return {
    success: true,
    message: "Announcement published.",
    data: { id, previousStatus, newStatus: "Published" },
  };
}

export async function deleteAnnouncement(
  data: Payload,
  authUid: string | null,
): Promise<MutationResponse> {
  const actor = await requireUpdatesActor(authUid);
  const id = requireString(data, "id");

  const ref = db.collection("updates").doc(id);
  let Subject = "";
  let previousStatus: UpdateStatus = "Published";
  let replyCount = 0;
  let doomedFiles: UpdateFile[] = [];

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
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

    Subject = String(doc.Subject ?? "");
    previousStatus = normalizeStatus(doc.Status);

    const ownFiles = (
      Array.isArray(doc.Files) ? doc.Files : []
    ) as UpdateFile[];
    const replies = (
      Array.isArray(doc.Replies) ? doc.Replies : []
    ) as Array<Record<string, unknown>>;
    replyCount = replies.length;
    const replyFiles = replies.flatMap((reply) =>
      Array.isArray(reply.Files) ? (reply.Files as UpdateFile[]) : [],
    );
    doomedFiles = [...ownFiles, ...replyFiles];

    const { id: logId, commit } = await allocateUpdateLogId(tx, db);
    commit();

    tx.delete(ref);

    writeUpdateLogEntry(tx, db, logId, {
      action: "AnnouncementDelete",
      type: "Announcement",
      targetUID: id,
      targetName: Subject,
      fromStatus: previousStatus,
      actor,
      description:
        `${actor.staffName} permanently deleted the ` +
        `${previousStatus.toLowerCase()} announcement "${Subject}"` +
        `${replyCount > 0 ? `, with ${replyCount} ${replyCount === 1 ? "reply" : "replies"}` : ""}` +
        `${doomedFiles.length > 0 ? ` and ${doomedFiles.length} attachment${doomedFiles.length === 1 ? "" : "s"}` : ""}.`,
    });
  });

  await safeDeletePrefix(`updates/announcements/${id}`);
  if (doomedFiles.length > 0) await safeDeleteFiles(doomedFiles);

  return {
    success: true,
    message: "Announcement deleted.",
  };
}
