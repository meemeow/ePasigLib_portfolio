import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/use-auth";
import { DEFAULT_AVATAR } from "@/lib/auth/auth-types";
import { useAppSection } from "@/hooks/use-app-section";
import { Button } from "@/components/ui/Button";
import { LogoutModal } from "@/components/modals/LogoutModal";
import { CountBadge } from "@/components/ui/CountBadge";
import { useNotificationSummary } from "@/hooks/use-notification-summary";
import { openChat } from "@/features/opac/chat/api/chat-launcher";
import { NotificationModal } from "@/components/modals/NotificationModal";
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Bell,
  Eye,
  MailCheck,
  UserRound,
  LogOut,
  Home,
  BookCopy,
  Users,
  UserCog,
  Repeat,
  MessagesSquare,
  BarChart3,
  Newspaper,
  Info,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { Text } from "@/components/ui/Text";
import { callCirculation as callable } from "@/lib/api/callables";

type AnyRecord = Record<string, unknown>;

interface NotificationRow {
  id: string;
  title: string;
  content: string;
  read: boolean;
  date: string;
}

interface NavItem {
  name: string;
  path: string;
  match?: string;
}

const NAV_ICONS: Record<string, LucideIcon> = {
  Home: Home,
  Collections: BookCopy,
  Patrons: Users,
  Librarians: UserCog,
  Circulations: Repeat,
  "Library Desk": MessagesSquare,
  Reports: BarChart3,
  Updates: Newspaper,
  About: Info,
};

