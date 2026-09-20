import { createCaseRouter } from "../core/router";
import { addAnnouncement } from "../modules/library-desk/crud-announcement-record";
import { addAnnouncementReply } from "../modules/library-desk/crud-announcement-reply";
import { addNews } from "../modules/library-desk/crud-news-record";
import {
  addCollectionRecord,
  updateCollectionImage,
} from "../modules/collections/crud-collection-record";
import { addCollectionCopies } from "../modules/collections/crud-collection-copies-record";
import { addBookRequest } from "../modules/library-desk/crud-book-request-record";
import { addChatStart } from "../modules/library-desk/crud-chat-record";
import { declareLibraryClosure } from "../modules/library-desk/library-closure";

export const addRecordAttempt = createCaseRouter("addRecordAttempt", {
  addBookRequest,
  addCollectionRecord,
  addCollectionCopies,
  updateCollectionImage,
  declareLibraryClosure,
  addAnnouncement,
  addAnnouncementReply,
  addNews,
  chatStart: addChatStart,
});
