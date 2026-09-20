import { createCaseRouter } from "../core/router";
import { staffArchiveUnarchive } from "../modules/users/crud-staff-record";
import { patronArchiveUnarchive } from "../modules/users/crud-patron-record";
import { deleteAnnouncement } from "../modules/library-desk/crud-announcement-record";
import { deleteAnnouncementReply } from "../modules/library-desk/crud-announcement-reply";
import { deleteNews } from "../modules/library-desk/crud-news-record";
import { collectionArchiveUnarchive } from "../modules/collections/crud-collection-record";
import { archiveUnarchiveCollectionCopies } from "../modules/collections/crud-collection-copies-record";

export const archiveUnarchiveRecordAttempt = createCaseRouter(
  "archiveUnarchiveRecordAttempt",
  {
    patronArchiveUnarchive,
    staffArchiveUnarchive,
    collectionArchiveUnarchive,
    archiveUnarchiveCollectionCopies,
    deleteAnnouncement,
    deleteNews,
    deleteAnnouncementReply,
  },
);
