import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { auth, db } from "../../core/firebase";


export const CLEANUP_DOC = "auth_cleanup";

const DEFAULT_RETENTION_DAYS = 30;

const MAX_DELETIONS_PER_RUN = 5000;

const DELETE_CHUNK = 1000;

const LIST_PAGE = 1000;

interface CleanupConfig {
  RetentionDays: number;
  Enabled: boolean;
}

async function loadConfig(): Promise<CleanupConfig> {
  try {
    const snap = await db.collection("metadata").doc(CLEANUP_DOC).get();
    const raw = (snap.data() || {}) as Record<string, unknown>;

    const days = Number(raw.RetentionDays);
    return {
      RetentionDays:
        Number.isFinite(days) && days >= 1 ? Math.floor(days) : DEFAULT_RETENTION_DAYS,
      Enabled: raw.Enabled !== false,
    };
  } catch (error) {
    console.error("auth_cleanup config unreadable, using defaults:", error);
    return { RetentionDays: DEFAULT_RETENTION_DAYS, Enabled: true };
  }
}

function isAnonymous(user: admin.auth.UserRecord): boolean {
  return (
    (user.providerData?.length ?? 0) === 0 &&
    !user.email &&
    !user.phoneNumber &&
    !user.customClaims
  );
}

function lastSeen(user: admin.auth.UserRecord): number {
  const meta = user.metadata;
  const stamp =
    meta.lastRefreshTime || meta.lastSignInTime || meta.creationTime || "";
  const parsed = Date.parse(stamp);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

async function protectedUids(): Promise<Set<string>> {
  const open = new Set<string>();
  try {
    const chats = await db
      .collection("chats")
      .where("Status", "in", ["waiting", "active"])
      .select("Participants")
      .get();

    for (const chat of chats.docs) {
      const participants = chat.get("Participants");
      if (Array.isArray(participants)) {
        for (const uid of participants) open.add(String(uid));
      }
    }
  } catch (error) {
    console.error("Could not read open chats; skipping this sweep:", error);
    throw error;
  }
  return open;
}

export const purgeStaleAnonymousUsers = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Asia/Manila", timeoutSeconds: 540 },
  async () => {
    const config = await loadConfig();
    if (!config.Enabled) {
      console.log("Anonymous cleanup is disabled in metadata/auth_cleanup.");
      return;
    }

    const cutoff = Date.now() - config.RetentionDays * 24 * 60 * 60 * 1000;
    const keep = await protectedUids();

    const doomed: string[] = [];
    let scanned = 0;
    let anonymous = 0;
    let inOpenChat = 0;
    let capped = false;
    let pageToken: string | undefined;

    do {
      const page = await auth.listUsers(LIST_PAGE, pageToken);
      for (const user of page.users) {
        scanned++;
        if (!isAnonymous(user)) continue;
        anonymous++;
        if (lastSeen(user) >= cutoff) continue;
        if (keep.has(user.uid)) {
          inOpenChat++;
          continue;
        }
        doomed.push(user.uid);
      }
      pageToken = page.pageToken;

      if (doomed.length >= MAX_DELETIONS_PER_RUN) {
        capped = true;
        break;
      }
    } while (pageToken);

    if (doomed.length === 0) {
      console.log(
        `Anonymous cleanup: nothing to remove. ${anonymous} anonymous of ` +
          `${scanned} accounts, retention ${config.RetentionDays}d.`,
      );
      return;
    }

    let deleted = 0;
    let failed = 0;

    for (let i = 0; i < doomed.length; i += DELETE_CHUNK) {
      const chunk = doomed.slice(i, i + DELETE_CHUNK);
      const result = await auth.deleteUsers(chunk);
      deleted += result.successCount;
      failed += result.failureCount;
      for (const error of result.errors) {
        console.warn(
          `Failed to delete ${chunk[error.index]}: ${error.error.message}`,
        );
      }
    }

    console.log(
      `Anonymous cleanup: deleted ${deleted}, failed ${failed}. ` +
        `${anonymous} anonymous of ${scanned} accounts, ` +
        `${inOpenChat} kept for an open chat, retention ${config.RetentionDays}d.` +
        (capped ? ` Capped at ${MAX_DELETIONS_PER_RUN}; the rest go tomorrow.` : ""),
    );
  },
);
