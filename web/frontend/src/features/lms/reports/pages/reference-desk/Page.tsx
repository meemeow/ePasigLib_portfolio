import {
  Archive,
  BookPlus,
  CheckCheck,
  CircleCheck,
  CircleSlash,
  CircleX,
  ClipboardList,
  Hourglass,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Newspaper,
  PencilLine,
  Reply,
  Send,
  Star,
  ThumbsUp,
  TimerOff,
  UserRound,
  Users,
} from "lucide-react";
import {
  ReportGrid,
  SectionCard,
  StatGrid,
  StatTile,
  TallyList,
} from "@/features/lms/reports/components/ReportPieces";
import { useReports } from "@/features/lms/reports/api/reports-logic";

export default function ReportsReferenceDesk() {
  const { summary } = useReports();
  if (!summary) return null;

  const d = summary.referenceDesk;
  const r = summary.bookRequests;
  const pub = summary.publishing;

  return (
    <ReportGrid>
      <SectionCard
        title="Conversations"
        icon={<MessagesSquare />}
        description="How many were opened in this period, and who opened them."
        fullRow
      >
        <StatGrid>
          <StatTile
            label="Conversations"
            value={d.conversations}
            icon={<MessagesSquare />}
          />
          <StatTile
            label="Messages"
            value={d.messages}
            icon={<MessageSquare />}
          />
          <StatTile
            label="From guests"
            value={d.fromGuests}
            icon={<UserRound />}
            hint="Nobody signed in — the form is all the context there is."
          />
          <StatTile
            label="From patrons"
            icon={<Users />}
            value={d.fromPatrons}
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="How they went"
        icon={<MessageSquare />}
        description="Where each conversation stands, and the concern the patron picked opening it."
      >
        <StatGrid wide={2}>
          <StatTile label="Waiting" icon={<Hourglass />} value={d.waiting} />
          <StatTile label="Active" icon={<MessageCircle />} value={d.active} />
          <StatTile label="Closed" icon={<CheckCheck />} value={d.closed} />
          <StatTile
            label="Expired"
            value={d.expired}
            icon={<TimerOff />}
            hint="Closed by the silence sweep, not by a librarian. Included in Closed."
          />
        </StatGrid>

        <div className="mt-4">
          <TallyList
            rows={d.byConcern}
            unit="Conversations"
            emptyMessage="No conversations were opened in this period."
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Ratings"
        icon={<Star />}
        description="What patrons said about the help they got."
      >
        <StatGrid wide={2}>
          <StatTile
            label="Average rating"
            value={d.rated === 0 ? "—" : d.averageRating.toFixed(1)}
            icon={<Star />}
            hint={
              d.rated === 0
                ? "Nobody has rated a conversation yet."
                : "Out of 5."
            }
          />
          <StatTile label="Rated" icon={<ThumbsUp />} value={d.rated} />
          <StatTile
            label="Not rated"
            icon={<CircleSlash />}
            value={Math.max(d.conversations - d.rated, 0)}
            hint="Rating is optional, and skipping it is a legitimate answer."
          />
        </StatGrid>

        <div className="mt-4">
          <TallyList
            rows={d.ratingSpread}
            unit="Ratings given"
            emptyMessage="No conversation in this period has been rated."
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Publishing"
        icon={<Megaphone />}
        description="What the desk put out in this period."
        fullRow
      >
        <StatGrid wide={3}>
          <StatTile
            label="Announcements"
            value={pub.announcements}
            icon={<Megaphone />}
          />
          <StatTile label="News" icon={<Newspaper />} value={pub.news} />
          <StatTile label="Published" icon={<Send />} value={pub.published} />
          <StatTile label="Drafts" icon={<PencilLine />} value={pub.drafts} />
          <StatTile label="Archived" icon={<Archive />} value={pub.archived} />
          <StatTile
            label="Replies"
            icon={<Reply />}
            value={pub.replies}
            hint="Left on announcements written in this period."
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="Book requests"
        icon={<BookPlus />}
        description="Titles patrons asked the library to buy."
        fullRow
      >
        <StatGrid>
          <StatTile label="Requests" value={r.total} icon={<BookPlus />} />
          <StatTile
            label="Under review"
            icon={<ClipboardList />}
            value={r.underReview}
          />
          <StatTile
            label="Approved"
            icon={<CircleCheck />}
            value={r.approved}
          />
          <StatTile label="Declined" icon={<CircleX />} value={r.declined} />
        </StatGrid>

        <div className="mt-4">
          <TallyList
            rows={r.topTitles}
            unit="Times requested"
            emptyMessage="No book requests in this period."
          />
        </div>
      </SectionCard>
    </ReportGrid>
  );
}
