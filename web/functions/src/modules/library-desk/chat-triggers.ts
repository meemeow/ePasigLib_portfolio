import { onDocumentCreated } from "firebase-functions/v2/firestore";
import type { ChatSenderRole } from "./crud-chat-types";
import { db, increment, serverTimestamp } from "../../core/firebase";

const PREVIEW_LIMIT = 140;

export const onChatMessageCreated = onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const message = snap.data() as Record<string, unknown>;
    const chatId = event.params.chatId as string;
    const messageId = event.params.messageId as string;

    const role: ChatSenderRole =
      message.SenderRole === "staff" ? "staff" : "patron";
    const text = String(message.Text ?? "");

    const ref = db.collection("chats").doc(chatId);

    await db.runTransaction(async (tx) => {
      const [chat, self] = await tx.getAll(ref, snap.ref);
      if (!chat.exists) return;

      if (self.exists && self.get("Folded") === true) return;
      tx.update(snap.ref, { Folded: true });

      const unreadField = role === "staff" ? "UnreadPatron" : "UnreadStaff";

      const activity =
        role === "patron"
          ? {
              LastPatronActivityAt:
                message.CreatedOn ??
                serverTimestamp(),
            }
          : {};

      tx.update(ref, {
        ...activity,
        LastMessageId: messageId,
        LastMessageAt: message.CreatedOn ?? serverTimestamp(),
        LastMessageText: text.slice(0, PREVIEW_LIMIT),
        LastMessageBy: role,
        MessageCount: increment(1),
        [unreadField]: increment(1),
      });
    });
  },
);
