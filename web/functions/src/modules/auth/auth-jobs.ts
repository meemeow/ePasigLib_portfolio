import { onSchedule } from "firebase-functions/v2/scheduler";
import { auth, db, storage } from "../../core/firebase";
import { deleteRefs } from "../../core/batch";

const TIME_ZONE = "Asia/Manila";

/** Hourly: drop reset codes nobody redeemed before they expired. */
export const cleanupPasswordResets = onSchedule(
  { schedule: "0 * * * *", timeZone: TIME_ZONE },
  async () => {
    const snapshot = await db
      .collection("password_resets")
      .where("expiresAt", "<", Date.now())
      .get();

    await deleteRefs(snapshot.docs.map((doc) => doc.ref));
  },
);

/**
 * Every five minutes: clear expired email verifications, along with the two
 * things each one leaves behind — the temporary ID upload, and the disabled
 * auth user that was never confirmed.
 */
export const cleanupEmailVerifications = onSchedule(
  { schedule: "*/5 * * * *", timeZone: TIME_ZONE },
  async () => {
    const snapshot = await db
      .collection("email_verifications")
      .where("expiresAt", "<=", Date.now())
      .get();

    if (snapshot.empty) return;

    const bucket = storage.bucket();
    const deletions: Promise<unknown>[] = [];

    for (const doc of snapshot.docs) {
      const tempPath = `ids_temp/${doc.id}.webp`;
      deletions.push(
        bucket
          .file(tempPath)
          .delete()
          .catch((err: any) => {
            if (err && err.code !== 404) {
              console.error(`Failed to delete temp ID file ${tempPath}:`, err);
            }
          }),
      );

      const authUid = (doc.data() as { authUid?: string })?.authUid;
      if (!authUid) continue;

      deletions.push(
        auth
          .getUser(authUid)
          .then((user) =>
            user.disabled && !user.emailVerified
              ? auth.deleteUser(authUid)
              : undefined,
          )
          .catch((err: any) => {
            if (err && err.code !== "auth/user-not-found") {
              console.error(
                `Failed to delete orphaned auth user ${authUid}:`,
                err,
              );
            }
          }),
      );
    }

    await Promise.all(deletions);
    await deleteRefs(snapshot.docs.map((doc) => doc.ref));
  },
);

const LOGIN_ATTEMPT_RETENTION_DAYS = 90;
const LOGIN_ATTEMPT_PURGE_LIMIT = 5000;

/** Nightly: trim the login-attempt trail back to the retention window. */
export const purgeOldLoginAttempts = onSchedule(
  { schedule: "15 3 * * *", timeZone: TIME_ZONE, timeoutSeconds: 540 },
  async () => {
    const cutoff = new Date(
      Date.now() - LOGIN_ATTEMPT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const stale = await db
      .collection("lmslogs")
      .doc("login_attempts")
      .collection("entries")
      .where("timestamp", "<", cutoff)
      .limit(LOGIN_ATTEMPT_PURGE_LIMIT)
      .get();

    if (stale.empty) {
      console.log("Login attempts: nothing older than the retention window.");
      return;
    }

    await deleteRefs(stale.docs.map((doc) => doc.ref));

    console.log(
      `Login attempts: deleted ${stale.size} record(s) older than ` +
        `${LOGIN_ATTEMPT_RETENTION_DAYS} days` +
        (stale.size === LOGIN_ATTEMPT_PURGE_LIMIT
          ? "; capped for this run, the rest go tomorrow."
          : "."),
    );
  },
);
