import { useMemo, useState } from "react";
import {
  BookDown,
  BookMarked,
  BookUp,
  ClipboardCheck,
  Library,
  RotateCw,
  Search,
  UserSearch,
  Users,
} from "lucide-react";
import QuickAccessRail from "@/features/lms/home/components/QuickAccessRail";
import GreetingBanner from "@/features/lms/home/components/GreetingBanner";
import StatCardsRow from "@/features/lms/home/components/StatCardsRow";
import TodaysOverview from "@/features/lms/home/components/TodaysOverview";
import DashboardCalendar from "@/features/lms/home/components/DashboardCalendar";
import QuickBookSearchModal from "@/features/lms/home/components/QuickBookSearchModal";
import QuickPatronSearchModal from "@/features/lms/home/components/QuickPatronSearchModal";
import { useHomePage } from "@/features/lms/home/api/home-logic";
import type {
  QuickAccessItem,
  StatTile,
} from "@/features/lms/home/types/home-types";

export default function LMSHome() {
  const {
    greeting,
    greetingEmoji,
    firstName,
    staffRoles,
    summary,
    summaryLoading,
    summaryError,
    retrySummary,
  } = useHomePage();

  const [isRailOpen, setIsRailOpen] = useState(true);
  const [bookSearchOpen, setBookSearchOpen] = useState(false);
  const [patronSearchOpen, setPatronSearchOpen] = useState(false);

  const quickAccess = useMemo<QuickAccessItem[]>(
    () => [
      {
        id: "check-out",
        label: "Check Out",
        icon: <BookUp className="size-4" />,
        to: "/lms/circulations/check-out",
        role: "Checkout",
      },
      {
        id: "check-in",
        label: "Check In",
        icon: <BookDown className="size-4" />,
        to: "/lms/circulations/check-in",
        role: "Checkin",
      },
      {
        id: "renew",
        label: "Renew",
        icon: <RotateCw className="size-4" />,
        to: "/lms/circulations/renew",
        role: "ApproveRenewals",
      },
      {
        id: "patron-search",
        label: "Patron Search",
        icon: <UserSearch className="size-4" />,
        onSelect: () => setPatronSearchOpen(true),
      },
      {
        id: "book-search",
        label: "Book Search",
        icon: <Search className="size-4" />,
        onSelect: () => setBookSearchOpen(true),
      },
    ],
    [],
  );

  const statTiles = useMemo<StatTile[]>(
    () => [
      {
        id: "totalBooks",
        label: "Total Books",
        value: summary?.totalBooks,
        icon: <Library className="size-5" />,
        to: "/lms/collections",
        linkLabel: "View collections",
      },
      {
        id: "activePatrons",
        label: "Active Patrons",
        value: summary?.activePatrons,
        icon: <Users className="size-5" />,
        to: "/lms/patrons",
        linkLabel: "View all",
      },
      {
        id: "booksBorrowed",
        label: "Books Borrowed",
        value: summary?.booksBorrowed,
        icon: <BookMarked className="size-5" />,
        to: "/lms/circulations/checkout-history",
        linkLabel: "View circulations",
      },
      {
        id: "pendingApprovals",
        label: "Pending Approvals",
        value: summary?.pendingApprovals.total,
        icon: <ClipboardCheck className="size-5" />,
        to: "/lms/circulations/reservation-approval",
        linkLabel: "View approvals",
      },
    ],
    [summary],
  );

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col font-[gothamLight] lg:flex-row">
      <QuickAccessRail
        items={quickAccess}
        staffRoles={staffRoles}
        open={isRailOpen}
        onOpenChange={setIsRailOpen}
      />

      <main className="flex flex-1 flex-col justify-center gap-6 overflow-y-auto p-5 sm:p-6 lg:p-8">
        <GreetingBanner
          greeting={greeting}
          greetingEmoji={greetingEmoji}
          firstName={firstName}
          railOpen={isRailOpen}
        />

        <div className="relative z-10 grid min-h-0 grid-cols-1 gap-6 2xl:max-h-[570px] 2xl:flex-1 2xl:grid-cols-3">
          <div className="flex min-h-0 flex-col gap-6 2xl:col-span-2">
            <StatCardsRow
              tiles={statTiles}
              loading={summaryLoading}
              error={summaryError}
              onRetry={retrySummary}
              railOpen={isRailOpen}
            />
            <TodaysOverview
              summary={summary}
              loading={summaryLoading}
              error={summaryError}
              onRetry={retrySummary}
              railOpen={isRailOpen}
            />
          </div>

          <DashboardCalendar />
        </div>
      </main>

      <QuickBookSearchModal
        open={bookSearchOpen}
        onClose={() => setBookSearchOpen(false)}
      />
      <QuickPatronSearchModal
        open={patronSearchOpen}
        onClose={() => setPatronSearchOpen(false)}
      />
    </div>
  );
}
