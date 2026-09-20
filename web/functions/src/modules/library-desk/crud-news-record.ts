import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import {
  buildSearchText,
  normalizeStatus,
  optionalString,
  requireString,
  requireUpdatesActor,
  serverTimestamp,
} from "./desk-common";
import { allocateUpdateLogId, writeUpdateLogEntry } from "./desk-logs";
import {
  FALLBACK_NEWS_IMAGE,
  isFallbackImage,
  safeDeleteObject,
  safeDeletePrefix,
  storagePathFromDownloadURL,
} from "./desk-storage";
import { fanOutNotificationToPatrons } from "./desk-notifications";
import type {
  CreateResponse,
  MutationResponse,
  PublishResponse,
  UpdateStatus,
} from "./crud-updates-types";
import { db } from "../../core/firebase";

const TITLE_LIMIT = 100;
const DESCRIPTION_LIMIT = 3000;
const MAX_TAGS = 10;

type Payload = Record<string, unknown>;

function assertLength(value: string, limit: number, label: string): void {
  if (value.length > limit) {
    throw new HttpsError(
      "invalid-argument",
      `${label} must be ${limit} characters or fewer.`,
    );
  }
}

function sanitizeTags(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const entry of value) {
    const tag = String(entry ?? "").trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags;
}

export async function addNews(
  data: Payload,
  authUid: string | null,
): Promise<CreateResponse> {
  const actor = await requireUpdatesActor(authUid);

  const Title = requireString(data, "Title");
  const Description = requireString(data, "Description");
  assertLength(Title, TITLE_LIMIT, "Title");
  assertLength(Description, DESCRIPTION_LIMIT, "Description");

  const Tags = sanitizeTags(data.Tags) ?? [];
  const ImageURL = optionalString(data, "ImageURL") || FALLBACK_NEWS_IMAGE;
  const URL = optionalString(data, "URL");
  const MainAuthor = optionalString(data, "MainAuthor");
  const Location = optionalString(data, "Location");
  const publishNow = data.Publish === true;

  const ref = db.collection("updates").doc();

  await db.runTransaction(async (tx) => {
    const { id: logId, commit } = await allocateUpdateLogId(tx, db);
    commit();

    tx.set(ref, {
      Type: "News",
      Status: publishNow ? "Published" : "Draft",
      Title,
      Description,
      Tags,
      ImageURL,
      URL,
      MainAuthor,
      Location,
      ViewCount: 0,
      SearchText: buildSearchText(Title, Description, Tags, MainAuthor),
      CreatedOn: serverTimestamp(),
      AuthorName: actor.staffName,
      AuthorUID: actor.staffUID,
    });

    writeUpdateLogEntry(tx, db, logId, {
      action: "NewsCreate",
      type: "News",
      targetUID: ref.id,
      targetName: Title,
      toStatus: publishNow ? "Published" : "Draft",
      actor,
    });
  });

  if (!publishNow) {
    return {
      success: true,
      id: ref.id,
      status: "Draft",
      message: "News saved as a draft.",
    };
  }

  await announceToPatrons(db, { id: ref.id, Title, Description, actor });
  return {
    success: true,
    id: ref.id,
    status: "Published",
    message: "News published.",
  };
}

export async function editNews(
  data: Payload,
  authUid: string | null,
): Promise<MutationResponse> {
  const actor = await requireUpdatesActor(authUid);

  const id = requireString(data, "id");
  const Title = requireString(data, "Title");
  const Description = requireString(data, "Description");
  assertLength(Title, TITLE_LIMIT, "Title");
  assertLength(Description, DESCRIPTION_LIMIT, "Description");

  const Tags = sanitizeTags(data.Tags);
  const hasImage = data.ImageURL !== undefined;
  const ImageURL = hasImage
    ? optionalString(data, "ImageURL") || FALLBACK_NEWS_IMAGE
    : "";

  const ref = db.collection("updates").doc(id);
  let previousImage = "";
  let changed = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "News item not found.");
    const current = (snap.data() ?? {}) as Record<string, unknown>;
    if (String(current.Type ?? "") !== "News") {
      throw new HttpsError(
        "failed-precondition",
        "That record is not a news item.",
      );
    }

    previousImage = String(current.ImageURL ?? "");
    const currentTags = Array.isArray(current.Tags)
      ? (current.Tags as string[]).map(String)
      : [];

    const update: Record<string, unknown> = {};
    const changedFields: string[] = [];

    if (String(current.Title ?? "") !== Title) {
      update.Title = Title;
      changedFields.push("Title");
    }
    if (String(current.Description ?? "") !== Description) {
      update.Description = Description;
      changedFields.push("Description");
    }
    if (Tags !== undefined && JSON.stringify(Tags) !== JSON.stringify(currentTags)) {
      update.Tags = Tags;
      changedFields.push("Tags");
    }
    if (hasImage && previousImage !== ImageURL) {
      update.ImageURL = ImageURL;
      changedFields.push("ImageURL");
    }
    for (const field of ["URL", "MainAuthor", "Location"] as const) {
      if (data[field] === undefined) continue;
      const next = optionalString(data, field);
      if (String(current[field] ?? "") === next) continue;
      update[field] = next;
      changedFields.push(field);
    }

    if (changedFields.length === 0) return;
    changed = true;

    update.SearchText = buildSearchText(
      Title,
      Description,
      Tags ?? currentTags,
      String(update.MainAuthor ?? current.MainAuthor ?? ""),
    );

    const isDraft = normalizeStatus(current.Status) === "Draft";
    const allocation = isDraft ? null : await allocateUpdateLogId(tx, db);

    if (!isDraft) {
      update.ModifiedBy = actor.staffName;
      update.ModifiedOn = serverTimestamp();
    }

    tx.set(ref, update, { merge: true });

    if (allocation) {
      allocation.commit();
      writeUpdateLogEntry(tx, db, allocation.id, {
        action: "NewsEdit",
        type: "News",
        targetUID: id,
        targetName: Title,
        changedFields,
        actor,
      });
    }
  });

  if (!changed) return { success: true, message: "No changes to save." };

  if (hasImage && previousImage && previousImage !== ImageURL) {
    await safeDeleteObject(storagePathFromDownloadURL(previousImage));
  }

  return { success: true, message: "News updated." };
}

