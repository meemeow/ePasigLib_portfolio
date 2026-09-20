import {
  Archive,
  BookCopy,
  BookPlus,
  BookX,
  CircleCheck,
  Layers,
  MapPin,
  PackageOpen,
  PackageX,
  Percent,
  Shapes,
} from "lucide-react";
import {
  ReportGrid,
  SectionCard,
  StatGrid,
  StatTile,
  TallyList,
} from "@/features/lms/reports/components/ReportPieces";
import { useReports } from "@/features/lms/reports/api/reports-logic";

export default function ReportsCollection() {
  const { summary } = useReports();
  if (!summary) return null;

  const c = summary.collection;

  return (
    <ReportGrid>
      <SectionCard
        title="Holdings"
        icon={<BookCopy />}
        description="Titles are catalogue records; copies are the physical things on the shelves."
        hasSnapshot
        fullRow
      >
        <StatGrid>
          <StatTile
            label="Titles"
            value={c.titles}
            kind="now"
            icon={<BookCopy />}
          />
          <StatTile
            label="Copies"
            value={c.copies}
            kind="now"
            icon={<Layers />}
          />
          <StatTile
            label="Available"
            icon={<CircleCheck />}
            value={c.available}
            kind="now"
            hint="Copies not marked archived."
          />
          <StatTile
            label="On loan"
            value={c.borrowed}
            kind="now"
            icon={<PackageOpen />}
            hint="Counted from live loans, not from a flag on the copy."
          />
        </StatGrid>

        <div className="mt-3">
          <StatGrid wide={3}>
            <StatTile
              label="Added"
              value={c.added}
              icon={<BookPlus />}
              hint="Catalogued in this period."
            />
            <StatTile
              label="Titles archived"
              value={c.archived}
              kind="now"
              icon={<Archive />}
            />
            <StatTile
              label="Copies archived"
              icon={<PackageX />}
              value={c.archivedCopies}
              kind="now"
              hint="Individual copies withdrawn — a different thing from a withdrawn title."
            />
          </StatGrid>
        </div>
      </SectionCard>

      <SectionCard
        title="Titles without copies"
        icon={<PackageOpen />}
        description="Catalogued records with nothing on the shelf against them."
        hasSnapshot
      >
        <StatGrid wide={2}>
          <StatTile
            label="Titles without copies"
            icon={<BookX />}
            value={c.withoutCopies}
            kind="now"
            hint="Findable in the OPAC, impossible to borrow."
          />
          <StatTile
            label="Share of the catalogue"
            icon={<Percent />}
            value={
              c.titles === 0
                ? "—"
                : `${Math.round((c.withoutCopies / c.titles) * 100)}%`
            }
            kind="now"
          />
        </StatGrid>
      </SectionCard>

      <SectionCard
        title="By material type"
        icon={<Shapes />}
        description="Titles per format."
      >
        <TallyList
          rows={c.byMaterialType}
          unit="Titles"
          emptyMessage="Nothing catalogued yet."
        />
      </SectionCard>

      <SectionCard
        title="By class code"
        icon={<Layers />}
        description="Titles per classification."
      >
        <TallyList
          rows={c.byClassCode}
          unit="Titles"
          emptyMessage="Nothing catalogued yet."
        />
      </SectionCard>

      <SectionCard
        title="By section"
        icon={<MapPin />}
        description="Where the copies physically sit."
      >
        <TallyList
          rows={c.bySection}
          unit="Copies"
          emptyMessage="No copies are assigned to a section."
        />
      </SectionCard>
    </ReportGrid>
  );
}
