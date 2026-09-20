import { useMemo, useState } from "react";
import {
  BookOpen,
  BookPlus,
  FilePenLine,
  Info,
  Package,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";
import {
  defaultCollectionImage,
  type CollectionFormData,
} from "@/features/lms/collections/pages/register-collection/types/collections-register-types";

type FieldKey = keyof CollectionFormData;

interface ReviewField {
  label: string;
  field?: FieldKey;
  span?: string;
  derive?: (data: CollectionFormData) => string;
}

interface ReviewSection {
  title: string;
  icon: LucideIcon;
  fields: ReviewField[];
}

function display(input: unknown): string {
  if (Array.isArray(input)) return input.length > 0 ? input.join(", ") : "";
  return input === undefined || input === null ? "" : String(input);
}

function authorsOf(data: CollectionFormData): string {
  return [data.MainAuthor, data.JointAuthor, data.Author]
    .filter((name, index, all) => name && all.indexOf(name) === index)
    .join(", ");
}

const SECTIONS: ReviewSection[] = [
  {
    title: "Classification",
    icon: Tag,
    fields: [
      { label: "Class Code", field: "ClassCode" },
      { label: "Call Number", field: "CallNumber" },
      { label: "Cutters Table", field: "CuttersTable" },
      { label: "Subjects", field: "Subjects" },
      { label: "Related Names", field: "RelatedNames" },
      {
        label: "Title Description",
        field: "TitleDescription",
        span: "col-span-2 lg:col-span-3",
      },
    ],
  },
  {
    title: "Publication",
    icon: BookOpen,
    fields: [
      { label: "Publisher", field: "Publisher" },
      { label: "Place", field: "PublicationPlace" },
      { label: "Year", field: "PublicationYear" },
      { label: "Copyright", field: "CopyrightYear" },
      { label: "Series Title", field: "SeriesTitle" },
    ],
  },
  {
    title: "Physical & Acquisition",
    icon: Package,
    fields: [
      { label: "Size", field: "Size" },
      { label: "Inclusion", field: "Inclusion" },
      { label: "Date Received", field: "DateReceived" },
      { label: "Acquisition", field: "Acquisition" },
      { label: "Cost Price", field: "CostPrice" },
      { label: "Donor", field: "Donor" },
    ],
  },
  {
    title: "Additional",
    icon: Info,
    fields: [
      { label: "ISBN-13", field: "ISBN13" },
      { label: "ISBN-10", field: "ISBN10" },
      { label: "Edition", field: "Edition" },
      { label: "Volume", field: "Volume" },
      { label: "Material Type", field: "MaterialType" },
      { label: "Page Count", field: "PageCount" },
      { label: "Preliminary Page", field: "PrePage" },
      { label: "General Note", field: "GeneralNote" },
    ],
  },
];

function ReviewValue({
  before,
  after,
  comparing,
}: {
  before: string;
  after: string;
  comparing: boolean;
}) {
  if (comparing && before !== after) {
    return (
      <span className="flex flex-col gap-0.5">
        <span className="font-[gothamMedium] text-green-700">
          {after || "N/A"}
        </span>
        <span className="text-xs text-gray-400 line-through">
          {before || "N/A"}
        </span>
      </span>
    );
  }

  return (
    <span className={after ? "text-[#003067]" : "text-gray-400"}>
      {after || "N/A"}
    </span>
  );
}

function FieldCell({
  spec,
  data,
  original,
}: {
  spec: ReviewField;
  data: CollectionFormData;
  original: CollectionFormData | null;
}) {
  const read = (source: CollectionFormData): string =>
    spec.derive
      ? spec.derive(source)
      : spec.field
        ? display(source[spec.field])
        : "";

  const after = read(data);

  return (
    <div className={`min-w-0 ${spec.span || ""}`}>
      <dt className="text-[11px] font-[gothamMedium] text-gray-400">
        {spec.label}
      </dt>
      <dd className="mt-0.5 font-[gothamLight] text-sm break-words">
        <ReviewValue
          before={original ? read(original) : after}
          after={after}
          comparing={original !== null}
        />
      </dd>
    </div>
  );
}

interface CollectionReviewModalProps {
  data: CollectionFormData;
  originalData?: CollectionFormData;
  onClose: () => void;
  onSubmit: () => Promise<void> | void;
}

export function CollectionReviewModal({
  data,
  originalData,
  onClose,
  onSubmit,
}: CollectionReviewModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const original = originalData ?? null;
  const isEdit = original !== null;

  const changedCount = useMemo(() => {
    if (!original) return 0;
    const keys = Object.keys(data) as FieldKey[];
    return keys.filter((key) => display(original[key]) !== display(data[key]))
      .length;
  }, [original, data]);

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      await onSubmit();
    } finally {
      setIsProcessing(false);
    }
  };

  const nothingChanged = isEdit && changedCount === 0;
  const coverChanged =
    isEdit && original.CollectionImage !== data.CollectionImage;
  const summary = display(data.Description);

  return (
    <ModalShell
      open
      size="lg"
      title={isEdit ? "Collection Changes" : "Collection Summary"}
      description={
        isEdit
          ? "Updated values are shown in green with the previous value struck through."
          : "Review every detail before adding this collection to the catalogue."
      }
      icon={
        isEdit ? (
          <FilePenLine className="size-5" />
        ) : (
          <BookPlus className="size-5" />
        )
      }
      onClose={isProcessing ? undefined : onClose}
      bodyClassName="bg-gray-50"
      footerLeft={
        <Text className="text-xs text-gray-500">
          {!isEdit
            ? "Anything wrong? Go back and edit before registering."
            : changedCount === 0
              ? "No changes detected."
              : `${changedCount} field${changedCount === 1 ? "" : "s"} changed.`}
        </Text>
      }
      actions={
        <>
          <Button
            onClick={onClose}
            variant="cancel"
            className="w-auto md:w-[100px]"
            disabled={isProcessing}
          >
            Edit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || nothingChanged}
            className={`w-auto md:w-[150px] ${
              isProcessing || nothingChanged
                ? "cursor-not-allowed bg-gray-300 text-white"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isProcessing
              ? isEdit
                ? "Updating..."
                : "Registering..."
              : isEdit
                ? "Update Collection"
                : "Register"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {nothingChanged && (
          <div className="flex items-center gap-2 rounded-lg bg-[#EAF4FE] px-4 py-3">
            <Info className="size-4 shrink-0 text-[#128CF1]" />
            <Text className="text-xs text-[#0B2545] md:text-sm">
              Nothing has changed yet — go back and edit a field first.
            </Text>
          </div>
        )}

        <section className="rounded-2xl bg-gradient-to-br from-[#D9E9FB] to-[#F0F6FE] p-5 sm:p-6">
          <div className="mx-auto mb-4 w-[116px] sm:float-right sm:mb-2 sm:ml-6 sm:w-[132px]">
            <img
              src={data.CollectionImage || defaultCollectionImage}
              alt="Collection cover"
              className="aspect-[2/3] w-full rounded-xl border-4 border-white object-cover shadow-lg"
            />
            {coverChanged && (
              <Text className="mt-2 text-center text-[11px] font-[gothamMedium] text-green-700">
                Cover changed
              </Text>
            )}
          </div>

          <div>
            <div className="min-w-0 space-y-2 text-center sm:text-left">
              <Text className="text-xl leading-snug font-[gothamBlack] text-[#011b38] md:text-2xl">
                <ReviewValue
                  before={original ? display(original.CollectionTitle) : ""}
                  after={display(data.CollectionTitle) || "Untitled"}
                  comparing={isEdit}
                />
              </Text>

              <Text className="font-[gothamLight] text-sm text-gray-600">
                by{" "}
                <ReviewValue
                  before={original ? authorsOf(original) : ""}
                  after={authorsOf(data) || "Unknown author"}
                  comparing={isEdit}
                />
              </Text>

              <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white/70 px-3 py-1.5">
                <Text className="shrink-0 text-[11px] font-[gothamMedium] text-gray-500">
                  Second Title:
                </Text>
                <Text className="truncate font-[gothamLight] text-xs">
                  <ReviewValue
                    before={original ? display(original.SecondTitle) : ""}
                    after={display(data.SecondTitle)}
                    comparing={isEdit}
                  />
                </Text>
              </div>
            </div>

            <div className="mt-4">
              <Text className="text-[11px] font-[gothamMedium] tracking-wide text-[#5B7BA0] uppercase">
                Summary
              </Text>
              <Text className="mt-1 font-[gothamLight] text-sm leading-relaxed text-gray-700">
                {summary || "No summary provided."}
              </Text>
            </div>
          </div>

          <div className="clear-both" />
        </section>

        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.title}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                <div className="flex items-center gap-2.5 sm:w-44 sm:shrink-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1]">
                    <Icon className="size-4" />
                  </span>
                  <Text className="text-sm font-[gothamMedium] text-[#003067]">
                    {section.title}
                  </Text>
                </div>

                <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
                  {section.fields.map((spec) => (
                    <FieldCell
                      key={spec.label}
                      spec={spec}
                      data={data}
                      original={original}
                    />
                  ))}
                </dl>
              </div>
            </section>
          );
        })}
      </div>
    </ModalShell>
  );
}

export default CollectionReviewModal;
