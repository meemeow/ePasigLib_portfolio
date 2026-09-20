import {
  BadgeCheck,
  BookCopy,
  BookPlus,
  BookUp,
  BookX,
  CalendarClock,
  Clock,
  DoorOpen,
  Layers,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Newspaper,
  Repeat,
  Star,
  TimerOff,
  Undo2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  ReportGrid,
  SectionCard,
  StatGrid,
  StatTile,
} from "@/features/lms/reports/components/ReportPieces";
import { useReports } from "@/features/lms/reports/api/reports-logic";

export default function ReportsOverview() {
  const { summary } = useReports();
  if (!summary) return null;

  const {
    circulation,
    collection,
    patrons,
    referenceDesk,
    bookRequests,
    publishing,
    visits,
  } = summary;

  return (
    <ReportGrid>
      <SectionCard
        title="Collection"
        icon={<BookCopy />}
        description="The catalogue as it stands."
        hasSnapshot
        fullRow
      >
        <StatGrid>
          <StatTile
            label="Titles"
            value={collection.titles}
            kind="now"
            icon={<BookCopy />}
          />
          <StatTile
            label="Copies"
            icon={<Layers />}
            value={collection.copies}
            kind="now"
          />
          <StatTile
            label="Added"
            icon={<BookPlus />}
            value={collection.added}
          />
          <StatTile
            label="Without copies"
            icon={<BookX />}
            value={collection.withoutCopies}
            hint="Catalogued, but nothing on the shelf to lend."
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="Circulation"
        icon={<Repeat />}
        description="What moved in this period, and what is out right now."
        hasSnapshot
      >
        <StatGrid wide={2}>
          <StatTile
            label="Borrowed"
            value={circulation.checkouts}
            icon={<BookUp />}
          />
          <StatTile
            label="Returned"
            value={circulation.returns}
            icon={<Undo2 />}
          />
          <StatTile
            label="Renewed"
            value={circulation.renewals}
            icon={<Repeat />}
          />
          <StatTile
            label="On loan"
            value={circulation.onLoanNow}
            kind="now"
            icon={<CalendarClock />}
            hint={
              circulation.overdueNow > 0
                ? `${circulation.overdueNow.toLocaleString()} overdue`
                : undefined
            }
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="Patrons"
        icon={<Users />}
        description="Who the library serves."
        hasSnapshot
      >
        <StatGrid wide={2}>
          <StatTile
            label="Registered"
            value={patrons.registered}
            icon={<UserPlus />}
          />
          <StatTile
            label="Verified"
            icon={<BadgeCheck />}
            value={patrons.verified}
          />
          <StatTile
            label="On the roll"
            value={patrons.total}
            kind="now"
            icon={<Users />}
          />
          <StatTile
            label="Awaiting review"
            icon={<Clock />}
            value={patrons.unverified}
            kind="now"
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="Reference desk"
        icon={<MessagesSquare />}
        description="Conversations opened in this period."
      >
        <StatGrid wide={2}>
          <StatTile
            label="Conversations"
            value={referenceDesk.conversations}
            icon={<MessagesSquare />}
          />
          <StatTile
            label="Messages"
            icon={<MessageSquare />}
            value={referenceDesk.messages}
          />
          <StatTile
            label="Average rating"
            value={
              referenceDesk.rated === 0
                ? "—"
                : referenceDesk.averageRating.toFixed(1)
            }
            icon={<Star />}
            hint={
              referenceDesk.rated === 0
                ? "Not yet rated"
                : `From ${referenceDesk.rated.toLocaleString()} rated`
            }
          />
          <StatTile
            label="Expired unanswered"
            icon={<TimerOff />}
            value={referenceDesk.expired}
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="Requests and publishing"
        icon={<Megaphone />}
        description="What patrons asked for, and what the desk put out."
      >
        <StatGrid wide={2}>
          <StatTile
            label="Book requests"
            value={bookRequests.total}
            icon={<BookUp />}
          />
          <StatTile
            label="Announcements"
            value={publishing.announcements}
            icon={<Megaphone />}
          />
          <StatTile label="News" icon={<Newspaper />} value={publishing.news} />
          <StatTile
            label="Visits"
            value={visits.logging ? visits.total : "—"}
            icon={<DoorOpen />}
            hint={visits.logging ? undefined : "Visit logging is off"}
          />
        </StatGrid>
      </SectionCard>
    </ReportGrid>
  );
}
