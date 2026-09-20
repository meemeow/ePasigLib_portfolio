import { invalidateBookRequestCaches } from "@/features/lms/library-desk/library-desk-cache";
import type {
  BookRequestActionResult,
  BookRequestGroup,
  BookRequestStatus,
  SetBookRequestStatusResult,
} from "@/features/lms/library-desk/types/book-request-types";
import { callEditRecord as editRecord } from "@/lib/api/callables";
import { friendlyMessageFor as messageFor, unwrap } from "@/lib/api/callable-result";




function target(group: BookRequestGroup) {
  return { id: group.id, Title: group.Title, Author: group.Author };
}

export async function setBookRequestStatus(
  group: BookRequestGroup,
  status: BookRequestStatus,
): Promise<SetBookRequestStatusResult> {
  try {
    const response = await editRecord({
      case: "setBookRequestStatus",
      ...target(group),
      status,
    });
    const result = unwrap<SetBookRequestStatusResult>(response?.data);
    invalidateBookRequestCaches();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not update the book request."));
  }
}

export async function deleteBookRequestGroup(
  group: BookRequestGroup,
): Promise<BookRequestActionResult> {
  try {
    const response = await editRecord({
      case: "deleteBookRequestGroup",
      ...target(group),
    });
    const result = unwrap<BookRequestActionResult>(response?.data);
    invalidateBookRequestCaches();
    return result;
  } catch (error) {
    throw new Error(messageFor(error, "Could not remove the book request."));
  }
}
