import { unreadIncrements } from "../notifications/notification-common";
import { now } from "../../core/firebase";

export interface PatronNotice {
  title: string;
  content: string;
  relatedUpdateId: string;
  type: "Announcement" | "AnnouncementReply" | "News";
  createdBy: string;
  uid: string;
  replyId?: string;
}

const CHUNK_SIZE = 200;

export async function fanOutNotificationToPatrons(
  db: FirebaseFirestore.Firestore,
  note: PatronNotice,
): Promise<void> {
  try {
    const snap = await db.collection("patrons").select().get();
    if (snap.empty) return;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const batch = db.batch();
      for (const doc of docs.slice(i, i + CHUNK_SIZE)) {
        const patronRef = db.collection("patrons").doc(doc.id);
        batch.set(patronRef.collection("notifications").doc(), {
          ...note,
          isUpdate: true,
          date: now(),
          read: false,
        });
        batch.set(patronRef, unreadIncrements(note.type, 1), { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    console.warn("Failed to fan out notification to patrons (non-fatal)", error);
  }
}

