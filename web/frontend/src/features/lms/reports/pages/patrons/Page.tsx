import {
  Archive,
  BadgeCheck,
  Clock,
  MapPin,
  UserCheck,
  UserPlus,
  UserX,
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

export default function ReportsPatrons() {
  const { summary } = useReports();
  if (!summary) return null;

  const p = summary.patrons;

  return (
    <ReportGrid>
      <SectionCard
        title="The roll"
        icon={<Users />}
        description="Registrations are for the selected period; everything else describes the roll as it stands."
        hasSnapshot
      >
        <StatGrid wide={2}>
          <StatTile
            label="Registered"
            value={p.registered}
            icon={<UserPlus />}
          />
          <StatTile
            label="On the roll"
            value={p.total}
            kind="now"
            icon={<Users />}
          />
          <StatTile
            label="Active"
            icon={<UserCheck />}
            value={p.active}
            kind="now"
          />
          <StatTile
            label="Archived"
            value={p.archived}
            kind="now"
            icon={<Archive />}
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="Verification"
        icon={<BadgeCheck />}
        description="Where each patron stands with their submitted ID."
        hasSnapshot
      >
        <StatGrid wide={2}>
          <StatTile
            label="Verified"
            value={p.verified}
            kind="now"
            icon={<BadgeCheck />}
          />
          <StatTile
            label="Awaiting review"
            value={p.unverified}
            kind="now"
            icon={<Clock />}
            hint="Signed up, nobody has looked at the ID yet."
          />
          <StatTile
            label="Rejected"
            value={p.rejected}
            kind="now"
            icon={<UserX />}
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="Residency"
        icon={<MapPin />}
        description="Derived from the city on the registration form, the same way the patron list does it."
      >
        <TallyList
          rows={p.residency}
          unit="Patrons"
          emptyMessage="Nobody is registered yet."
        />
      </SectionCard>

      <SectionCard
        title="Pasig barangays"
        icon={<MapPin />}
        description="Where the library's resident patrons live."
      >
        <TallyList
          rows={p.byBarangay}
          unit="Patrons"
          emptyMessage="No Pasig residents are registered yet."
        />
      </SectionCard>
    </ReportGrid>
  );
}
