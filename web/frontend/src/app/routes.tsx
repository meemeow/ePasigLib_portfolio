import FullscreenSpinner from "@/components/ui/FullscreenSpinner";
import type { StaffRoles } from "@/lib/auth/auth-types";
import { AuthProvider, useAuth } from "@/lib/auth/use-auth";
import AppShell from "@/components/layout/AppShell";
import { CartProvider } from "@/features/opac/collections/components/use-cart";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import {
  LMSCirculations,
  LMSCirculationsCheckIn,
  LMSCirculationsCheckInHistory,
  LMSCirculationsCheckOut,
  LMSCirculationsCheckOutHistory,
  LMSCirculationsLayout,
  LMSCirculationsRenew,
  LMSCirculationsRenewalHistory,
  LMSCirculationsReservationApproval,
  LMSCirculationsReservationHistory,
  LMSCollections,
  LMSCollectionsEdit,
  LMSCollectionsRegister,
  LMSCollectionsView,
  LMSHome,
  LMSPatrons,
  LMSPatronsRegister,
  LMSPatronsVerify,
  LMSPatronsView,
  LMSProfile,
  LMSReportsLayout,
  LMSReportsOverview,
  LMSReportsCirculation,
  LMSReportsCollection,
  LMSReportsPatrons,
  LMSReportsReferenceDesk,
  LMSReportsVisits,
  LMSStaffs,
  LMSStaffsRegister,
  LMSStaffsView,
  LMSLibraryDeskLayout,
  LMSDeskAnnouncements,
  LMSDeskNews,
  LMSDeskViewAnnouncement,
  LMSDeskViewNews,
  LMSDeskConversations,
  LMSDeskViewConversation,
  LMSDeskBookRequests,
  Login,
  OPACAbout,
  OPACCollectionView,
  OPACCollections,
  OPACHome,
  OPACNewsAnnouncements,
  OPACProfile,
  PasswordReset,
  Unauthorized,
  VerifyEmail,
} from "@/app/lazy";
import { JSX, ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Navigate,
  Outlet,
  createBrowserRouter,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;

function AppProviders() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function RouteLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  );
}

function SilentBounce({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const { key } = useLocation();

  useEffect(() => {
    if (key === "default") navigate(fallback, { replace: true });
    else navigate(-1);
  }, [navigate, key, fallback]);

  return null;
}

type RouteGateProps = {
  children: ReactNode;
  requiredType?: "Staff" | "Patron";
  requiredRoles?: Array<keyof StaffRoles>;
  requireAnyRole?: boolean;
  redirectToUnauthorized?: boolean;
};

function RouteGate({
  children,
  requiredType,
  requiredRoles = [],
  requireAnyRole = false,
  redirectToUnauthorized = false,
}: RouteGateProps) {
  const { user, userType, staffRoles, loading } = useAuth();

  if (loading) return <RouteLoading />;

  if (!user) return <SilentBounce fallback="/login" />;
  if (requiredType && userType !== requiredType) {
    return (
      <SilentBounce
        fallback={userType === "Staff" ? "/lms/home" : "/opac/home"}
      />
    );
  }

  const hasRole = requireAnyRole
    ? requiredRoles.some((role) => staffRoles?.[role])
    : requiredRoles.every((role) => staffRoles?.[role]);

  if (requiredRoles.length > 0 && !hasRole) {
    return redirectToUnauthorized ? (
      <Navigate to="/unauthorized" replace />
    ) : (
      <Unauthorized />
    );
  }

  return children;
}

function OPACPublicRoute({ children }: { children: JSX.Element }) {
  const { userType, loading } = useAuth();

  if (loading) return <RouteLoading />;
  if (userType === "Staff") return <SilentBounce fallback="/lms/home" />;
  return children;
}

function LegacyBooksRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={`/opac/collections${search}${hash}`} replace />;
}

function LegacyBookRedirect() {
  const { id } = useParams();
  return <Navigate to={`/opac/collections/${id ?? ""}`} replace />;
}

