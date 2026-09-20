import { CalendarDays, DoorOpen, Info, Users } from "lucide-react";
import { Text } from "@/components/ui/Text";
import {
  ReportGrid,
  SectionCard,
  StatGrid,
  StatTile,
  TallyList,
} from "@/features/lms/reports/components/ReportPieces";
import { useReports } from "@/features/lms/reports/api/reports-logic";

export default function ReportsVisits() {
  const { summary } = useReports();
  if (!summary) return null;

  const v = summary.visits;

  if (!v.logging) {
    return (
      <ReportGrid>
        <SectionCard
          title="Visit logging is not running"
          icon={<Info />}
          fullRow
        >
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Info className="size-5" />
            </span>
            <Text className="font-[gothamMedium] text-[#011b38]">
              No visits are being recorded
            </Text>
            <Text className="max-w-md text-sm leading-relaxed text-gray-500">
              The door-count triggers are switched off, so the visits collection
              is empty. That is different from a quiet library: this report
              cannot tell you how many people came, and shows nothing rather
              than a zero that would read as a measurement.
            </Text>
            <Text className="max-w-md text-xs leading-relaxed text-gray-400">
              Turning the triggers back on starts filling this screen from that
              day forward. It cannot recover visits from before then.
            </Text>
          </div>
        </SectionCard>
      </ReportGrid>
    );
  }

  return (
    <ReportGrid>
      <SectionCard
        title="Door count"
        icon={<DoorOpen />}
        description="Recorded entries in this period."
        fullRow
      >
        <StatGrid wide={3}>
          <StatTile label="Visits" value={v.total} icon={<DoorOpen />} />
          <StatTile
            label="Unique visitors"
            value={v.uniqueVisitors}
            icon={<Users />}
            hint="One patron counts once however often they came."
          />
          <StatTile
            label="Busiest day"
            value={v.busiestDay ? v.busiestDay.date : "—"}
            icon={<CalendarDays />}
            hint={
              v.busiestDay
                ? `${v.busiestDay.count.toLocaleString()} visits`
                : undefined
            }
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="By day"
        icon={<CalendarDays />}
        description="Entries per day, oldest first."
        fullRow
      >
        <TallyList
          rows={v.byDay}
          unit="Visits"
          emptyMessage="No visits were recorded in this period."
        />
      </SectionCard>
    </ReportGrid>
  );
}
