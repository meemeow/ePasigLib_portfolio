import {
  AlarmClock,
  ArrowLeftRight,
  BookUp,
  CalendarCheck,
  CalendarClock,
  Handshake,
  PackageOpen,
  Repeat,
  ShieldAlert,
  Undo2,
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

export default function ReportsCirculation() {
  const { summary } = useReports();
  if (!summary) return null;

  const c = summary.circulation;

  return (
    <ReportGrid>
      <SectionCard
        title="Transactions"
        icon={<Repeat />}
        description="Every movement the desk recorded in this period."
        fullRow
      >
        <StatTile
          label="All transactions"
          icon={<ArrowLeftRight />}
          value={c.transactions}
          hint="Borrows, returns, renewals and reservations together."
        />

        <div className="mt-3">
          <StatGrid>
            <StatTile
              label="Borrowed"
              value={c.checkouts}
              icon={<BookUp />}
            />
            <StatTile label="Returned" value={c.returns} icon={<Undo2 />} />
            <StatTile label="Renewed" value={c.renewals} icon={<Repeat />} />
            <StatTile
              label="Reserved"
              value={c.reservations}
              icon={<Handshake />}
            />
          </StatGrid>
        </div>
      </SectionCard>

      <SectionCard
        title="At the desk right now"
        icon={<CalendarClock />}
        description="The state of the library at this moment, whatever period is selected."
        hasSnapshot
        fullRow
      >
        <StatGrid>
          <StatTile
            label="On loan"
            value={c.onLoanNow}
            kind="now"
            icon={<CalendarClock />}
          />
          <StatTile
            label="Overdue"
            value={c.overdueNow}
            kind="now"
            icon={<AlarmClock />}
            hint={
              c.overdueNow > 0
                ? "Past their due date and not yet back."
                : undefined
            }
          />
          <StatTile
            label="Due today"
            icon={<CalendarCheck />}
            value={c.dueTodayNow}
            kind="now"
          />
          <StatTile
            label="Awaiting pickup"
            icon={<PackageOpen />}
            value={c.onHoldNow}
            kind="now"
            hint="Reserved copies held at the desk."
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="Reservation outcomes"
        icon={<Handshake />}
        description="Where this period's reservations ended up."
      >
        <TallyList
          rows={c.reservationOutcomes}
          unit="Reservations"
          emptyMessage="No reservations were made in this period."
        />
      </SectionCard>

      <SectionCard
        title="Patron standing"
        icon={<ShieldAlert />}
        description="Where patrons sit on the sanction ladder at this moment, whatever period is selected. One overdue return steps a patron one rung, and a suspended account cannot borrow, reserve or renew."
        hasSnapshot
      >
        <TallyList
          rows={summary.patrons.standing}
          unit="Patrons"
          emptyMessage="Nobody has been verified to borrow yet."
        />
      </SectionCard>

      <SectionCard
        title="Most borrowed"
        icon={<BookUp />}
        description="Titles by number of check-outs in this period."
      >
        <TallyList
          rows={c.topTitles}
          unit="Check-outs"
          emptyMessage="Nothing was borrowed in this period."
        />
      </SectionCard>

      <SectionCard
        title="Most active borrowers"
        icon={<Users />}
        description="Patrons by number of check-outs in this period."
      >
        <TallyList
          rows={c.topBorrowers}
          unit="Check-outs"
          emptyMessage="Nobody borrowed in this period."
        />
      </SectionCard>
    </ReportGrid>
  );
}
