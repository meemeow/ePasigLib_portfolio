"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeSettledReservations = exports.sendCirculationReminders = exports.expirePendingRequests = exports.expireHoldShelf = exports.sweepOverdueLoans = exports.rollDueDatesForClosures = exports.expireWaitingGuestChats = exports.purgeOldLoginAttempts = exports.cleanupPasswordResets = exports.cleanupEmailVerifications = exports.purgeStaleAnonymousUsers = exports.onChatMessageCreated = exports.refreshSearchIndexDaily = exports.updateSearchablesJson = exports.syncCollectionSearchIndex = exports.searchDataAttempt = exports.opacCatalogue = exports.fetchingDataAttempt = exports.writingLogsAttempt = exports.verifyCaptcha = exports.circulationRecordAttempt = exports.archiveUnarchiveRecordAttempt = exports.editRecordAttempt = exports.addRecordAttempt = exports.recordLoginAttempt = exports.resetPasswordWithCode = exports.verifyResetCodeOnly = exports.requestPasswordResetCode = exports.verifyUpdatedEmailTokenStaff = exports.verifyEmailTokenStaff = exports.requestUpdatedEmailVerificationStaff = exports.requestStaffRegistration = exports.verifyUpdatedEmailTokenPatron = exports.verifyEmailTokenPatron = exports.requestUpdatedEmailVerificationPatron = exports.resendPatronVerificationEmail = exports.requestPatronLMSRegistration = exports.requestPatronSelfRegistration = void 0;
require("./config/runtime");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
// ==========================================
// || AUTH — registration and verification ||
// ==========================================
var verify_patron_1 = require("./modules/auth/verify-patron");
Object.defineProperty(exports, "requestPatronSelfRegistration", { enumerable: true, get: function () { return verify_patron_1.requestPatronSelfRegistration; } });
Object.defineProperty(exports, "requestPatronLMSRegistration", { enumerable: true, get: function () { return verify_patron_1.requestPatronLMSRegistration; } });
Object.defineProperty(exports, "resendPatronVerificationEmail", { enumerable: true, get: function () { return verify_patron_1.resendPatronVerificationEmail; } });
Object.defineProperty(exports, "requestUpdatedEmailVerificationPatron", { enumerable: true, get: function () { return verify_patron_1.requestUpdatedEmailVerificationPatron; } });
Object.defineProperty(exports, "verifyEmailTokenPatron", { enumerable: true, get: function () { return verify_patron_1.verifyEmailTokenPatron; } });
Object.defineProperty(exports, "verifyUpdatedEmailTokenPatron", { enumerable: true, get: function () { return verify_patron_1.verifyUpdatedEmailTokenPatron; } });
var verify_staff_1 = require("./modules/auth/verify-staff");
Object.defineProperty(exports, "requestStaffRegistration", { enumerable: true, get: function () { return verify_staff_1.requestStaffRegistration; } });
Object.defineProperty(exports, "requestUpdatedEmailVerificationStaff", { enumerable: true, get: function () { return verify_staff_1.requestUpdatedEmailVerificationStaff; } });
Object.defineProperty(exports, "verifyEmailTokenStaff", { enumerable: true, get: function () { return verify_staff_1.verifyEmailTokenStaff; } });
Object.defineProperty(exports, "verifyUpdatedEmailTokenStaff", { enumerable: true, get: function () { return verify_staff_1.verifyUpdatedEmailTokenStaff; } });
var password_reset_1 = require("./modules/auth/password-reset");
Object.defineProperty(exports, "requestPasswordResetCode", { enumerable: true, get: function () { return password_reset_1.requestPasswordResetCode; } });
Object.defineProperty(exports, "verifyResetCodeOnly", { enumerable: true, get: function () { return password_reset_1.verifyResetCodeOnly; } });
Object.defineProperty(exports, "resetPasswordWithCode", { enumerable: true, get: function () { return password_reset_1.resetPasswordWithCode; } });
var login_1 = require("./modules/auth/login");
Object.defineProperty(exports, "recordLoginAttempt", { enumerable: true, get: function () { return login_1.recordLoginAttempt; } });
// ==========================================
// || CALLABLE API SURFACE                 ||
// ==========================================
var add_record_1 = require("./api/add-record");
Object.defineProperty(exports, "addRecordAttempt", { enumerable: true, get: function () { return add_record_1.addRecordAttempt; } });
var edit_record_1 = require("./api/edit-record");
Object.defineProperty(exports, "editRecordAttempt", { enumerable: true, get: function () { return edit_record_1.editRecordAttempt; } });
var archive_record_1 = require("./api/archive-record");
Object.defineProperty(exports, "archiveUnarchiveRecordAttempt", { enumerable: true, get: function () { return archive_record_1.archiveUnarchiveRecordAttempt; } });
var circulation_record_1 = require("./api/circulation-record");
Object.defineProperty(exports, "circulationRecordAttempt", { enumerable: true, get: function () { return circulation_record_1.circulationRecordAttempt; } });
var verify_captcha_1 = require("./api/verify-captcha");
Object.defineProperty(exports, "verifyCaptcha", { enumerable: true, get: function () { return verify_captcha_1.verifyCaptcha; } });
// ==========================================
// || LMS READS AND WRITES                 ||
// ==========================================
var writing_logs_1 = require("./modules/lms/writes/writing-logs");
Object.defineProperty(exports, "writingLogsAttempt", { enumerable: true, get: function () { return writing_logs_1.writingLogsAttempt; } });
var fetching_data_1 = require("./modules/lms/reads/fetching-data");
Object.defineProperty(exports, "fetchingDataAttempt", { enumerable: true, get: function () { return fetching_data_1.fetchingDataAttempt; } });
/** Public OPAC catalogue over a cacheable GET. */
var opac_catalogue_endpoint_1 = require("./modules/lms/reads/opac-catalogue-endpoint");
Object.defineProperty(exports, "opacCatalogue", { enumerable: true, get: function () { return opac_catalogue_endpoint_1.opacCatalogue; } });
// ==========================================
// || SEARCH                               ||
// ==========================================
var search_data_1 = require("./modules/search/search-data");
Object.defineProperty(exports, "searchDataAttempt", { enumerable: true, get: function () { return search_data_1.searchDataAttempt; } });
var search_index_writer_1 = require("./modules/search/search-index-writer");
Object.defineProperty(exports, "syncCollectionSearchIndex", { enumerable: true, get: function () { return search_index_writer_1.syncCollectionSearchIndex; } });
var search_index_maintenance_1 = require("./modules/search/search-index-maintenance");
Object.defineProperty(exports, "updateSearchablesJson", { enumerable: true, get: function () { return search_index_maintenance_1.updateSearchablesJson; } });
Object.defineProperty(exports, "refreshSearchIndexDaily", { enumerable: true, get: function () { return search_index_maintenance_1.refreshSearchIndexDaily; } });
// ==========================================
// || LIVE CHAT                            ||
// ==========================================
var chat_triggers_1 = require("./modules/library-desk/chat-triggers");
Object.defineProperty(exports, "onChatMessageCreated", { enumerable: true, get: function () { return chat_triggers_1.onChatMessageCreated; } });
// ==========================================
// || SCHEDULED JOBS                       ||
// ==========================================
var anonymous_cleanup_1 = require("./modules/auth/anonymous-cleanup");
Object.defineProperty(exports, "purgeStaleAnonymousUsers", { enumerable: true, get: function () { return anonymous_cleanup_1.purgeStaleAnonymousUsers; } });
var auth_jobs_1 = require("./modules/auth/auth-jobs");
Object.defineProperty(exports, "cleanupEmailVerifications", { enumerable: true, get: function () { return auth_jobs_1.cleanupEmailVerifications; } });
Object.defineProperty(exports, "cleanupPasswordResets", { enumerable: true, get: function () { return auth_jobs_1.cleanupPasswordResets; } });
Object.defineProperty(exports, "purgeOldLoginAttempts", { enumerable: true, get: function () { return auth_jobs_1.purgeOldLoginAttempts; } });
var chat_jobs_1 = require("./modules/library-desk/chat-jobs");
Object.defineProperty(exports, "expireWaitingGuestChats", { enumerable: true, get: function () { return chat_jobs_1.expireWaitingGuestChats; } });
var circulation_jobs_1 = require("./modules/circulation/circulation-jobs");
Object.defineProperty(exports, "rollDueDatesForClosures", { enumerable: true, get: function () { return circulation_jobs_1.rollDueDatesForClosures; } });
Object.defineProperty(exports, "sweepOverdueLoans", { enumerable: true, get: function () { return circulation_jobs_1.sweepOverdueLoans; } });
Object.defineProperty(exports, "expireHoldShelf", { enumerable: true, get: function () { return circulation_jobs_1.expireHoldShelf; } });
Object.defineProperty(exports, "expirePendingRequests", { enumerable: true, get: function () { return circulation_jobs_1.expirePendingRequests; } });
Object.defineProperty(exports, "sendCirculationReminders", { enumerable: true, get: function () { return circulation_jobs_1.sendCirculationReminders; } });
Object.defineProperty(exports, "purgeSettledReservations", { enumerable: true, get: function () { return circulation_jobs_1.purgeSettledReservations; } });
// ==========================================
// || PATRON ENTRY DATA NFC                ||
// ==========================================
// Paused, not abandoned — the handlers and this export block are commented out
// together. See modules/visits/patron-entry-data.ts before removing anything.
//# sourceMappingURL=index.js.map