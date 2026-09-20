import { onCall } from "firebase-functions/v2/https";
import { db } from "../core/firebase";
import { commitInChunks } from "../core/batch";
import { badRequest } from "../core/errors";
import { requireSelf, requireStaffActor } from "../core/guards";
import {
  fetchCirculationDataPaginated,
  fetchDashboardSummary,
  listBorrowedBooks,
  patronSlotUsage,
} from "../modules/circulation/circulation-record-reads";
import type { CirculationSection } from "../modules/circulation/circulation-record-types";
import {
  NEWS_BADGE_MUTED_FIELD,
  UNREAD_ANNOUNCEMENTS_FIELD,
  UNREAD_NEWS_FIELD,
  UNREAD_PERSONAL_FIELD,
  markRowsReadAndSettle,
  readCounter,
  unreadFieldFor,
} from "../modules/notifications/notification-common";
import {
  getBookByBarcode,
  searchCollections,
  searchCopies,
  searchPatrons,
} from "../modules/circulation/circulation-lookups";
import {
  cartAdd,
  cartHistory,
  cartOverview,
  cartRemove,
  renewSelf,
  reservableCopies,
  reservationBatch,
  reservationCancel,
  requirePatronSelf,
  savedAdd,
  savedRemove,
} from "../modules/circulation/patron-ops";
import {
  checkin,
  checkout,
  renewalApprove,
  reservationAction,
} from "../modules/circulation/staff-ops";

type AnyObj = Record<string, any>;

function assertNotificationTarget(target: string): void {
  if (target !== "patrons") {
    throw badRequest("Notifications are only kept for patrons");
  }
}

