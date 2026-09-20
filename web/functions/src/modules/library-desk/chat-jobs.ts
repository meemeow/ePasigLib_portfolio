import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp, db, serverTimestamp } from "../../core/firebase";
import { commitInChunks } from "../../core/batch";

const GUEST_IDLE_MS = 60 * 60 * 1000;

const OPEN: ("waiting" | "active")[] = ["waiting", "active"];

/**
 * Close guest conversations that have gone quiet. `StartedOn` is the fallback
 * for older chats written before `LastPatronActivityAt` existed.
 */
export const expireWaitingGuestChats = onSchedule(
  { schedule: "*/5 * * * *", timeZone: "Asia/Manila" },
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - GUEST_IDLE_MS);
    const openGuestChats = db
      .collection("chats")
      .where("Status", "in", OPEN)
      .where("IsGuest", "==", true);

    const [idle, legacy] = await Promise.all([
      openGuestChats.where("LastPatronActivityAt", "<", cutoff).get(),
      openGuestChats.where("StartedOn", "<", cutoff).get(),
    ]);

    const stale = new Map<string, FirebaseFirestore.DocumentReference>();
    for (const doc of idle.docs) stale.set(doc.id, doc.ref);
    for (const doc of legacy.docs) {
      if (doc.get("LastPatronActivityAt")) continue;
      stale.set(doc.id, doc.ref);
    }
    if (stale.size === 0) return;

    const expired = await commitInChunks([...stale.values()], (batch, ref) =>
      batch.update(ref, {
        Status: "closed",
        ClosedBy: "",
        ClosedByName: "Expired",
        ClosedByRole: "system",
        ClosedOn: serverTimestamp(),
      }),
    );

    console.log(
      `Expired ${expired} guest conversation(s) after ${
        GUEST_IDLE_MS / 60000
      } minutes without a word from the guest.`,
    );
  },
);
