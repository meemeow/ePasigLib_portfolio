import { createCaseRouter } from "../core/router";
import { editStaffInformation } from "../modules/users/crud-staff-record";
import {
  editPatronInformation,
  verifyUnverifiedPatrons,
} from "../modules/users/crud-patron-record";
import {
  editOwnProfile,
  uploadAvatar,
  uploadPatronID,
} from "../modules/users/crud-profile-record";
import { editCollectionInformation } from "../modules/collections/crud-collection-record";
import {
  deleteBookRequestGroup,
  setBookRequestStatus,
} from "../modules/library-desk/crud-book-request-record";
import { editCollectionCopies } from "../modules/collections/crud-collection-copies-record";
import {
  editClassCodesAndMaterialTypes,
  editLibraryLocations,
  editSections,
} from "../modules/collections/crud-collection-constants-record";
import {
  editAnnouncement,
  publishAnnouncement,
} from "../modules/library-desk/crud-announcement-record";
import { editAnnouncementReply } from "../modules/library-desk/crud-announcement-reply";
import {
  editNews,
  publishNews,
  incrementNewsViewCount,
} from "../modules/library-desk/crud-news-record";
import {
  chatTake,
  chatEnd,
  chatMarkRead,
  chatRate,
} from "../modules/library-desk/crud-chat-record";

export const editRecordAttempt = createCaseRouter("editRecordAttempt", {
  editOwnProfile,
  uploadAvatar,
  uploadPatronID,
  editPatronInformation,
  editStaffInformation,
  verifyUnverifiedPatrons,
  editCollectionInformation,
  editCollectionCopies,
  editClassCodesAndMaterialTypes,
  editLibraryLocations,
  editSections,
  deleteBookRequestGroup,
  setBookRequestStatus,
  editAnnouncement,
  editAnnouncementReply,
  editNews,
  publishAnnouncement,
  publishNews,
  incrementNewsViewCount,
  chatTake,
  chatEnd,
  chatMarkRead,
  chatRate,
});