async function announceToPatrons(
  db: admin.firestore.Firestore,
  post: {
    id: string;
    Title: string;
    Description: string;
    actor: { staffName: string; staffUID: string };
  },
): Promise<void> {
  await fanOutNotificationToPatrons(db, {
    title: post.Title,
    content: post.Description,
    relatedUpdateId: post.id,
    type: "News",
    createdBy: post.actor.staffName,
    uid: post.actor.staffUID,
  });
}

export async function publishNews(
  data: Payload,
  authUid: string | null,
): Promise<PublishResponse> {
  const actor = await requireUpdatesActor(authUid);
  const id = requireString(data, "id");
  const ref = db.collection("updates").doc(id);

  let Title = "";
  let Description = "";
  let previousStatus: UpdateStatus = "Draft";

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "News item not found.");
    const doc = (snap.data() ?? {}) as Record<string, unknown>;
    if (String(doc.Type ?? "") !== "News") {
      throw new HttpsError(
        "failed-precondition",
        "That record is not a news item.",
      );
    }
    previousStatus = normalizeStatus(doc.Status);
    if (previousStatus === "Published") {
      throw new HttpsError(
        "failed-precondition",
        "This news item is already published.",
      );
    }
    Title = String(doc.Title ?? "");
    Description = String(doc.Description ?? "");

    const { id: logId, commit } = await allocateUpdateLogId(tx, db);
    commit();

    tx.update(ref, { Status: "Published" });

    writeUpdateLogEntry(tx, db, logId, {
      action: "NewsPublish",
      type: "News",
      targetUID: id,
      targetName: Title,
      fromStatus: previousStatus,
      toStatus: "Published",
      actor,
    });
  });

  await announceToPatrons(db, { id, Title, Description, actor });

  return {
    success: true,
    message: "News published.",
    data: { id, previousStatus, newStatus: "Published" },
  };
}

export async function deleteNews(
  data: Payload,
  authUid: string | null,
): Promise<MutationResponse> {
  const actor = await requireUpdatesActor(authUid);
  const id = requireString(data, "id");

  const ref = db.collection("updates").doc(id);
  let Title = "";
  let coverURL = "";
  let previousStatus: UpdateStatus = "Published";

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "News item not found.");
    const doc = (snap.data() ?? {}) as Record<string, unknown>;
    if (String(doc.Type ?? "") !== "News") {
      throw new HttpsError(
        "failed-precondition",
        "That record is not a news item.",
      );
    }

    Title = String(doc.Title ?? "");
    coverURL = String(doc.ImageURL ?? "");
    previousStatus = normalizeStatus(doc.Status);

    const { id: logId, commit } = await allocateUpdateLogId(tx, db);
    commit();

    tx.delete(ref);

    const ownCover = !!coverURL && !isFallbackImage(coverURL);
    writeUpdateLogEntry(tx, db, logId, {
      action: "NewsDelete",
      type: "News",
      targetUID: id,
      targetName: Title,
      fromStatus: previousStatus,
      actor,
      description:
        `${actor.staffName} permanently deleted the ` +
        `${previousStatus.toLowerCase()} news item "${Title}"` +
        `${ownCover ? " and its cover image" : ""}.`,
    });
  });

  await safeDeletePrefix(`updates/news/${id}`);
  await safeDeleteObject(storagePathFromDownloadURL(coverURL));

  return { success: true, message: "News deleted." };
}

export async function incrementNewsViewCount(
  data: Payload,
): Promise<MutationResponse> {
  const id = requireString(data, "id");
  const ref = db.collection("updates").doc(id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "News item not found.");
    const doc = (snap.data() ?? {}) as Record<string, unknown>;
    if (normalizeStatus(doc.Status) !== "Published") return;
    const current = Number(doc.ViewCount ?? 0);
    tx.update(ref, {
      ViewCount: (Number.isFinite(current) ? current : 0) + 1,
    });
  });

  return { success: true, message: "View counted." };
}
