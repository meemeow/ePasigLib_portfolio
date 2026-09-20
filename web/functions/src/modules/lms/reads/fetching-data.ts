import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import {
  CollectionFilters,
  CollectionSort,
  PatronFilters,
  PatronSort,
  RemovalTarget,
  StaffFilters,
  StaffSort,
} from "./fetching-types";
import {
  fetchAnnouncementData,
  fetchNewsData,
  fetchUpdateById,
  fetchUpdatesPaginated,
} from "../../library-desk/updates-reads";
import {
  fetchChatById,
  fetchChatsBadgeCount,
  fetchChatsPaginated,
} from "../../library-desk/desk-reads";
import type { ChatListFilters } from "../../library-desk/desk-reads";
import {
  fetchReportSummary,
  fetchReportYears,
} from "../../reports/report-reads";
import type {
  UpdatesFilters,
  UpdatesSection,
  UpdatesSort,
} from "../../library-desk/updates-reads";
import {
  getUnverifiedCount,
  fetchPatronDataPaginated,
  fetchPatronLogs,
  fetchPatronById,
  fetchUnverifiedPatrons,
} from "./fetching-patron-data";
import {
  fetchStaffDataPaginated,
  fetchStaffLogs,
  fetchOwnStaffModificationLogs,
  fetchStaffById,
} from "./fetching-staff-data";
import {
  checkRemovalAvailability,
  fetchClassCodeMaterialTypes,
  fetchCollectionById,
  fetchCollectionCards,
  fetchOpacCatalogue,
  fetchCollectionDataPaginated,
  fetchCollectionLogs,
  fetchCollectionsByClassCode,
  fetchLibraryLocations,
  fetchRelatedCollections,
  fetchSections,
} from "./collection";
import { fetchBookRequests } from "../../library-desk/book-request-reads";
import { readSuggestionQuota } from "../../library-desk/crud-book-request-record";
import { loadCalendar } from "../../circulation/library-calendar";
import { phDateString } from "../../circulation/circulation-policy";
import { db } from "../../../core/firebase";

type AnyObj = Record<string, any>;

// ======================
// || Mobile Functions ||
// ======================













async function fetchSuggestionQuota(authUid: string) {
  const patron = await db.collection("patrons").doc(authUid).get();
  const requestedBy = String(
    (patron.exists ? (patron.data() as AnyObj)?.UID : "") || authUid,
  );
  return await readSuggestionQuota(db, requestedBy);
}

async function fetchLibraryCalendar() {
  const calendar = await loadCalendar(db, { fresh: true });
  const today = phDateString(Date.now());
  return {
    closedWeekdays: calendar.closedWeekdays,
    closures: calendar.closures,
    today,
    todayClosureReason: calendar.closures[today] ?? null,
  };
}

// ====================================
// || Fetch Overall Record Functions ||
// ====================================

async function fetchPatronVisits(patronUID: string) {
  const visitsSnap = await db.collection("visits").get();
  const results: AnyObj[] = [];
  for (const visitDoc of visitsSnap.docs) {
    const patronsRef = visitDoc.ref.collection("patrons");
    const patronsSnap = await patronsRef.get();
    patronsSnap.forEach((patronDoc) => {
      const pd = patronDoc.data() as AnyObj;
      if (String(pd.id || "") === patronUID && pd.visits) {
        Object.values(pd.visits as AnyObj).forEach((v: AnyObj) => {
          results.push({
            date: visitDoc.id,
            timeIn: v?.timeIn || "-",
            timeOut: v?.timeOut || "-",
          });
        });
      }
    });
  }
  results.sort(
    (a, b) =>
      String(b.date || "").localeCompare(String(a.date || "")) ||
      String(b.timeIn || "").localeCompare(String(a.timeIn || "")),
  );
  return results;
}

// ==========================================
// || Chats & Suggestions helpers (server-side) ||
// ==========================================

// ==========================================
// || Main Callable Function ||
// ==========================================

