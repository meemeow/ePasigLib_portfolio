import type { CollectionData } from "@/features/lms/collections/pages/view-collection/types/collections-view-types";

export interface MarcField {
  tag: string;
  indicators?: string;
  subfield: string;
  label: string;
  value: (record: CollectionData) => string;
  wide?: boolean;
}

export interface MarcBlock {
  id: string;
  label: string;
  title: string;
  caption: string;
  fields: MarcField[];
}

const listValue = (values?: string[]): string =>
  (values || []).filter(Boolean).join(", ");

export const MARC_BLOCKS: MarcBlock[] = [
  {
    id: "0xx",
    label: "0XX",
    title: "Numbers & Classification",
    caption: "How the item is identified in trade and shelved on the floor.",
    fields: [
      {
        tag: "020",
        subfield: "$a",
        label: "ISBN-10",
        value: (r) => r.ISBN10 || "",
      },
      {
        tag: "020",
        subfield: "$a",
        label: "ISBN-13",
        value: (r) => r.ISBN13 || "",
      },
      {
        tag: "082",
        indicators: "04",
        subfield: "$a",
        label: "Dewey Class Number",
        value: (r) => r.ClassCode || "",
      },
      {
        tag: "082",
        indicators: "04",
        subfield: "$b",
        label: "Item (Cutter) Number",
        value: (r) => r.CuttersTable || "",
      },
      {
        tag: "099",
        subfield: "$a",
        label: "Local Call Number",
        value: (r) => r.CallNumber || "",
      },
    ],
  },
  {
    id: "1xx",
    label: "1XX",
    title: "Main Entry",
    caption: "The person or body chiefly responsible for the work.",
    fields: [
      {
        tag: "100",
        indicators: "1_",
        subfield: "$a",
        label: "Main Author",
        value: (r) => r.MainAuthor || r.Author || "",
      },
    ],
  },
  {
    id: "2xx",
    label: "2XX",
    title: "Title & Publication",
    caption: "Title as it appears on the item, edition and imprint.",
    fields: [
      {
        tag: "245",
        indicators: "10",
        subfield: "$a",
        label: "Title Proper",
        value: (r) => r.CollectionTitle || "",
      },
      {
        tag: "245",
        indicators: "10",
        subfield: "$b",
        label: "Remainder of Title",
        value: (r) => r.SecondTitle || "",
      },
      {
        tag: "250",
        subfield: "$a",
        label: "Edition",
        value: (r) => r.Edition || "",
      },
      {
        tag: "260",
        subfield: "$a",
        label: "Place of Publication",
        value: (r) => r.PublicationPlace || "",
      },
      {
        tag: "260",
        subfield: "$b",
        label: "Publisher",
        value: (r) => r.Publisher || "",
      },
      {
        tag: "260",
        subfield: "$c",
        label: "Publication Year",
        value: (r) => r.PublicationYear || "",
      },
      {
        tag: "264",
        indicators: "_4",
        subfield: "$c",
        label: "Copyright Year",
        value: (r) => r.CopyrightYear || "",
      },
    ],
  },
  {
    id: "3xx",
    label: "3XX",
    title: "Physical Description",
    caption: "Extent, dimensions and the form the content takes.",
    fields: [
      {
        tag: "300",
        subfield: "$a",
        label: "Extent (Pages)",
        value: (r) => r.PageCount || "",
      },
      {
        tag: "300",
        subfield: "$a",
        label: "Preliminary Pages",
        value: (r) => r.PrePage || "",
      },
      {
        tag: "300",
        subfield: "$b",
        label: "Other Physical Details",
        value: (r) => r.Inclusion || r.IncludesSummary || "",
        wide: true,
      },
      {
        tag: "300",
        subfield: "$c",
        label: "Dimensions",
        value: (r) => r.Size || "",
      },
      {
        tag: "338",
        subfield: "$a",
        label: "Carrier / Material Type",
        value: (r) => r.MaterialType || "",
      },
    ],
  },
  {
    id: "4xx",
    label: "4XX",
    title: "Series Statement",
    caption: "The series this item belongs to, and where it sits in it.",
    fields: [
      {
        tag: "490",
        indicators: "0_",
        subfield: "$a",
        label: "Series Statement",
        value: (r) => r.SeriesTitle || "",
      },
      {
        tag: "490",
        indicators: "0_",
        subfield: "$v",
        label: "Volume",
        value: (r) => r.Volume || "",
      },
    ],
  },
  {
    id: "5xx",
    label: "5XX",
    title: "Notes",
    caption: "Free-text notes, summaries and how the copy was acquired.",
    fields: [
      {
        tag: "520",
        subfield: "$a",
        label: "Summary",
        value: (r) => r.Description || r.TitleDescription || "",
        wide: true,
      },
      {
        tag: "500",
        subfield: "$a",
        label: "General Note",
        value: (r) => r.GeneralNote || "",
        wide: true,
      },
      {
        tag: "541",
        subfield: "$a",
        label: "Source of Acquisition (Donor)",
        value: (r) => r.Donor || "",
      },
      {
        tag: "541",
        subfield: "$c",
        label: "Method of Acquisition",
        value: (r) => r.Acquisition || "",
      },
      {
        tag: "541",
        subfield: "$d",
        label: "Date of Acquisition",
        value: (r) => r.DateReceived || "",
      },
      {
        tag: "541",
        subfield: "$e",
        label: "Accession Number",
        value: (r) => listValue((r.Copies || []).map((copy) => copy.Accession)),
        wide: true,
      },
      {
        tag: "541",
        subfield: "$h",
        label: "Purchase Price",
        value: (r) => r.CostPrice || "",
      },
    ],
  },
  {
    id: "6xx7xx",
    label: "6XX/7XX",
    title: "Subjects & Added Entries",
    caption: "What the work is about, and who else is credited on it.",
    fields: [
      {
        tag: "650",
        indicators: "_4",
        subfield: "$a",
        label: "Subject Headings",
        value: (r) => listValue(r.Subjects),
        wide: true,
      },
      {
        tag: "700",
        indicators: "1_",
        subfield: "$a",
        label: "Joint Author / Editor / Illustrator",
        value: (r) => r.JointAuthor || "",
        wide: true,
      },
      {
        tag: "700",
        indicators: "1_",
        subfield: "$a",
        label: "Related Names",
        value: (r) => listValue(r.RelatedNames),
        wide: true,
      },
    ],
  },
];
