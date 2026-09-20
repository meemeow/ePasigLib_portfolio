import { lazy } from "react";

export const Login = lazy(() => import("@/features/auth/login/Page"));
export const Register = lazy(() => import("@/features/auth/register/Page"));
export const VerifyEmail = lazy(
  () => import("@/features/auth/email-verification/Page"),
);
export const PasswordReset = lazy(
  () => import("@/features/auth/password-reset/Page"),
);
export const Unauthorized = lazy(
  () => import("@/features/auth/unauthorized/Page"),
);

export const OPACHome = lazy(() => import("@/features/opac/home/Page"));
export const OPACCollections = lazy(() => import("@/features/opac/collections/Page"));
export const OPACCollectionView = lazy(
  () => import("@/features/opac/collections/pages/view/Page"),
);
export const OPACNewsAnnouncements = lazy(
  () => import("@/features/opac/news-announcements/Page"),
);
export const OPACAbout = lazy(() => import("@/features/opac/about/Page"));
export const OPACProfile = lazy(() => import("@/features/opac/profile/Page"));

export const LMSHome = lazy(() => import("@/features/lms/home/Page"));
export const LMSCollections = lazy(
  () => import("@/features/lms/collections/pages/index/Page"),
);
export const LMSCollectionsRegister = lazy(
  () => import("@/features/lms/collections/pages/register-collection/Page"),
);
export const LMSCollectionsView = lazy(
  () => import("@/features/lms/collections/pages/view-collection/Page"),
);
export const LMSCollectionsEdit = lazy(
  () => import("@/features/lms/collections/pages/edit-collection/Page"),
);
export const LMSPatrons = lazy(() => import("@/features/lms/patrons/pages/index/Page"));
export const LMSPatronsRegister = lazy(
  () => import("@/features/lms/patrons/pages/register-patron/Page"),
);
export const LMSPatronsVerify = lazy(
  () => import("@/features/lms/patrons/pages/verify-patron/Page"),
);
export const LMSPatronsView = lazy(
  () => import("@/features/lms/patrons/pages/view-patron/Page"),
);
export const LMSStaffs = lazy(() => import("@/features/lms/staffs/pages/index/Page"));
export const LMSStaffsRegister = lazy(
  () => import("@/features/lms/staffs/pages/register-staff/Page"),
);
export const LMSStaffsView = lazy(
  () => import("@/features/lms/staffs/pages/view-staff/Page"),
);
export const LMSCirculationsLayout = lazy(
  () => import("@/features/lms/circulations/components/CirculationsLayout"),
);
export const LMSCirculations = lazy(
  () => import("@/features/lms/circulations/pages/index/Page"),
);
export const LMSCirculationsCheckIn = lazy(
  () => import("@/features/lms/circulations/pages/check-in/Page"),
);
export const LMSCirculationsCheckOut = lazy(
  () => import("@/features/lms/circulations/pages/check-out/Page"),
);
export const LMSCirculationsRenew = lazy(
  () => import("@/features/lms/circulations/pages/renew/Page"),
);
export const LMSCirculationsCheckOutHistory = lazy(
  () => import("@/features/lms/circulations/pages/checkout-history/Page"),
);
export const LMSCirculationsCheckInHistory = lazy(
  () => import("@/features/lms/circulations/pages/checkin-history/Page"),
);
export const LMSCirculationsReservationHistory = lazy(
  () => import("@/features/lms/circulations/pages/reservation-history/Page"),
);
export const LMSCirculationsRenewalHistory = lazy(
  () => import("@/features/lms/circulations/pages/renewal-history/Page"),
);
export const LMSCirculationsReservationApproval = lazy(
  () => import("@/features/lms/circulations/pages/reservation-approval/Page"),
);
export const LMSReportsLayout = lazy(
  () => import("@/features/lms/reports/components/ReportsLayout"),
);
export const LMSReportsOverview = lazy(
  () => import("@/features/lms/reports/pages/overview/Page"),
);
export const LMSReportsCirculation = lazy(
  () => import("@/features/lms/reports/pages/circulation/Page"),
);
export const LMSReportsCollection = lazy(
  () => import("@/features/lms/reports/pages/collection/Page"),
);
export const LMSReportsPatrons = lazy(
  () => import("@/features/lms/reports/pages/patrons/Page"),
);
export const LMSReportsReferenceDesk = lazy(
  () => import("@/features/lms/reports/pages/reference-desk/Page"),
);
export const LMSReportsVisits = lazy(
  () => import("@/features/lms/reports/pages/visits/Page"),
);

export const LMSLibraryDeskLayout = lazy(
  () => import("@/features/lms/library-desk/components/LibraryDeskLayout"),
);
export const LMSDeskAnnouncements = lazy(
  () => import("@/features/lms/library-desk/pages/announcements/Page"),
);
export const LMSDeskNews = lazy(
  () => import("@/features/lms/library-desk/pages/news/Page"),
);
export const LMSDeskViewAnnouncement = lazy(
  () => import("@/features/lms/library-desk/pages/view-announcement/Page"),
);
export const LMSDeskViewNews = lazy(
  () => import("@/features/lms/library-desk/pages/view-news/Page"),
);
export const LMSDeskConversations = lazy(
  () => import("@/features/lms/library-desk/pages/conversations/Page"),
);
export const LMSDeskViewConversation = lazy(
  () => import("@/features/lms/library-desk/pages/view-conversation/Page"),
);
export const LMSDeskBookRequests = lazy(
  () => import("@/features/lms/library-desk/pages/book-requests/Page"),
);
export const LMSProfile = lazy(() => import("@/features/lms/profile/Page"));