export const fetchingDataAttempt = onCall(
  {
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const data = request.data as AnyObj | undefined;
    const which: string | undefined = data?.case;
    const authUid: string | undefined = request.auth?.uid || undefined;

    if (!which) {
      throw new functions.https.HttpsError("invalid-argument", "Missing case");
    }

    const requireAuthUid = () => {
      if (!authUid)
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      return authUid;
    };

    const getTargetUID = (): string => {
      const fromParam = data?.patronUID as string | undefined;
      return fromParam || requireAuthUid();
    };

    async function fetchLoggedInProfile(uid: string) {
      const staffSnap = await db.collection("staffs").doc(uid).get();
      if (staffSnap.exists) {
        const d = staffSnap.data() || ({} as AnyObj);
        const roles: AnyObj = {
          CatalogingAdd: !!d.CatalogingAdd,
          CatalogingEdit: !!d.CatalogingEdit,
          CatalogingArchive: !!d.CatalogingArchive,
          PatronAdd: !!d.PatronAdd,
          PatronEdit: !!d.PatronEdit,
          PatronArchive: !!d.PatronArchive,
          VerifyIDs: !!d.VerifyIDs,
          Checkout: !!d.Checkout,
          Checkin: !!d.Checkin,
          ApproveRenewals: !!d.ApproveRenewals,
          AnnouncementCreation: !!d.AnnouncementCreation,
          ReportGeneration: !!d.ReportGeneration,
          LiveChat: !!d.LiveChat,
          StaffAdd: !!d.StaffAdd,
          StaffEdit: !!d.StaffEdit,
          StaffArchive: !!d.StaffArchive,
        };
        return {
          userType: "Staff",
          profile: {
            FirstName: d.FirstName || "",
            LastName: d.LastName || "",
            MiddleName: d.MiddleName || "",
            Suffix: d.Suffix || "",
            Email: d.Email || "",
            UID: d.UID || uid,
            Avatar: d.Avatar || "",
            City: d.City || "",
            Barangay: d.Barangay || "",
            PhoneNumber: d.PhoneNumber || "",
            StaffCode: d.StaffCode || "",
            JobTitle: d.JobTitle || d.Position || "Staff",
            State: d.State || "",
            Status: d.Status || "",
            Sex: d.Sex || "",
            BirthDate: d.BirthDate || "",
          },
          roles,
          raw: d,
        };
      }
      const patSnap = await db.collection("patrons").doc(uid).get();
      if (patSnap.exists) {
        const d = patSnap.data() || ({} as AnyObj);
        return {
          userType: "Patron",
          profile: {
            FirstName: d.FirstName || "",
            LastName: d.LastName || "",
            MiddleName: d.MiddleName || "",
            Suffix: d.Suffix || "",
            Email: d.Email || "",
            UID: d.UID || uid,
            Avatar: d.Avatar || "",
            City: d.City || "",
            Barangay: d.Barangay || "",
            PhoneNumber: d.PhoneNumber || "",
            State: d.State || "",
            SchoolWork: d.SchoolWork || "",
            ID: d.ID || "",
            PublicUID: d.PublicUID || "-",
            Sex: d.Sex || "",
            Status: d.Status || "",
            BirthDate: d.BirthDate || "",
          },
          roles: null,
          raw: d,
        };
      }
      throw new functions.https.HttpsError(
        "not-found",
        "No profile found for user",
      );
    }

    switch (which) {
      case "fetchBooksCollection":
        return await fetchOpacCatalogue();
      case "fetchClassCodeMaterialTypes":
        return await fetchClassCodeMaterialTypes();
      case "fetchLibraryLocations":
        return await fetchLibraryLocations();
      case "fetchSections":
        return await fetchSections();
      case "fetchPatronVisits":
        return await fetchPatronVisits(getTargetUID());
      case "ownStaffModificationLogs":
        return await fetchOwnStaffModificationLogs(requireAuthUid());
      case "collectionLogs": {
        const collectionUID = String((data as AnyObj)?.collectionUID || "");
        const collectionTitle = String((data as AnyObj)?.collectionTitle || "");
        if (!collectionUID && !collectionTitle)
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Missing collectionUID or collectionTitle",
          );
        return await fetchCollectionLogs(collectionUID, collectionTitle);
      }
      case "checkRemovalAvailability": {
        const REMOVAL_TARGETS: RemovalTarget[] = [
          "classCodes",
          "materialTypes",
          "libraryLocations",
          "sections",
        ];
        const type = data?.type as RemovalTarget | undefined;
        if (!type || !REMOVAL_TARGETS.includes(type))
          throw new functions.https.HttpsError(
            "invalid-argument",
            `type must be one of: ${REMOVAL_TARGETS.join(", ")}`,
          );
        const values = Array.isArray(data?.values)
          ? (data.values as string[])
          : [];
        return await checkRemovalAvailability(type, values);
      }
      case "collectionsByClassCode": {
        const classCode = String(data?.classCode || "").trim();
        if (!classCode)
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Missing classCode",
          );
        return await fetchCollectionsByClassCode(
          classCode,
          Number(data?.limit) || 4,
        );
      }
      case "fetchChatsBadgeCount":
        return await fetchChatsBadgeCount({ staffCode: data?.staffCode });
      case "loggedInProfile":
        return await fetchLoggedInProfile(requireAuthUid());
      case "fetchAnnouncementData":
        return await fetchAnnouncementData();
      case "fetchNewsData":
        return await fetchNewsData();

      case "updatesDataPaginated": {
        const limit = Math.min(Number(data?.limit) || 10, 100);
        const page = Math.max(Number(data?.page) || 1, 1);
        const type = String(data?.type ?? data?.section ?? "");
        if (type !== "news" && type !== "announcements") {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "type must be 'announcements' or 'news'.",
          );
        }

        return await fetchUpdatesPaginated({
          type: type as UpdatesSection,
          limit,
          page,
          searchTerm: data?.searchTerm as string | undefined,
          filters: data?.filters as UpdatesFilters | undefined,
          sortBy: data?.sortBy as UpdatesSort | undefined,
        });
      }

      case "updateById":
        return await fetchUpdateById({ id: data?.id });
      case "chatsDataPaginated": {
        const limit = Math.min(Number(data?.limit) || 10, 100);
        const page = Math.max(Number(data?.page) || 1, 1);
        return await fetchChatsPaginated({
          limit,
          page,
          searchTerm: data?.searchTerm as string | undefined,
          filters: data?.filters as ChatListFilters | undefined,
          sortBy: data?.sortBy as
            | { column?: string; direction?: "asc" | "desc" }
            | undefined,
          staffCode: data?.staffCode as string | undefined,
        });
      }
      case "fetchChatById":
        return await fetchChatById({
          chatId: data?.chatId,
          staffCode: data?.staffCode,
        });
      case "fetchBookRequests":
        return await fetchBookRequests();

      case "reportSummary":
        return await fetchReportSummary(data ?? {});
      case "reportYears":
        return await fetchReportYears();
      case "libraryCalendar":
        return await fetchLibraryCalendar();
      case "suggestionQuota":
        return await fetchSuggestionQuota(requireAuthUid());
      case "fetchBookById": {
        const id = String(data?.id || "").trim();
        if (!id)
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Missing id",
          );
        return { book: await fetchCollectionById(id) };
      }
      case "collectionById":
        return await fetchCollectionById(String(data?.id || "").trim());
      case "fetchRelatedBooks":
        return await fetchRelatedCollections(
          String(data?.author || "").trim(),
          String(data?.publisher || "").trim(),
          String(data?.excludeId || "").trim(),
        );
      case "collectionDataPaginated":
      case "booksCollectionPaginated":
        return await fetchCollectionDataPaginated({
          limit: Math.min(Number(data?.limit) || 24, 50),
          page: Math.max(Number(data?.page) || 1, 1),
          filters: data?.filters as CollectionFilters | undefined,
          sortBy: data?.sortBy as CollectionSort | undefined,
          ids: Array.isArray(data?.ids) ? (data.ids as string[]) : undefined,
          after: String(data?.after || "").trim() || undefined,
          at: String(data?.at || "").trim() || undefined,
        });
      case "booksCollectionLightweight":
        return await fetchCollectionCards(Math.min(Number(data?.limit) || 12, 24));

      case "checkPatronVerificationStatus": {
        const targetEmail = data?.email as string;
        if (!targetEmail) return false;

        const snapshot = await db
          .collection("patrons")
          .where("Email", "==", targetEmail)
          .limit(1)
          .get();

        return !snapshot.empty;
      }

      case "patronDataPaginated": {
        const limit = Math.min(Number(data?.limit) || 20, 100);
        const page = Math.max(Number(data?.page) || 1, 1);
        const searchTerm = data?.searchTerm as string | undefined;
        const filters = data?.filters as PatronFilters | undefined;
        const sortBy = data?.sortBy as PatronSort | undefined;

        return await fetchPatronDataPaginated({
          limit,
          page,
          searchTerm,
          filters,
          sortBy,
        });
      }

      case "staffDataPaginated": {
        const limit = Math.min(Number(data?.limit) || 20, 100);
        const page = Math.max(Number(data?.page) || 1, 1);
        const searchTerm = data?.searchTerm as string | undefined;
        const filters = data?.filters as StaffFilters | undefined;
        const sortBy = data?.sortBy as StaffSort | undefined;

        return await fetchStaffDataPaginated({
          limit,
          page,
          searchTerm,
          filters,
          sortBy,
        });
      }

      case "staffLogs":
        return await fetchStaffLogs(
          String((data as AnyObj)?.staffUID || "") || requireAuthUid(),
        );

      case "patronLogs":
        return await fetchPatronLogs(getTargetUID());

      case "getUnverifiedCount": {
        return await getUnverifiedCount();
      }

      case "patronById":
        return await fetchPatronById(data?.id as string);

      case "staffById":
        return await fetchStaffById(data?.id as string);

      case "unverifiedPatrons":
        return await fetchUnverifiedPatrons();

      default:
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Unknown case: ${which}`,
        );
    }
  },
);
