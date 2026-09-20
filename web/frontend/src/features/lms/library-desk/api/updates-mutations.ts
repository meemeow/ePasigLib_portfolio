import { invalidateDeskCaches } from "@/features/lms/library-desk/library-desk-cache";
import { invalidateHomeCaches } from "@/features/lms/home/api/home-api";
import type {
  AnnouncementFormValues,
  CreateResult,
  MutationResult,
  NewsFormValues,
  ReplyFormValues,
} from "@/features/lms/library-desk/types/updates-types";
import { callAddRecord as addRecord, callArchiveRecord as archiveRecord, callEditRecord as editRecord } from "@/lib/api/callables";
import { friendlyMessageFor as messageFor, unwrap } from "@/lib/api/callable-result";




function invalidateAll(): void {
  invalidateDeskCaches();
  invalidateHomeCaches();
}

// ==========================================
// || ANNOUNCEMENTS                        ||
// ==========================================

export async function createAnnouncement(
  values: AnnouncementFormValues,
  publish: boolean,
): Promise<CreateResult> {
  try {
    const response = await addRecord({
      case: "addAnnouncement",
      Subject: values.Subject,
      Message: values.Message,
      Files: values.Files,
      Publish: publish,
    });
    const result = unwrap<CreateResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not save the announcement."));
  }
}

export async function updateAnnouncement(
  id: string,
  values: AnnouncementFormValues,
): Promise<MutationResult> {
  try {
    const response = await editRecord({
      case: "editAnnouncement",
      id,
      Subject: values.Subject,
      Message: values.Message,
      Files: values.Files,
    });
    const result = unwrap<MutationResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not update the announcement."));
  }
}

export async function publishAnnouncement(id: string): Promise<MutationResult> {
  try {
    const response = await editRecord({ case: "publishAnnouncement", id });
    const result = unwrap<MutationResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not publish the announcement."));
  }
}

export async function deleteAnnouncement(id: string): Promise<MutationResult> {
  try {
    const response = await archiveRecord({
      case: "deleteAnnouncement",
      id,
    });
    const result = unwrap<MutationResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(
      messageFor(error, "Could not delete the announcement."),
    );
  }
}

// ==========================================
// || REPLIES                              ||
// ==========================================

export async function createReply(
  parentId: string,
  values: ReplyFormValues,
): Promise<MutationResult> {
  try {
    const response = await addRecord({
      case: "addAnnouncementReply",
      ParentID: parentId,
      Subject: values.Subject,
      Message: values.Message,
      Files: values.Files,
    });
    const result = unwrap<MutationResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not post the reply."));
  }
}

export async function updateReply(
  parentId: string,
  replyId: string,
  values: ReplyFormValues,
): Promise<MutationResult> {
  try {
    const response = await editRecord({
      case: "editAnnouncementReply",
      ParentID: parentId,
      ReplyID: replyId,
      Subject: values.Subject,
      Message: values.Message,
      Files: values.Files,
    });
    const result = unwrap<MutationResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not update the reply."));
  }
}

export async function deleteReply(
  parentId: string,
  replyId: string,
): Promise<MutationResult> {
  try {
    const response = await archiveRecord({
      case: "deleteAnnouncementReply",
      ParentID: parentId,
      ReplyID: replyId,
    });
    const result = unwrap<MutationResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not delete the reply."));
  }
}

// ==========================================
// || NEWS                                 ||
// ==========================================

export async function createNews(
  values: NewsFormValues,
  publish: boolean,
): Promise<CreateResult> {
  try {
    const response = await addRecord({
      case: "addNews",
      ...values,
      Publish: publish,
    });
    const result = unwrap<CreateResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not save the news item."));
  }
}

export async function updateNews(
  id: string,
  values: NewsFormValues,
): Promise<MutationResult> {
  try {
    const response = await editRecord({ case: "editNews", id, ...values });
    const result = unwrap<MutationResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not update the news item."));
  }
}

export async function publishNews(id: string): Promise<MutationResult> {
  try {
    const response = await editRecord({ case: "publishNews", id });
    const result = unwrap<MutationResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not publish the news item."));
  }
}

export async function deleteNews(id: string): Promise<MutationResult> {
  try {
    const response = await archiveRecord({ case: "deleteNews", id });
    const result = unwrap<MutationResult>(response?.data);
    invalidateAll();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not delete the news item."));
  }
}
