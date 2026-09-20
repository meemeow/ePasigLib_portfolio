import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Info, LogOut, ShieldX } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { Button } from "@/components/ui/Button";
import { LogoutModal } from "@/components/modals/LogoutModal";
import { Text } from "@/components/ui/Text";

function Page() {
  const { user, userType, logout, profile } = useAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isStaff = userType === "Staff";

  const copy = isStaff
    ? {
        title: "Access restricted",
        subtitle: "This page is not open to your librarian account.",
        message:
          "Your account is signed in, but it does not carry the role this page requires. Roles are set per librarian, so another member of staff may well be able to open it.",
        actionText: "Go to Staff Home",
      }
    : userType === "Patron"
      ? {
          title: "Access restricted",
          subtitle: "This page is not open to patron accounts.",
          message:
            "You are signed in as a patron. This page belongs to the library's staff system, which is why it cannot be opened from here.",
          actionText: "Go to Home",
        }
      : {
          title: "Sign-in required",
          subtitle: "This page is not open to guests.",
          message:
            "Nobody is signed in on this device, and this page is not part of the public catalogue. Signing in will take you straight back to it if your account has access.",
          actionText: "Go to Log In",
        };

  const handleHomeNavigation = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate(isStaff ? "/lms/home" : "/opac/home");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const accountName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "This device";

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10 font-[gothamLight] sm:px-8">
      <section className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-24px_rgba(0,48,103,0.45)]">
        <div className="flex items-center gap-3 bg-[#003067] px-5 py-4 sm:px-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white [&_svg]:size-5">
            <ShieldX />
          </span>
          <div className="min-w-0">
            <Text
              as="h1"
              className="font-[gothamMedium] text-base text-white sm:text-lg"
            >
              {copy.title}
            </Text>
            <Text className="mt-0.5 text-xs leading-relaxed text-white/70 sm:text-sm">
              {copy.subtitle}
            </Text>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {user ? (
            <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-2">
              <Text className="text-xs font-[gothamMedium] text-gray-500">
                {isStaff ? "Librarian" : "Patron"}
              </Text>
              <Text className="text-sm font-[gothamMedium] text-[#003067]">
                {accountName}
              </Text>
            </div>
          ) : null}

          <Text className="text-sm leading-relaxed text-gray-700">
            {copy.message}
          </Text>

          <div className="flex items-start gap-2 rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-[#128CF1]" />
            <Text className="text-xs leading-relaxed text-[#003067]">
              {user
                ? "If you were expecting access, ask a library administrator to check the roles on your account."
                : "Signing in with an account that has access will open this page."}
            </Text>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t bg-white px-5 py-4 sm:px-6">
          <Button
            onClick={handleHomeNavigation}
            className="w-full gap-2 bg-blue-600 font-[gothamMedium] text-white transition hover:bg-blue-700 sm:w-auto"
          >
            <Home className="size-4" />
            {copy.actionText}
          </Button>

          {user ? (
            <Button
              onClick={() => setLogoutOpen(true)}
              variant={null}
              className="w-full gap-2 rounded-md border border-red-200 bg-white font-[gothamMedium] text-red-600 transition hover:bg-red-50 sm:w-auto"
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          ) : null}
        </div>
      </section>

      <LogoutModal
        open={logoutOpen}
        accountName={accountName}
        accountLabel={isStaff ? "Librarian" : "Patron"}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        isProcessing={loggingOut}
      />
    </div>
  );
}

export default Page;