export const circulationRecordAttempt = onCall(
  {
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const data = (request.data || {}) as AnyObj;
    const which = String(data.case || "");
    const authUid = request.auth?.uid || "";

    if (!which) {
      throw badRequest("Missing case");
    }

    switch (which) {
      // ==========================================
      // || STAFF — CIRCULATION DESK             ||
      // ==========================================

      case "checkout":
        return await checkout(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          collectionId: String(data.collectionId || ""),
          accession: String(data.accession || ""),
          dueDate: data.dueDate ? String(data.dueDate) : undefined,
        });

      case "checkin":
        return await checkin(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          collectionId: String(data.collectionId || ""),
          accession: String(data.accession || ""),
        });

      case "renewalApprove":
        return await renewalApprove(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          borrowKey: String(data.borrowKey || ""),
          days: Number(data.days) || 0,
        });

      case "reservationAction":
        return await reservationAction(db, authUid, {
          docId: String(data.docId || ""),
          action: String(data.action || "") as "approve" | "reject",
          remarks: String(data.remarks || ""),
        });

      // ==========================================
      // || STAFF — LOOKUPS                      ||
      // ==========================================

      case "searchPatrons":
        await requireStaffActor(authUid, []);
        return await searchPatrons(db, String(data.term || ""));

      case "searchCopies":
        await requireStaffActor(authUid, []);
        return await searchCopies(db, String(data.term || ""));

      case "searchCollections":
        await requireStaffActor(authUid, []);
        return await searchCollections(db, String(data.searchTerm || ""));

      case "getBookByBarcode": {
        await requireStaffActor(authUid, []);
        const barcode = String(data.barcode || "").trim();
        if (!barcode) {
          throw badRequest("Missing barcode");
        }
        return await getBookByBarcode(db, barcode);
      }

      // ==========================================
      // || STAFF — RECORD TABLES                ||
      // ==========================================

      case "circulationDataPaginated":
        await requireStaffActor(authUid, []);
        return await fetchCirculationDataPaginated({
          type: String(data.type || "") as CirculationSection,
          limit: Number(data.limit) || 10,
          page: Number(data.page) || 1,
          searchTerm: data.searchTerm ? String(data.searchTerm) : undefined,
          filters: data.filters || {},
          sortBy: data.sortBy || undefined,
        });

      case "dashboardSummary":
        await requireStaffActor(authUid, []);
        return await fetchDashboardSummary();

      case "listBorrowedBooks": {
        await requireStaffActor(authUid, []);
        const patronIdOrUID = String(data.patronIdOrUID || "").trim();
        if (!patronIdOrUID) {
          return { patronUID: "", patronName: "", books: [] };
        }
        return await listBorrowedBooks(patronIdOrUID);
      }

      case "patronSlotUsage": {
        await requireStaffActor(authUid, []);
        const patronIdOrUID = String(data.patronIdOrUID || "").trim();
        if (!patronIdOrUID) {
          return {
            patronUID: "",
            loans: 0,
            holds: 0,
            pending: 0,
            total: 0,
            max: 0,
          };
        }
        return await patronSlotUsage(patronIdOrUID);
      }

      // ==========================================
      // || PATRON — CART                        ||
      // ==========================================

      case "cart_get": {
        const { data: patron } = await requirePatronSelf(
          db,
          authUid,
          String(data.patronIdOrUID || ""),
        );
        return { cart: patron.CartList || {} };
      }

      case "cart_add":
        return await cartAdd(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          book: (data.book || {}) as AnyObj,
        });

      case "cart_remove":
        return await cartRemove(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          bookId: String(data.bookId || ""),
        });

      case "saved_add":
        return await savedAdd(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          book: (data.book || {}) as AnyObj,
        });

      case "saved_remove":
        return await savedRemove(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          bookId: String(data.bookId || ""),
        });

      case "cart_overview":
        return await cartOverview(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          historyLimit: Number(data.historyLimit) || 10,
        });

      case "cart_history":
        return await cartHistory(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          limit: Number(data.limit) || 10,
          startAfterId: data.startAfterId ? String(data.startAfterId) : undefined,
        });

      case "book_reservable_copies":
        return await reservableCopies(db, String(data.bookId || ""));

      // ==========================================
      // || PATRON — REQUESTS                    ||
      // ==========================================

      case "reservation_batch":
        return await reservationBatch(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          books: Array.isArray(data.books) ? (data.books as AnyObj[]) : [],
          purpose: String(data.purpose || ""),
        });

      case "reservation_cancel":
        return await reservationCancel(db, authUid, {
          requestId: String(data.requestId || data.request?.id || ""),
        });

      case "renewal_self":
        return await renewSelf(db, authUid, {
          patronIdOrUID: String(data.patronIdOrUID || ""),
          borrowKey: String(data.borrowKey || ""),
          days: Number(data.days) || undefined,
        });

      // ==========================================
      // || NOTIFICATIONS                        ||
      // ==========================================

      case "fetch_notifications": {
        const target = String(data.target || "").trim();
        const uid = String(data.uid || "").trim();
        const limitN = Number(data.limit || 5) || 5;
        const lastDocId = data.lastDocId ? String(data.lastDocId) : null;
        if (!target || !uid) {
          throw badRequest("Missing target or uid");
        }
        assertNotificationTarget(target);
        requireSelf(authUid, uid);

        const notifCollRef = db
          .collection(target)
          .doc(uid)
          .collection("notifications");
        const scope = String(data.scope || "all");
        let q: FirebaseFirestore.Query = notifCollRef;
        if (scope === "personal") q = q.where("isUpdate", "==", false);
        else if (scope === "updates") q = q.where("isUpdate", "==", true);
        q = q.orderBy("date", "desc").limit(limitN);
        if (lastDocId) {
          const lastSnap = await notifCollRef.doc(lastDocId).get();
          if (lastSnap.exists) q = q.startAfter(lastSnap);
        }
        const snap = await q.get();
        const out = snap.docs.map((d) => {
          const dt = d.data();
          const dateVal =
            dt.date && typeof (dt.date as any)?.toDate === "function"
              ? (dt.date as any).toDate().toISOString()
              : dt.date || null;
          return {
            id: d.id,
            title: String(dt.title || ""),
            content: String(dt.content || ""),
            date: dateVal,
            read: Boolean(dt.read || false),
            pressable: dt.pressable || false,
            type: dt.type || null,
            targetId: dt.targetId || null,
          } as AnyObj;
        });
        return {
          notifications: out,
          lastDocId: snap.docs.length
            ? snap.docs[snap.docs.length - 1].id
            : null,
          hasMore: snap.docs.length === limitN,
        };
      }

      case "mark_notification_read": {
        const target = String(data.target || "").trim();
        const uid = String(data.uid || "").trim();
        const id = String(data.id || "").trim();
        if (!target || !uid || !id) {
          throw badRequest("Missing target/uid/id");
        }
        assertNotificationTarget(target);
        requireSelf(authUid, uid);
        try {
          const ownerRef = db.collection(target).doc(uid);
          const noteRef = ownerRef.collection("notifications").doc(id);

          await markRowsReadAndSettle(db, ownerRef, [noteRef]);
          return { ok: true };
        } catch (err: any) {
          return { ok: false, error: err?.message || String(err) };
        }
      }

      case "unread_update_ids": {
        const uid = String(data.uid || "").trim();
        requireSelf(authUid, uid);

        const snap = await db
          .collection("patrons")
          .doc(uid)
          .collection("notifications")
          .where("isUpdate", "==", true)
          .where("read", "==", false)
          .get();

        const ids = new Set<string>();
        for (const doc of snap.docs) {
          const id = String(doc.get("relatedUpdateId") ?? "").trim();
          if (id) ids.add(id);
        }

        return { ids: Array.from(ids) };
      }

      case "notification_summary": {
        const uid = String(data.uid || "").trim();
        requireSelf(authUid, uid);

        const patronSnap = await db.collection("patrons").doc(uid).get();

        let unreadChats = 0;
        try {
          const chats = await db
            .collection("chats")
            .where("Participants", "array-contains", uid)
            .where("UnreadPatron", ">", 0)
            .select("Status")
            .get();
          unreadChats = chats.docs.filter(
            (doc) => String(doc.get("Status") ?? "") !== "closed",
          ).length;
        } catch (error) {
          console.error("Could not count unread chats:", error);
        }

        if (!patronSnap.exists) {
          return {
            unread: 0,
            unreadUpdates: 0,
            unreadAnnouncements: 0,
            unreadNews: 0,
            unreadChats: 0,
            newsMuted: false,
          };
        }

        const patron = patronSnap.data() || {};
        const newsMuted = Boolean(patron[NEWS_BADGE_MUTED_FIELD]);
        const announcements = readCounter(patron[UNREAD_ANNOUNCEMENTS_FIELD]);
        const news = readCounter(patron[UNREAD_NEWS_FIELD]);

        return {
          unread: readCounter(patron[UNREAD_PERSONAL_FIELD]),
          unreadUpdates: announcements + (newsMuted ? 0 : news),
          unreadAnnouncements: announcements,
          unreadNews: news,
          unreadChats,
          newsMuted,
        };
      }

      case "set_news_badge_muted": {
        const uid = String(data.uid || "").trim();
        requireSelf(authUid, uid);
        const muted = Boolean(data.muted);
        await db
          .collection("patrons")
          .doc(uid)
          .set({ [NEWS_BADGE_MUTED_FIELD]: muted }, { merge: true });
        return { ok: true, newsMuted: muted };
      }

      case "mark_update_read": {
        const uid = String(data.uid || "").trim();
        requireSelf(authUid, uid);

        const updateId = String(data.updateId || "").trim();
        if (!updateId) {
          throw badRequest("Missing updateId");
        }

        const ownerRef = db.collection("patrons").doc(uid);
        const unread = await ownerRef
          .collection("notifications")
          .where("relatedUpdateId", "==", updateId)
          .where("read", "==", false)
          .get();

        if (unread.empty) return { ok: true, cleared: 0 };

        const cleared = await markRowsReadAndSettle(
          db,
          ownerRef,
          unread.docs.map((doc) => doc.ref),
        );
        return { ok: true, cleared };
      }

      case "mark_bucket_read": {
        const uid = String(data.uid || "").trim();
        requireSelf(authUid, uid);

        const kind = String(data.kind || "").trim();
        if (
          kind !== "announcements" &&
          kind !== "news" &&
          kind !== "personal"
        ) {
          throw badRequest("kind must be 'personal', 'announcements' or 'news'");
        }

        const field =
          kind === "news"
            ? UNREAD_NEWS_FIELD
            : kind === "announcements"
              ? UNREAD_ANNOUNCEMENTS_FIELD
              : UNREAD_PERSONAL_FIELD;
        const ownerRef = db.collection("patrons").doc(uid);

        const unread = await ownerRef
          .collection("notifications")
          .where("isUpdate", "==", kind !== "personal")
          .where("read", "==", false)
          .get();

        const docs = unread.docs.filter(
          (doc) => unreadFieldFor(doc.get("type")) === field,
        );

        await commitInChunks(docs, (batch, doc) => batch.update(doc.ref, { read: true }), 400);

        await ownerRef.set({ [field]: 0 }, { merge: true });

        return { ok: true, cleared: docs.length };
      }

      case "mark_all_notifications_read": {
        const target = String(data.target || "").trim();
        const uid = String(data.uid || "").trim();
        if (!target || !uid) {
          throw badRequest("Missing target or uid");
        }
        requireSelf(authUid, uid);

        const ownerRef = db.collection(target).doc(uid);
        const unread = await ownerRef
          .collection("notifications")
          .where("read", "==", false)
          .get();

        const docs = unread.docs;
        await commitInChunks(docs, (batch, doc) => batch.update(doc.ref, { read: true }), 400);

        if (target === "patrons") {
          await ownerRef.set(
            {
              [UNREAD_PERSONAL_FIELD]: 0,
              [UNREAD_ANNOUNCEMENTS_FIELD]: 0,
              [UNREAD_NEWS_FIELD]: 0,
            },
            { merge: true },
          );
        }
        return { ok: true, cleared: docs.length };
      }

      default:
        throw badRequest(`Unknown case: ${which}`);
    }
  },
);
