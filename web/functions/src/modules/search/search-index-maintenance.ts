import * as fs from "fs";
import * as path from "path";
import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, storage } from "../../core/firebase";
import { requireStaffActor } from "../../core/guards";
import { internal } from "../../core/errors";
import { rebuildSearchIndex } from "./search-index-writer";

const SEARCHABLES_PATH = "collections/Searchables.json";

/** Rebuild the `searches` collection, then mirror it to Storage as one file. */
export async function generateAndUploadSearchablesJSON() {
  const { written, removed, unchanged } = await rebuildSearchIndex();

  const snapshot = await db.collection("searches").get();
  const searchables = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const tmpFilePath = path.join("/tmp", "Searchables.json");
  fs.writeFileSync(tmpFilePath, JSON.stringify(searchables, null, 2));

  const bucket = storage.bucket();
  await bucket.upload(tmpFilePath, {
    destination: SEARCHABLES_PATH,
    metadata: {
      contentType: "application/json",
      cacheControl: "public, max-age=3600",
    },
  });

  const file = bucket.file(SEARCHABLES_PATH);
  await file.makePublic();
  const [metadata] = await file.getMetadata();
  const url = `https://storage.googleapis.com/${metadata.bucket}/${encodeURIComponent(SEARCHABLES_PATH)}`;

  console.log(
    `✅ Searchables generated: ${snapshot.size} entries in 'searches' ` +
      `(${written} written, ${unchanged} already correct, ${removed} stale removed) ` +
      `+ Storage backup`,
  );
  return { url, count: snapshot.size, written, unchanged, removed };
}

export const updateSearchablesJson = onCall(
  { timeoutSeconds: 540, memory: "1GiB" },
  async (req) => {
    await requireStaffActor(req.auth?.uid, []);
    try {
      const result = await generateAndUploadSearchablesJSON();
      return { success: true, ...result };
    } catch (error: any) {
      console.error("Error updating Searchables.json:", error);
      throw internal(error.message || "Failed to update Searchables.json");
    }
  },
);

export const refreshSearchIndexDaily = onSchedule(
  {
    schedule: "30 2 * * *",
    timeZone: "Asia/Manila",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async () => {
    const { drainPendingConstantsRewrites } = await import(
      "../collections/crud-collection-constants-record.js"
    );
    await drainPendingConstantsRewrites();

    try {
      const result = await generateAndUploadSearchablesJSON();
      console.log(
        `✅ Nightly search index refresh: ${result.count} entries ` +
          `(${result.written} repaired, ${result.removed} stale removed)`,
      );
    } catch (error) {
      console.error("Nightly search index refresh failed:", error);
    }
  },
);
