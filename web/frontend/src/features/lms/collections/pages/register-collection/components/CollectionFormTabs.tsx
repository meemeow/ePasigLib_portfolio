import { useState, type RefObject } from "react";
import { Info, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { Textarea } from "@/components/ui/Textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import CollectionCoverUpload from "@/features/lms/collections/pages/register-collection/components/CollectionCoverUpload";
import {
  normalizeEdition,
  normalizePageCount,
  normalizeSize,
  normalizeVolume,
} from "@/features/lms/collections/pages/register-collection/api/collections-register-logic";
import type { CollectionFormData } from "@/features/lms/collections/pages/register-collection/types/collections-register-types";

export type CollectionFormTab =
  | "title"
  | "classification"
  | "publication"
  | "physical"
  | "additional";

export const COLLECTION_TAB_ORDER: CollectionFormTab[] = [
  "title",
  "classification",
  "publication",
  "physical",
  "additional",
];

export const COLLECTION_TAB_LABELS: Record<CollectionFormTab, string> = {
  title: "Title",
  classification: "Classification",
  publication: "Publication",
  physical: "Physical",
  additional: "Additional",
};

export const COLLECTION_TAB_CAPTIONS: Record<CollectionFormTab, string> = {
  title: "Add the main title and author details.",
  classification: "Set the class code, call number and subjects.",
  publication: "Record the publisher, place and year.",
  physical: "Size, acquisition and cover image.",
  additional: "Material type, edition and ISBNs.",
};

export const COLLECTION_TAB_FIELDS: Record<CollectionFormTab, string[]> = {
  title: [
    "CollectionTitle",
    "SecondTitle",
    "TitleDescription",
    "MainAuthor",
    "JointAuthor",
    "Author",
    "Description",
  ],
  classification: [
    "ClassCode",
    "CallNumber",
    "CuttersTable",
    "Subjects",
    "RelatedNames",
    "CopyrightYear",
  ],
  publication: ["Publisher", "PublicationPlace", "PublicationYear"],
  physical: [
    "Size",
    "Inclusion",
    "DateReceived",
    "Acquisition",
    "CostPrice",
    "Donor",
  ],
  additional: [
    "MaterialType",
    "Edition",
    "Volume",
    "ISBN13",
    "ISBN10",
    "PageCount",
    "PrePage",
  ],
};

const PRE_PAGES = [
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
];

const EDITION_SUGGESTIONS = [
  "1st Edition",
  "2nd Edition",
  "3rd Edition",
  "Revised Edition",
  "Special Edition",
  "Reprint Edition",
  "Philippine Edition",
  "International Edition",
];

const labelClassName = "text-[#003067] text-xs sm:text-sm font-[gothamMedium]";

const digitsOnly = (value: string, max?: number): string => {
  const digits = value.replace(/[^0-9]/g, "");
  return max ? digits.slice(0, max) : digits;
};

const normalizeIsbn10Input = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^0-9X]/g, "")
    .slice(0, 10)
    .replace(/X(?=.)/g, "");

export type FieldErrors = Record<string, string | undefined>;

type ChangeHandler = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
) => void;

interface BaseTabProps {
  form: CollectionFormData;
  errors: FieldErrors;
  onChange: ChangeHandler;
  setField: <K extends keyof CollectionFormData>(
    name: K,
    value: CollectionFormData[K],
  ) => void;
}

