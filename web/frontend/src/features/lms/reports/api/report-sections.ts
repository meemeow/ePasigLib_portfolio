import type { ReportSection } from "@/features/lms/reports/types/report-types";

export type ReportGroup = "Summary" | "Activity" | "Records";

export const REPORT_GROUPS: ReportGroup[] = ["Summary", "Activity", "Records"];

export interface ReportSectionConfig {
  section: ReportSection;
  label: string;
  slug: string;
  group: ReportGroup;
  blurb: string;
  print: string;
}

export const REPORT_SECTIONS: ReportSectionConfig[] = [
  {
    section: "overview",
    label: "Overview",
    slug: "overview",
    group: "Summary",
    blurb: "The headline numbers from every part of the library.",
    print: "Headline figures across circulation, the catalogue, patrons and the reference desk.",
  },
  {
    section: "circulation",
    label: "Circulation",
    slug: "circulation",
    group: "Activity",
    blurb: "Borrowing, returns, renewals and reservations.",
    print: "Loans, returns, renewals and reservations recorded in this period.",
  },
  {
    section: "reference-desk",
    label: "Reference Desk",
    slug: "reference-desk",
    group: "Activity",
    blurb: "Conversations, ratings and what patrons asked about.",
    print: "Live-chat conversations, what they were about, and how patrons rated them.",
  },
  {
    section: "visits",
    label: "Visits",
    slug: "visits",
    group: "Activity",
    blurb: "Door count, by day.",
    print: "Recorded visits to the library.",
  },
  {
    section: "collection",
    label: "Collection",
    slug: "collection",
    group: "Records",
    blurb: "What the library holds, and how it is classified.",
    print: "The catalogue as it stands: titles, physical copies and how they are classified.",
  },
  {
    section: "patrons",
    label: "Patrons",
    slug: "patrons",
    group: "Records",
    blurb: "Who is registered, and where they come from.",
    print: "The patron roll: registrations, verification states and residency.",
  },
];

export function sectionConfig(section: ReportSection): ReportSectionConfig {
  return (
    REPORT_SECTIONS.find((entry) => entry.section === section) ??
    REPORT_SECTIONS[0]
  );
}