export const routes = createBrowserRouter([
  {
    id: "app-providers",
    element: <AppProviders />,
    hydrateFallbackElement: <FullscreenSpinner />,
    children: [
      {
        index: true,
        element: <Navigate to="/opac/home" replace />,
      },
      {
        path: "/login",
        element: (
          <GoogleReCaptchaProvider
            reCaptchaKey={recaptchaSiteKey}
          >
            <Login />
          </GoogleReCaptchaProvider>
        ),
      },
      {
        path: "/register",
        element: <SilentBounce fallback="/login" />,
      },
      {
        path: "/verify_email",
        element: <VerifyEmail />,
      },
      {
        path: "/password_reset",
        element: <PasswordReset />,
      },
      {
        element: <AppShell />,
        children: [
          {
            path: "/opac/home",
            element: (
              <OPACPublicRoute>
                <OPACHome />
              </OPACPublicRoute>
            ),
          },
          {
            path: "/opac/about",
            element: (
              <OPACPublicRoute>
                <OPACAbout />
              </OPACPublicRoute>
            ),
          },
          {
            path: "/opac/news_announcements",
            element: (
              <OPACPublicRoute>
                <OPACNewsAnnouncements />
              </OPACPublicRoute>
            ),
          },
          {
            element: (
              <CartProvider>
                <Outlet />
              </CartProvider>
            ),
            children: [
              {
                path: "/opac/collections",
                element: (
                  <OPACPublicRoute>
                    <OPACCollections />
                  </OPACPublicRoute>
                ),
              },
              {
                path: "/opac/collections/:id",
                element: (
                  <OPACPublicRoute>
                    <OPACCollectionView />
                  </OPACPublicRoute>
                ),
              },
            ],
          },
          {
            path: "/opac/books",
            element: <LegacyBooksRedirect />,
          },
          {
            path: "/opac/books/:id",
            element: <LegacyBookRedirect />,
          },
          {
            path: "/opac/contacts",
            element: <Navigate to="/opac/about#visit-us" replace />,
          },
          {
            element: (
              <RouteGate requiredType="Patron">
                <Outlet />
              </RouteGate>
            ),
            children: [
              {
                path: "/opac/profile",
                element: <OPACProfile />,
              },
            ],
          },
          {
            element: (
              <RouteGate requiredType="Staff">
                <Outlet />
              </RouteGate>
            ),
            children: [
              {
                path: "/lms/home",
                element: <LMSHome />,
              },
              {
                path: "/lms/profile",
                element: <LMSProfile />,
              },
            ],
          },
          {
            path: "/lms/circulations",
            element: (
              <RouteGate requiredType="Staff">
                <LMSCirculationsLayout />
              </RouteGate>
            ),
            children: [
              { index: true, element: <LMSCirculations /> },
              {
                path: "check-in",
                element: (
                  <RouteGate requiredType="Staff" requiredRoles={["Checkin"]}>
                    <LMSCirculationsCheckIn />
                  </RouteGate>
                ),
              },
              {
                path: "check-out",
                element: (
                  <RouteGate requiredType="Staff" requiredRoles={["Checkout"]}>
                    <LMSCirculationsCheckOut />
                  </RouteGate>
                ),
              },
              {
                path: "renew",
                element: (
                  <RouteGate
                    requiredType="Staff"
                    requiredRoles={["ApproveRenewals"]}
                  >
                    <LMSCirculationsRenew />
                  </RouteGate>
                ),
              },
              {
                path: "checkout-history",
                element: <LMSCirculationsCheckOutHistory key="checkoutHistory" />,
              },
              {
                path: "checkin-history",
                element: <LMSCirculationsCheckInHistory key="checkinHistory" />,
              },
              {
                path: "reservation-history",
                element: (
                  <LMSCirculationsReservationHistory key="reservationHistory" />
                ),
              },
              {
                path: "renewal-history",
                element: (
                  <LMSCirculationsRenewalHistory key="renewalHistory" />
                ),
              },
              {
                path: "reservation-approval",
                element: (
                  <LMSCirculationsReservationApproval key="reservationApproval" />
                ),
              },
            ],
          },
          {
            element: (
              <RouteGate
                requiredType="Staff"
                requiredRoles={[
                  "CatalogingAdd",
                  "CatalogingArchive",
                  "CatalogingEdit",
                ]}
                requireAnyRole
              >
                <Outlet />
              </RouteGate>
            ),
            children: [
              {
                path: "/lms/collections",
                element: <LMSCollections />,
              },
              {
                path: "/lms/collections/register",
                element: <LMSCollectionsRegister />,
              },
              {
                path: "/lms/collections/view/:id",
                element: <LMSCollectionsView />,
              },
              {
                path: "/lms/collections/edit/:id",
                element: <LMSCollectionsEdit />,
              },
            ],
          },
          {
            element: (
              <RouteGate
                requiredType="Staff"
                requiredRoles={[
                  "PatronAdd",
                  "PatronEdit",
                  "PatronArchive",
                  "VerifyIDs",
                ]}
                requireAnyRole
              >
                <Outlet />
              </RouteGate>
            ),
            children: [
              {
                path: "/lms/patrons",
                element: <LMSPatrons />,
              },
              {
                path: "/lms/patrons/view/:id",
                element: <LMSPatronsView />,
              },
            ],
          },
          {
            element: (
              <RouteGate requiredType="Staff" requiredRoles={["PatronAdd"]}>
                <Outlet />
              </RouteGate>
            ),
            children: [
              {
                path: "/lms/patrons/register",
                element: (
                  <GoogleReCaptchaProvider
                    reCaptchaKey={recaptchaSiteKey}
                  >
                    <LMSPatronsRegister />
                  </GoogleReCaptchaProvider>
                ),
              },
            ],
          },
          {
            element: (
              <RouteGate requiredType="Staff" requiredRoles={["VerifyIDs"]}>
                <Outlet />
              </RouteGate>
            ),
            children: [
              {
                path: "/lms/patrons/verifyIDs",
                element: <LMSPatronsVerify />,
              },
            ],
          },
          {
            element: (
              <RouteGate
                requiredType="Staff"
                requiredRoles={["StaffAdd", "StaffArchive", "StaffEdit"]}
              >
                <Outlet />
              </RouteGate>
            ),
            children: [
              {
                path: "/lms/staffs",
                element: <LMSStaffs />,
              },
              {
                path: "/lms/staffs/register",
                element: (
                  <GoogleReCaptchaProvider
                    reCaptchaKey={recaptchaSiteKey}
                  >
                    <LMSStaffsRegister />
                  </GoogleReCaptchaProvider>
                ),
              },
              {
                path: "/lms/staffs/view/:id",
                element: <LMSStaffsView />,
              },
            ],
          },
          {
            path: "/lms/reports",
            element: (
              <RouteGate
                requiredType="Staff"
                requiredRoles={["ReportGeneration"]}
                redirectToUnauthorized
              >
                <LMSReportsLayout />
              </RouteGate>
            ),
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: "overview", element: <LMSReportsOverview /> },
              { path: "circulation", element: <LMSReportsCirculation /> },
              { path: "collection", element: <LMSReportsCollection /> },
              { path: "patrons", element: <LMSReportsPatrons /> },
              { path: "reference-desk", element: <LMSReportsReferenceDesk /> },
              { path: "visits", element: <LMSReportsVisits /> },
            ],
          },
          {
            path: "/lms/library-desk",
            element: (
              <RouteGate
                requiredType="Staff"
                requiredRoles={["AnnouncementCreation", "LiveChat"]}
                requireAnyRole
                redirectToUnauthorized
              >
                <LMSLibraryDeskLayout />
              </RouteGate>
            ),
            children: [
              { index: true, element: <Navigate to="announcements" replace /> },
              {
                element: (
                  <RouteGate
                    requiredType="Staff"
                    requiredRoles={["AnnouncementCreation"]}
                  >
                    <Outlet />
                  </RouteGate>
                ),
                children: [
                  {
                    path: "announcements",
                    element: <LMSDeskAnnouncements key="announcements" />,
                  },
                  {
                    path: "announcements/view/:id",
                    element: <LMSDeskViewAnnouncement />,
                  },
                  { path: "news", element: <LMSDeskNews key="news" /> },
                  { path: "news/view/:id", element: <LMSDeskViewNews /> },
                ],
              },
              {
                element: (
                  <RouteGate requiredType="Staff" requiredRoles={["LiveChat"]}>
                    <Outlet />
                  </RouteGate>
                ),
                children: [
                  {
                    path: "conversations",
                    element: <LMSDeskConversations key="conversations" />,
                  },
                  {
                    path: "conversations/view/:id",
                    element: <LMSDeskViewConversation />,
                  },
                  {
                    path: "book-requests",
                    element: <LMSDeskBookRequests key="bookRequests" />,
                  },
                ],
              },
            ],
          },
          {
            path: "/lms/updates",
            element: <Navigate to="/lms/library-desk/announcements" replace />,
          },
          {
            path: "/lms/updates/:section",
            element: <Navigate to="/lms/library-desk/announcements" replace />,
          },
          {
            path: "/lms/chats",
            element: <Navigate to="/lms/library-desk/conversations" replace />,
          },
        ],
      },
      {
        path: "/unauthorized",
        element: <Unauthorized />,
      },
      {
        path: "/lms/unauthorized",
        element: <Unauthorized />,
      },
      {
        path: "/opac/unauthorized",
        element: <Unauthorized />,
      },
      {
        path: "*",
        element: <Navigate to="/opac/home" replace />,
      },
    ],
  },
]);