function HintedLabel({
  htmlFor,
  text,
  hint,
  required,
}: {
  htmlFor: string;
  text: string;
  hint: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Text as="label" htmlFor={htmlFor} className={labelClassName}>
        {text}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Text>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={null}
            size={null}
            aria-label={`What to enter for ${text}`}
            className="text-gray-400 transition hover:text-[#128CF1]"
          >
            <Info className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[250px] border-[#011b38] bg-[#011b38] text-white"
        >
          {hint}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function CostPriceField({
  value,
  error,
  onValueChange,
}: {
  value: string;
  error?: string;
  onValueChange: (next: string) => void;
}) {
  const amount = value.replace(/[^\d.]/g, "");

  const handleChange = (raw: string): void => {
    const cleaned = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    onValueChange(cleaned);
  };

  const handleBlur = (): void => {
    if (!amount) {
      onValueChange("");
      return;
    }
    const parsed = Number(amount);
    onValueChange(Number.isFinite(parsed) ? `₱${parsed.toFixed(2)}` : "");
  };

  return (
    <div className="space-y-1">
      <HintedLabel
        htmlFor="CostPrice"
        text="Cost Price"
        hint="What the library paid for this copy. Type the amount only — the peso sign and centavos are added when you leave the field."
      />
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-500">
          ₱
        </span>
        <Input
          id="CostPrice"
          name="CostPrice"
          inputMode="decimal"
          placeholder="0.00"
          className="pl-7"
          value={amount}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={handleBlur}
          error={error}
        />
      </div>
    </div>
  );
}

function EditionField({
  value,
  error,
  onValueChange,
}: {
  value: string;
  error?: string;
  onValueChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const typed = value.trim().toLowerCase();
  const matches = EDITION_SUGGESTIONS.filter(
    (suggestion) => suggestion.toLowerCase() !== typed && suggestion.toLowerCase().includes(typed),
  );

  return (
    <div className="relative">
      <Input
        id="Edition"
        name="Edition"
        autoComplete="off"
        label={
          <HintedLabel
            htmlFor="Edition"
            text="Edition"
            hint="Which printing or revision this is. Type just a number — 2 becomes 2nd Edition — or a word like Revised."
          />
        }
        placeholder="2"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onValueChange(normalizeEdition(value));
        }}
        error={error}
      />

      {open && matches.length > 0 && (
        <div className="absolute z-20 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <Text className="border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-[10px] tracking-wide text-gray-500 uppercase">
            Suggestions — or type your own
          </Text>
          <ul className="max-h-44 overflow-auto ">
            {matches.map((suggestion) => (
              <li key={suggestion}>
                <Button
                  type="button"
                  variant={null}
                  size={null}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onValueChange(suggestion);
                    setOpen(false);
                  }}
                  className="w-full justify-start whitespace-normal font-normal rounded-none px-3 py-1.5 text-left text-sm font-[gothamLight] text-[#003067] transition hover:bg-[#EAF4FE]"
                >
                  {suggestion}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <div className="mb-6 space-y-1">
      <Text className="font-[gothamMedium] text-base text-[#003067] md:text-lg">
        {title}
      </Text>
      <Text className="text-xs text-gray-500 md:text-sm">{caption}</Text>
    </div>
  );
}

function TagList({
  tags,
  tone,
  onRemove,
}: {
  tags: string[];
  tone: "green" | "blue";
  onRemove: (tag: string) => void;
}) {
  if (tags.length === 0) {
    return (
      <Text className="text-xs text-gray-400">Nothing added yet.</Text>
    );
  }

  const toneClass =
    tone === "green"
      ? "bg-green-100 text-green-800"
      : "bg-[#EAF4FE] text-[#003067]";

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant={null}
          className={`inline-flex items-center border-0 font-normal gap-1 rounded-full px-3 py-1 text-[11px] sm:text-xs font-[gothamMedium] ${toneClass}`}
        >
          {tag}
          <Button
            type="button"
            variant={null}
            size={null}
            onClick={() => onRemove(tag)}
            aria-label={`Remove ${tag}`}
            className="rounded-full p-0.5 hover:bg-black/10"
          >
            <X className="size-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
}

export function TitleTab({ form, errors, onChange }: BaseTabProps) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Title & Authors"
        caption="How the collection is titled and who is credited for it."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Input
          id="CollectionTitle"
          name="CollectionTitle"
          label="Collection Title"
          placeholder="The Little Prince"
          value={form.CollectionTitle}
          onChange={onChange}
          required
          error={errors.CollectionTitle}
          labelClassName={labelClassName}
        />
        <Input
          id="SecondTitle"
          name="SecondTitle"
          label="Second Title"
          placeholder="Subtitle"
          value={form.SecondTitle}
          onChange={onChange}
          error={errors.SecondTitle}
          labelClassName={labelClassName}
        />
        <Input
          id="TitleDescription"
          name="TitleDescription"
          label="Title Description"
          placeholder="Auto-filled from title and authors"
          value={form.TitleDescription}
          onChange={onChange}
          error={errors.TitleDescription}
          labelClassName={labelClassName}
        />
        <Input
          id="MainAuthor"
          name="MainAuthor"
          label="Main Author"
          placeholder="Antoine de Saint-Exupéry"
          value={form.MainAuthor}
          onChange={onChange}
          required
          error={errors.MainAuthor}
          labelClassName={labelClassName}
        />
        <Input
          id="JointAuthor"
          name="JointAuthor"
          label="Joint Author / Editor / Illustrator"
          placeholder="Joint author"
          value={form.JointAuthor}
          onChange={onChange}
          error={errors.JointAuthor}
          labelClassName={labelClassName}
        />
        <Input
          id="Author"
          name="Author"
          label="Author"
          placeholder="Author"
          value={form.Author}
          onChange={onChange}
          error={errors.Author}
          labelClassName={labelClassName}
        />
      </div>

      <div className="space-y-1">
        <Textarea
          id="Description"
          name="Description"
          label="Summary"
          labelClassName={labelClassName}
          value={form.Description}
          onChange={onChange}
          maxLength={500}
          placeholder="Summary (max 500 characters)"
          className="min-h-[120px] text-sm sm:text-sm"
        />
        <Text className="text-xs text-gray-500">
          {form.Description.length}/500 characters
        </Text>
      </div>
    </div>
  );
}

interface ClassificationTabProps extends BaseTabProps {
  classCodes: string[];
  subjects: string[];
  relatedNames: string[];
  onAddSubject: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveSubject: (tag: string) => void;
  onAddRelatedName: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveRelatedName: (tag: string) => void;
}

export function ClassificationTab({
  form,
  errors,
  onChange,
  setField,
  classCodes,
  subjects,
  relatedNames,
  onAddSubject,
  onRemoveSubject,
  onAddRelatedName,
  onRemoveRelatedName,
}: ClassificationTabProps) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Classification"
        caption="Where the collection sits on the shelf and what it is about."
      />

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-18">
        <div className="space-y-4">
          <Select
            value={form.ClassCode}
            onValueChange={(value) => setField("ClassCode", value)}
            label="Class Code"
            required
            error={errors.ClassCode}
            triggerId="ClassCode"
            labelClassName={labelClassName}
          >
            <SelectTrigger
              id="ClassCode"
              className="w-full"
              error={errors.ClassCode}
            >
              <SelectValue placeholder="Select class code" />
            </SelectTrigger>
            <SelectContent>
              {classCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            id="CallNumber"
            name="CallNumber"
            label={
              <HintedLabel
                htmlFor="CallNumber"
                text="Call Number"
                hint="The shelf address for this collection — class code plus the Cutter number, e.g. PZ7.S1385. Letters, digits and dots only."
              />
            }
            placeholder="PZ7.S1385"
            value={form.CallNumber}
            onChange={onChange}
            error={errors.CallNumber}
          />

          <Input
            id="CuttersTable"
            name="CuttersTable"
            label={
              <HintedLabel
                htmlFor="CuttersTable"
                text="Cutters Table"
                hint="The Cutter number taken from the author's surname, e.g. S1385 for Saint-Exupéry. Letters and digits only."
              />
            }
            placeholder="S1385"
            value={form.CuttersTable}
            onChange={onChange}
            error={errors.CuttersTable}
          />

          <Input
            id="CopyrightYear"
            name="CopyrightYear"
            label={
              <HintedLabel
                htmlFor="CopyrightYear"
                text="Copyright Year"
                hint="The year printed beside the © symbol, written with a leading c — e.g. c2025."
              />
            }
            placeholder="c2025"
            value={form.CopyrightYear}
            onChange={onChange}
            error={errors.CopyrightYear}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border bg-white p-4">
            <Input
              id="SubjectInput"
              label={
                <HintedLabel
                  htmlFor="SubjectInput"
                  text="Subjects"
                  hint="What the collection is about — one topic per tag, e.g. Philippine History. Type it and press Enter to add."
                />
              }
              placeholder="Type a subject and press Enter"
              onKeyDown={onAddSubject}
              error={errors.Subjects}
            />
            <TagList tags={subjects} tone="green" onRemove={onRemoveSubject} />
          </div>

          <div className="space-y-2 rounded-lg border bg-white p-4">
            <Input
              id="RelatedNameInput"
              label={
                <HintedLabel
                  htmlFor="RelatedNameInput"
                  text="Related Names"
                  hint="Anyone credited besides the main author — editor, illustrator, translator. Type a name and press Enter to add."
                />
              }
              placeholder="Type a name and press Enter"
              onKeyDown={onAddRelatedName}
              error={errors.RelatedNames}
            />
            <TagList
              tags={relatedNames}
              tone="blue"
              onRemove={onRemoveRelatedName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicationTab({ form, errors, onChange }: BaseTabProps) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Publication"
        caption="Who published the collection, and where and when."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Input
          id="Publisher"
          name="Publisher"
          label={
            <HintedLabel
              htmlFor="Publisher"
              text="Publisher"
              hint="The company that produced this edition — printed on the title page or its back. Philippine examples: Rex Book Store, Anvil Publishing, Vibal Group, Adarna House."
            />
          }
          placeholder="Anvil Publishing"
          value={form.Publisher}
          onChange={onChange}
          error={errors.Publisher}
        />
        <Input
          id="PublicationPlace"
          name="PublicationPlace"
          label="Publication Place"
          placeholder="Manila"
          value={form.PublicationPlace}
          onChange={onChange}
          error={errors.PublicationPlace}
          labelClassName={labelClassName}
        />
        <Input
          id="PublicationYear"
          name="PublicationYear"
          label={
            <HintedLabel
              htmlFor="PublicationYear"
              text="Publication Year"
              hint="The year this edition was released, in four digits. It can differ from the copyright year when a book is reprinted."
            />
          }
          placeholder="2014"
          maxLength={4}
          inputMode="numeric"
          value={form.PublicationYear}
          onChange={onChange}
          error={errors.PublicationYear}
        />
      </div>
    </div>
  );
}

interface PhysicalTabProps extends BaseTabProps {
  imagePreview: string;
  imageEditing: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onStartImageEditing: () => void;
  onSelectImage: (file: File) => void;
  onUseDefaultImage: () => void;
  onCancelImage: () => void;
}

export function PhysicalTab({
  form,
  errors,
  onChange,
  setField,
  imagePreview,
  imageEditing,
  fileInputRef,
  onStartImageEditing,
  onSelectImage,
  onUseDefaultImage,
  onCancelImage,
}: PhysicalTabProps) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Physical & Acquisition"
        caption="The physical copy details and how the library obtained it."
      />

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-0">
        <div className="space-y-4 lg:pr-12">
          <Input
            id="Size"
            name="Size"
            label={
              <HintedLabel
                htmlFor="Size"
                text="Size"
                hint="The height of the spine in centimetres — type just the number and cm is added for you. Use 14 x 21 for width by height."
              />
            }
            placeholder="21 cm"
            value={form.Size}
            onChange={onChange}
            onBlur={() => setField("Size", normalizeSize(form.Size))}
            error={errors.Size}
          />

          <Input
            id="Inclusion"
            name="Inclusion"
            label={
              <HintedLabel
                htmlFor="Inclusion"
                text="Inclusion"
                hint="What comes with the text — illustrations, maps, index, bibliography. Separate several with commas."
              />
            }
            placeholder="Illustrations, maps"
            value={form.Inclusion}
            onChange={onChange}
            error={errors.Inclusion}
          />

          <DatePicker
            id="DateReceived"
            name="DateReceived"
            label="Date Received"
            value={form.DateReceived}
            onChange={(date) => setField("DateReceived", date)}
            max={new Date().toISOString().slice(0, 10)}
            error={errors.DateReceived}
            labelClassName={labelClassName}
          />

          <Select
            value={form.Acquisition}
            onValueChange={(value) => {
              setField("Acquisition", value);
              if (value === "Purchased") setField("Donor", "");
              if (value === "Donated") setField("CostPrice", "");
            }}
            label="Acquisition"
            error={errors.Acquisition}
            triggerId="Acquisition"
            labelClassName={labelClassName}
          >
            <SelectTrigger
              id="Acquisition"
              className="w-full"
              error={errors.Acquisition}
            >
              <SelectValue placeholder="Select acquisition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Donated">Donated</SelectItem>
              <SelectItem value="Purchased">Purchased</SelectItem>
            </SelectContent>
          </Select>

          {form.Acquisition === "Purchased" && (
            <CostPriceField
              value={form.CostPrice}
              error={errors.CostPrice}
              onValueChange={(next) => setField("CostPrice", next)}
            />
          )}

          {form.Acquisition === "Donated" && (
            <Input
              id="Donor"
              name="Donor"
              label="Donor"
              placeholder="Donor name"
              value={form.Donor}
              onChange={onChange}
              error={errors.Donor}
              labelClassName={labelClassName}
            />
          )}
        </div>

        <div className="border-t border-gray-200 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
          <CollectionCoverUpload
            preview={imagePreview}
            editing={imageEditing}
            fileInputRef={fileInputRef}
            onStartEditing={onStartImageEditing}
            onSelectFile={onSelectImage}
            onUseDefault={onUseDefaultImage}
            onCancel={onCancelImage}
          />
        </div>
      </div>
    </div>
  );
}

interface AdditionalTabProps extends BaseTabProps {
  materialTypes: string[];
}

export function AdditionalTab({
  form,
  errors,
  onChange,
  setField,
  materialTypes,
}: AdditionalTabProps) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Additional Details"
        caption="Edition, identifiers and anything else worth recording."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Select
          value={form.MaterialType}
          onValueChange={(value) => setField("MaterialType", value)}
          label="Material Type"
          required
          error={errors.MaterialType}
          triggerId="MaterialType"
          labelClassName={labelClassName}
        >
          <SelectTrigger
            id="MaterialType"
            className="w-full"
            error={errors.MaterialType}
          >
            <SelectValue placeholder="Select material type" />
          </SelectTrigger>
          <SelectContent>
            {materialTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <EditionField
          value={form.Edition}
          error={errors.Edition}
          onValueChange={(next) => setField("Edition", next)}
        />

        <Input
          id="Volume"
          name="Volume"
          label={
            <HintedLabel
              htmlFor="Volume"
              text="Volume"
              hint="Which part of a multi-volume set this book is. Type just the number — 3 becomes Volume 3. Leave blank for a standalone book."
            />
          }
          placeholder="3"
          value={form.Volume}
          onChange={onChange}
          onBlur={() => setField("Volume", normalizeVolume(form.Volume))}
          error={errors.Volume}
        />
        <Input
          id="SeriesTitle"
          name="SeriesTitle"
          label={
            <HintedLabel
              htmlFor="SeriesTitle"
              text="Series Title"
              hint="The name of the series this book belongs to, not the book's own title. Leave blank if it stands alone."
            />
          }
          placeholder="Harry Potter"
          value={form.SeriesTitle || ""}
          onChange={onChange}
          error={errors.SeriesTitle}
        />
        <Input
          id="GeneralNote"
          name="GeneralNote"
          label={
            <HintedLabel
              htmlFor="GeneralNote"
              text="General Note"
              hint="Anything a librarian should know that no other field covers — an accompanying CD, a damaged spine, or where a donated set came from."
            />
          }
          placeholder="Includes an accompanying CD"
          value={form.GeneralNote || ""}
          onChange={onChange}
          error={errors.GeneralNote}
        />
        <Input
          id="ISBN13"
          name="ISBN13"
          label={
            <HintedLabel
              htmlFor="ISBN13"
              text="ISBN-13"
              hint="The 13-digit barcode number on the back cover, usually starting with 978. Hyphens are removed for you."
            />
          }
          inputMode="numeric"
          maxLength={13}
          placeholder="9789712345678"
          value={form.ISBN13}
          onChange={(event) =>
            setField("ISBN13", digitsOnly(event.target.value, 13))
          }
          error={errors.ISBN13}
        />
        <Input
          id="ISBN10"
          name="ISBN10"
          label={
            <HintedLabel
              htmlFor="ISBN10"
              text="ISBN-10"
              hint="The older 10-character number on the copyright page. The last character may be an X. Hyphens are removed for you."
            />
          }
          maxLength={10}
          placeholder="9712345678"
          value={form.ISBN10}
          onChange={(event) =>
            setField("ISBN10", normalizeIsbn10Input(event.target.value))
          }
          error={errors.ISBN10}
        />
        <Input
          id="PageCount"
          name="PageCount"
          label={
            <HintedLabel
              htmlFor="PageCount"
              text="Page Count"
              hint="How many numbered pages the main text has. Type just the number and pages is added for you."
            />
          }
          inputMode="numeric"
          placeholder="320"
          value={form.PageCount}
          onChange={(event) =>
            setField("PageCount", digitsOnly(event.target.value))
          }
          onBlur={() => setField("PageCount", normalizePageCount(form.PageCount))}
          error={errors.PageCount}
        />

        <Select
          value={form.PrePage}
          onValueChange={(value) => setField("PrePage", value)}
          label="Preliminary Page"
          error={errors.PrePage}
          triggerId="PrePage"
          labelClassName={labelClassName}
        >
          <SelectTrigger id="PrePage" className="w-full" error={errors.PrePage}>
            <SelectValue placeholder="Select preliminary page" />
          </SelectTrigger>
          <SelectContent>
            {PRE_PAGES.map((page) => (
              <SelectItem key={page} value={page}>
                {page}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
