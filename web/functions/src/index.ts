import "./config/runtime";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

// ==========================================
// || AUTH — registration and verification ||
// ==========================================

export {
  requestPatronSelfRegistration,
  requestPatronLMSRegistration,
  resendPatronVerificationEmail,
  requestUpdatedEmailVerificationPatron,
  verifyEmailTokenPatron,
  verifyUpdatedEmailTokenPatron,
} from "./modules/auth/verify-patron";

export {
  requestStaffRegistration,
  requestUpdatedEmailVerificationStaff,
  verifyEmailTokenStaff,
  verifyUpdatedEmailTokenStaff,
} from "./modules/auth/verify-staff";

export {
  requestPasswordResetCode,
  verifyResetCodeOnly,
  resetPasswordWithCode,
} from "./modules/auth/password-reset";

export { recordLoginAttempt } from "./modules/auth/login";

// ==========================================
// || CALLABLE API SURFACE                 ||
// ==========================================

export { addRecordAttempt } from "./api/add-record";
export { editRecordAttempt } from "./api/edit-record";
export { archiveUnarchiveRecordAttempt } from "./api/archive-record";
export { circulationRecordAttempt } from "./api/circulation-record";
export { verifyCaptcha } from "./api/verify-captcha";

// ==========================================
// || LMS READS AND WRITES                 ||
// ==========================================

export { writingLogsAttempt } from "./modules/lms/writes/writing-logs";
export { fetchingDataAttempt } from "./modules/lms/reads/fetching-data";

/** Public OPAC catalogue over a cacheable GET. */
export { opacCatalogue } from "./modules/lms/reads/opac-catalogue-endpoint";

// ==========================================
// || SEARCH                               ||
// ==========================================

export { searchDataAttempt } from "./modules/search/search-data";
export { syncCollectionSearchIndex } from "./modules/search/search-index-writer";
export {
  updateSearchablesJson,
  refreshSearchIndexDaily,
} from "./modules/search/search-index-maintenance";

// ==========================================
// || LIVE CHAT                            ||
// ==========================================

export { onChatMessageCreated } from "./modules/library-desk/chat-triggers";

// ==========================================
// || SCHEDULED JOBS                       ||
// ==========================================

export { purgeStaleAnonymousUsers } from "./modules/auth/anonymous-cleanup";

export {
  cleanupEmailVerifications,
  cleanupPasswordResets,
  purgeOldLoginAttempts,
} from "./modules/auth/auth-jobs";

export { expireWaitingGuestChats } from "./modules/library-desk/chat-jobs";

export {
  rollDueDatesForClosures,
  sweepOverdueLoans,
  expireHoldShelf,
  expirePendingRequests,
  sendCirculationReminders,
  purgeSettledReservations,
} from "./modules/circulation/circulation-jobs";

// ==========================================
// || PATRON ENTRY DATA NFC                ||
// ==========================================

// Paused, not abandoned — the handlers and this export block are commented out
// together. See modules/visits/patron-entry-data.ts before removing anything.