const NOTIF_ROUND_ACTION =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-[#003067] transition hover:border-[#128CF1] hover:bg-[#EAF4FE] hover:text-[#128CF1] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:text-[#003067] outline-none";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useAppSection();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [notifDetail, setNotifDetail] = useState<NotificationRow | null>(null);
  const [markingOne, setMarkingOne] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const { user, logout, userType, profile, staffRoles } = useAuth();

  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!dropdownOpen && !notificationsOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target) &&
        !notifDetail
      ) {
        setNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDropdownOpen(false);
      if (!notifDetail) setNotificationsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen, notificationsOpen, notifDetail]);

  const isStaff = userType === "Staff";
  const isPatron = userType === "Patron";

  const hasCatalogingRoles =
    isStaff &&
    (staffRoles?.CatalogingAdd ||
      staffRoles?.CatalogingArchive ||
      staffRoles?.CatalogingEdit);

  const hasPatronRoles =
    isStaff &&
    (staffRoles?.PatronAdd ||
      staffRoles?.PatronEdit ||
      staffRoles?.PatronArchive ||
      staffRoles?.VerifyIDs);

  const hasStaffRoles =
    isStaff &&
    staffRoles?.StaffAdd &&
    staffRoles?.StaffArchive &&
    staffRoles?.StaffEdit;

  const hasReportGeneration = isStaff && staffRoles?.ReportGeneration;
  const hasLiveChat = isStaff && staffRoles?.LiveChat;
  const hasAnnouncementCreation = isStaff && staffRoles?.AnnouncementCreation;

  const guestNavItems: NavItem[] = [
    { name: "Home", path: "/opac/home" },
    { name: "Collections", path: "/opac/collections" },
    { name: "Updates", path: "/opac/news_announcements" },
    { name: "About", path: "/opac/about" },
  ];

  const patronNavItems = [...guestNavItems];

  const staffNavItems: NavItem[] = [
    { name: "Home", path: "/lms/home" },
    ...(hasCatalogingRoles
      ? [{ name: "Collections", path: "/lms/collections" }]
      : []),
    ...(hasPatronRoles ? [{ name: "Patrons", path: "/lms/patrons" }] : []),
    ...(hasStaffRoles ? [{ name: "Librarians", path: "/lms/staffs" }] : []),
    { name: "Circulations", path: "/lms/circulations" },
    ...(hasAnnouncementCreation || hasLiveChat
      ? [
          {
            name: "Library Desk",
            path: hasAnnouncementCreation
              ? "/lms/library-desk/announcements"
              : "/lms/library-desk/conversations",
            match: "/lms/library-desk",
          },
        ]
      : []),
    ...(hasReportGeneration ? [{ name: "Reports", path: "/lms/reports" }] : []),
  ];

  const navItems = isStaff
    ? staffNavItems
    : isPatron
      ? patronNavItems
      : guestNavItems;

  const isNavItemActive = (item: NavItem, fallback: boolean) =>
    item.match
      ? pathname === item.match || pathname.startsWith(`${item.match}/`)
      : fallback;

  const avatar = profile?.avatar || DEFAULT_AVATAR;
  const firstName = profile?.firstName || "User";

  const {
    unread,
    unreadUpdates,
    unreadChats,
    refresh: refreshCounts,
    markAllRead,
  } = useNotificationSummary();
  const bellCount = unread + unreadChats;

  const NOTIF_PAGE = 6;
  const [notifItems, setNotifItems] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMoreLoading, setNotifMoreLoading] = useState(false);
  const [notifCursor, setNotifCursor] = useState<string | null>(null);
  const [notifHasMore, setNotifHasMore] = useState(false);

  const loadNotifications = useCallback(
    async (initial: boolean) => {
      if (!isPatron || !user) return;
      if (initial) setNotifLoading(true);
      else setNotifMoreLoading(true);

      try {
                const res = await callable({
          case: "fetch_notifications",
          target: "patrons",
          uid: user.uid,
          scope: "personal",
          limit: NOTIF_PAGE,
          lastDocId: initial ? null : notifCursor,
        });
        const payload = (res.data ?? {}) as AnyRecord;
        const rows = (payload.notifications ?? []) as AnyRecord[];
        const mapped = rows.map((row) => ({
          id: String(row.id ?? ""),
          title: String(row.title ?? ""),
          content: String(row.content ?? ""),
          read: Boolean(row.read),
          date: row.date
            ? new Date(String(row.date)).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "",
        }));

        setNotifItems((current) =>
          initial
            ? mapped
            :
              [
                ...current,
                ...mapped.filter(
                  (row) => !current.some((seen) => seen.id === row.id),
                ),
              ],
        );
        setNotifCursor(payload.lastDocId ? String(payload.lastDocId) : null);
        setNotifHasMore(Boolean(payload.hasMore));
      } catch (error) {
        console.error("Failed to read notifications:", error);
      } finally {
        setNotifLoading(false);
        setNotifMoreLoading(false);
      }
    },
    [isPatron, user, notifCursor],
  );

  const markOneRead = useCallback(
    async (id: string) => {
      if (!isPatron || !user || !id) return;
      setMarkingOne(true);
      setNotifItems((rows) =>
        rows.map((row) => (row.id === id ? { ...row, read: true } : row)),
      );
      setNotifDetail((current) =>
        current && current.id === id ? { ...current, read: true } : current,
      );
      try {
                await callable({
          case: "mark_notification_read",
          target: "patrons",
          uid: user.uid,
          id,
        });
      } catch (error) {
        console.error("Could not mark the notification read:", error);
      } finally {
        setMarkingOne(false);
        await refreshCounts();
      }
    },
    [isPatron, user, refreshCounts],
  );

  useEffect(() => {
    if (!notificationsOpen) return;
    void loadNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsOpen, isPatron, user]);

  const askLogout = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    setLogoutOpen(true);
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

  const handleContactUs = () => {
    navigate("/opac/about#visit-us");
  };

  const navRowClass = isStaff ? "min-[1450px]:flex" : "xl:flex";
  const navBurgerClass = isStaff ? "min-[1450px]:hidden" : "xl:hidden";

  return (
    <nav className="sticky top-0 z-50 w-full h-20 bg-white shadow-md">
      <div className="mx-[1.5%] xl:mx-[2%] h-full px-4 py-2 flex items-center justify-between">
        <div
          onClick={() => navigate(isStaff ? "/lms/home" : "/opac/home")}
          className="cursor-pointer flex-shrink-0 max-sm:ml-2"
        >
          <picture>
            <source
              media="(min-width: 1536px)"
              srcSet="/assets/images/PKC_with_text2.png"
            />
            <source
              media="(max-width: 639px)"
              srcSet="/assets/images/PKC_logo2.png"
            />
            <source
              media="(max-width: 1449px)"
              srcSet="/assets/images/PKC_with_text2.png"
            />
            <img
              src={
                isStaff
                  ? "/assets/images/PKC_logo2.png"
                  : "/assets/images/PKC_with_text2.png"
              }
              alt="Pasig Knowledge Center"
              className={`block h-11 w-auto 2xl:h-12 ${
                isStaff ? "min-[640px]:max-[1450px]:h-12" : "min-[640px]:h-12"
              }`}
            />
          </picture>
        </div>

        <div className="flex items-center justify-end gap-5 flex-grow">
          <div className={`hidden ${navRowClass} gap-2 items-center`}>
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `relative text-[#0d2e66] hover:bg-sky-500 hover:text-white rounded-sm font-[GothamMedium] text-[16px] h-14 w-fit px-5 flex items-center justify-center transition ${
                    isNavItemActive(item, isActive)
                      ? "text-sky-600 underline"
                      : ""
                  }`
                }
              >
                {item.name}
                {item.name === "Updates" ? (
                  <CountBadge
                    count={unreadUpdates}
                    className="right-0.5 top-2"
                  />
                ) : null}
              </NavLink>
            ))}

            {(isPatron || !user) && (
              <button
                onClick={handleContactUs}
                className="text-[#0d2e66] hover:bg-sky-500 hover:text-white rounded-sm font-[GothamMedium] text-[16px] h-14 w-fit px-5 flex items-center justify-center transition"
              >
                Contact Us
              </button>
            )}
          </div>

          {isPatron && (
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  if (!notificationsOpen) refreshCounts();
                  setNotificationsOpen(!notificationsOpen);
                }}
                className="relative rounded-full p-2 transition hover:bg-[#EAF4FE]"
                aria-label={
                  bellCount > 0
                    ? `Notifications, ${bellCount} unread`
                    : "Notifications"
                }
                aria-expanded={notificationsOpen}
              >
                <Bell className="size-[23px] text-[#0d2e66]" />
                <CountBadge count={bellCount} />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[min(28rem,calc(100vw-7rem))] rounded-lg border border-blue-100 bg-white p-1 shadow-lg">
                  <span className="block px-4 py-1.5 text-[10px] font-[gothamMedium] uppercase tracking-widest text-gray-400">
                    Notifications
                  </span>

                  <div className="px-1 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        openChat("librarian");
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                        unreadChats > 0
                          ? "border-[#128CF1]/20 bg-[#EAF4FE] hover:border-[#128CF1]/40 hover:bg-[#DCEDFD]"
                          : "border-gray-200 bg-white hover:border-[#128CF1]/30 hover:bg-[#F6FAFF]"
                      }`}
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                          unreadChats > 0
                            ? "bg-[#128CF1] text-white"
                            : "bg-[#EAF4FE] text-[#128CF1]"
                        }`}
                      >
                        <MessagesSquare className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <Text className="text-sm font-[gothamMedium] text-[#011b38]">
                          {unreadChats === 1
                            ? "1 unread conversation"
                            : `${unreadChats} unread conversations`}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {unreadChats > 0
                            ? "Open the conversation to read the desk's reply."
                            : "Nothing waiting. Open the chat to ask a librarian."}
                        </Text>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-gray-400" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-4 py-1.5">
                    <span className="text-[10px] font-[gothamMedium] uppercase tracking-widest text-gray-400">
                      Latest
                    </span>
                    {unread > 0 ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await markAllRead("personal");
                          setNotifItems((rows) =>
                            rows.map((row) => ({ ...row, read: true })),
                          );
                        }}
                        className="text-[10px] font-[gothamMedium] uppercase tracking-widest text-[#128CF1] transition-colors hover:text-[#0F57B5]"
                      >
                        Mark all as read
                      </button>
                    ) : null}
                  </div>

                  <div className="max-h-[19.5rem] overflow-y-auto px-1 pb-1">
                    {notifItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
                        <Text className="text-sm text-gray-500">
                          {notifLoading
                            ? "Loading your notifications…"
                            : "No new notifications"}
                        </Text>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {notifItems.map((item) => (
                          <div
                            key={item.id}
                            className={`px-3 py-3 ${
                              item.read ? "" : "bg-[#EAF4FE]/60"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                aria-hidden
                                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                  item.read ? "bg-transparent" : "bg-[#128CF1]"
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <Text className="text-sm font-[gothamMedium] text-[#011b38]">
                                  {item.title}
                                </Text>
                                <Text className="line-clamp-2 text-xs leading-relaxed text-gray-600">
                                  {item.content}
                                </Text>
                                {item.date ? (
                                  <Text className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                                    {item.date}
                                  </Text>
                                ) : null}
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5 self-center">
                                <button
                                  type="button"
                                  onClick={() => setNotifDetail(item)}
                                  className={NOTIF_ROUND_ACTION}
                                  aria-label={`View "${item.title}"`}
                                  title="View"
                                >
                                  <Eye className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void markOneRead(item.id)}
                                  disabled={item.read}
                                  className={NOTIF_ROUND_ACTION}
                                  aria-label={
                                    item.read
                                      ? `"${item.title}" is already read`
                                      : `Mark "${item.title}" as read`
                                  }
                                  title={
                                    item.read ? "Already read" : "Mark as read"
                                  }
                                >
                                  <MailCheck className="size-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {notifHasMore ? (
                      <button
                        type="button"
                        onClick={() => void loadNotifications(false)}
                        disabled={notifMoreLoading}
                        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-100 px-3 py-2.5 text-xs font-[gothamMedium] text-[#128CF1] transition-colors hover:bg-[#EAF4FE] disabled:cursor-default disabled:text-gray-400 disabled:hover:bg-transparent"
                      >
                        {notifMoreLoading ? "Loading…" : "Load more"}
                        {notifMoreLoading ? null : (
                          <ChevronDown className="size-3.5" />
                        )}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-1 border-t border-blue-100 pt-1">
                    <NavLink
                      to="/opac/news_announcements"
                      onClick={() => setNotificationsOpen(false)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[#EAF4FE]"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1]">
                        <Newspaper className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-[gothamMedium] text-[#011b38]">
                        View all Updates
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-gray-400" />
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={`hidden ${navRowClass} items-center gap-3 relative`}>
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 font-bold hover:bg-gray-50 rounded-lg px-3 py-2 transition"
                >
                  <img
                    src={avatar}
                    alt="Profile"
                    className="w-10 h-10 rounded-full border-2 border-[#0d2e66] hover:border-sky-500 object-cover transition"
                  />
                  <span className="font-bold text-[#0d2e66]">{firstName}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#0d2e66] transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-blue-100 bg-white p-1 shadow-lg">
                    <span className="block px-4 py-1.5 text-[10px] font-[gothamMedium] uppercase tracking-widest text-gray-400">
                      Account
                    </span>

                    <div className="flex flex-col divide-y divide-blue-100">
                      <NavLink
                        to={isStaff ? "/lms/profile" : "/opac/profile"}
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[#EAF4FE]"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1]">
                          <UserRound className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-[gothamMedium] text-[#011b38]">
                          Profile
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-gray-400" />
                      </NavLink>

                      <button
                        type="button"
                        onClick={askLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-red-50"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                          <LogOut className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-[gothamMedium] text-red-600">
                          Logout
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                className="p-5 text-[#128CF1] border border-[#128CF1] rounded-full hover:bg-sky-500 hover:text-white font-[GothamMedium] transition"
              >
                LOG IN
              </Button>
            )}
          </div>

          <div className={`${navBurgerClass} flex items-center`}>
            <button
              className="p-2 rounded-md focus:outline-none"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-7 h-7" />
              ) : (
                <Menu className="w-7 h-7" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={`${navBurgerClass} fixed inset-0 z-[60] flex flex-col`}>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-[#011b38]/50"
          />

          <div className="relative flex max-h-full w-full flex-col overflow-hidden rounded-b-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-blue-100 px-5 py-4">
              <span className="text-[10px] font-[gothamMedium] uppercase tracking-widest text-gray-400">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="flex size-9 items-center justify-center rounded-lg text-[#003067] transition-colors hover:bg-[#EAF4FE]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {navItems.map((item) => {
                const Icon = NAV_ICONS[item.name] ?? Home;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                        isNavItemActive(item, isActive)
                          ? "bg-[#EAF4FE]"
                          : "hover:bg-[#EAF4FE]"
                      }`
                    }
                  >
                    {({ isActive }) => {
                      const active = isNavItemActive(item, isActive);
                      return (
                        <>
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              active
                                ? "bg-[#128CF1] text-white"
                                : "bg-[#EAF4FE] text-[#128CF1]"
                            }`}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-[gothamMedium] text-[#011b38]">
                            {item.name}
                          </span>
                          {item.name === "Updates" && unreadUpdates > 0 ? (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-[gothamBlack] text-white">
                              {unreadUpdates > 99 ? "99+" : unreadUpdates}
                            </span>
                          ) : null}
                          <ChevronRight className="size-4 shrink-0 text-gray-400" />
                        </>
                      );
                    }}
                  </NavLink>
                );
              })}

              {(isPatron || !user) && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleContactUs();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[#EAF4FE]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1]">
                    <Phone className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-[gothamMedium] text-[#011b38]">
                    Contact Us
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-gray-400" />
                </button>
              )}
            </div>

            <div className="shrink-0 border-t border-blue-100 bg-white p-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-1 pb-3">
                    <img
                      src={avatar}
                      alt=""
                      className="size-10 shrink-0 rounded-full border-2 border-[#0d2e66] object-cover"
                    />
                    <div className="min-w-0">
                      <Text className="truncate text-sm font-[gothamMedium] text-[#011b38]">
                        {firstName} {profile?.lastName}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {isStaff ? "Librarian" : "Patron"}
                      </Text>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <NavLink
                      to={isStaff ? "/lms/profile" : "/opac/profile"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#128CF1] py-2.5 text-sm font-[gothamMedium] text-[#128CF1] transition hover:bg-[#EAF4FE]"
                    >
                      <UserRound className="size-4" />
                      Profile
                    </NavLink>
                    <button
                      type="button"
                      onClick={askLogout}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-sm font-[gothamMedium] text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/login");
                  }}
                  className="w-full rounded-lg border border-[#128CF1] bg-white py-2.5 font-[gothamMedium] text-[#128CF1] transition hover:bg-[#EAF4FE]"
                >
                  LOG IN
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <NotificationModal
        open={Boolean(notifDetail)}
        notification={notifDetail}
        onClose={() => setNotifDetail(null)}
        onMarkRead={
          notifDetail && !notifDetail.read
            ? () => void markOneRead(notifDetail.id)
            : undefined
        }
        isProcessing={markingOne}
      />

      <LogoutModal
        open={logoutOpen}
        accountName={
          profile?.firstName
            ? `${profile.firstName} ${profile?.lastName ?? ""}`.trim()
            : firstName
        }
        accountLabel={isStaff ? "Librarian" : "Patron"}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        isProcessing={loggingOut}
      />
    </nav>
  );
}
