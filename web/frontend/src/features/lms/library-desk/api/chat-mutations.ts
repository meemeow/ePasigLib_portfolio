import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { invalidateChatCaches } from "@/features/lms/library-desk/library-desk-cache";
import type {
  ChatMutationResult,
  ChatSenderRole,
  ChatStartResult,
  GuestInfo,
} from "@/features/lms/library-desk/types/chat-types";
import { callAddRecord as addRecord, callEditRecord as editRecord } from "@/lib/api/callables";
import { friendlyMessageFor as messageFor, unwrap } from "@/lib/api/callable-result";




export async function startChat(params: {
  Concern: string;
  Description: string;
  GuestInfo?: GuestInfo;
}): Promise<ChatStartResult> {
  try {
    const response = await addRecord({ case: "chatStart", ...params });
    const result = unwrap<ChatStartResult>(response?.data);
    invalidateChatCaches();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not start the chat."));
  }
}

export interface ChatSender {
  uid: string;
  name: string;
  role: ChatSenderRole;
}

export async function sendChatMessage(
  chatId: string,
  text: string,
  sender: ChatSender,
): Promise<void> {
  try {
    await addDoc(collection(db, "chats", chatId, "messages"), {
      SenderUID: sender.uid,
      SenderName: sender.name,
      SenderRole: sender.role,
      Text: text,
      CreatedOn: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(messageFor(error, "Could not send the message."));
  }
}

export async function takeChat(chatId: string): Promise<ChatMutationResult> {
  try {
    const response = await editRecord({ case: "chatTake", chatId });
    const result = unwrap<ChatMutationResult>(response?.data);
    invalidateChatCaches();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not take this chat."));
  }
}

export async function endChat(chatId: string): Promise<ChatMutationResult> {
  try {
    const response = await editRecord({ case: "chatEnd", chatId });
    const result = unwrap<ChatMutationResult>(response?.data);
    invalidateChatCaches();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not end this chat."));
  }
}

export async function rateChat(
  chatId: string,
  Rating: number,
  Comment: string,
): Promise<ChatMutationResult> {
  try {
    const response = await editRecord({
      case: "chatRate",
      chatId,
      Rating,
      Comment,
    });
    const result = unwrap<ChatMutationResult>(response?.data);
    invalidateChatCaches();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not save your rating."));
  }
}

export async function markChatRead(chatId: string): Promise<void> {
  try {
    await editRecord({ case: "chatMarkRead", chatId });
    invalidateChatCaches();
  } catch (error) {
    console.warn("Could not mark the chat read", error);
  }
}

