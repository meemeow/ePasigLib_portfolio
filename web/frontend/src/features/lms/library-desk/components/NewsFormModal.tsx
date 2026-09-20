import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Loader2, Newspaper, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Text } from "@/components/ui/Text";
import { ModalShell } from "@/components/ui/ModalShell";
import CoverImageUpload from "@/features/lms/library-desk/components/CoverImageUpload";
import FieldLabel, {
  CharCount,
  RequiredLegend,
} from "@/features/lms/library-desk/components/FieldLabel";
import {
  fieldErrors,
  MAX_TAGS,
  NEWS_DESC_LIMIT,
  NEWS_TITLE_LIMIT,
  NewsSchema,
} from "@/features/lms/library-desk/schema/updates-schema";
import type {
  NewsFieldErrors,
  NewsFormState,
  NewsRecord,
  SetField,
} from "@/features/lms/library-desk/types/updates-types";

export interface NewsSubmitPayload {
  Title: string;
  Description: string;
  Tags: string[];
  URL: string;
  MainAuthor: string;
  Location: string;
  currentImageUrl: string;
  newCover: File | null;
  publish: boolean;
}

interface NewsFormModalProps {
  open: boolean;
  record?: NewsRecord | null;
  onClose: () => void;
  onSubmit: (payload: NewsSubmitPayload) => Promise<void>;
  submitting: boolean;
}

const EMPTY_FORM: NewsFormState = {
  Title: "",
  Description: "",
  Tags: [],
  MainAuthor: "",
  Location: "",
  URL: "",
};

export default function NewsFormModal({
  open,
  record,
  onClose,
  onSubmit,
  submitting,
}: NewsFormModalProps) {
  const isEdit = !!record;

  const [form, setForm] = useState<NewsFormState>(EMPTY_FORM);
  const [tagDraft, setTagDraft] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [errors, setErrors] = useState<NewsFieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setForm({
      Title: record?.Title ?? "",
      Description: record?.Description ?? "",
      Tags: record?.Tags ?? [],
      MainAuthor: record?.MainAuthor ?? "",
      Location: record?.Location ?? "",
      URL: record?.URL ?? "",
    });
    setTagDraft("");
    setCover(null);
    setErrors({});
  }, [open, record]);

  const setField = useCallback<SetField<NewsFormState>>((name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) =>
      current[name] === undefined ? current : { ...current, [name]: undefined },
    );
  }, []);

  const addTag = (): void => {
    const tag = tagDraft.trim();
    if (!tag || form.Tags.length >= MAX_TAGS) return;
    if (form.Tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagDraft("");
      return;
    }
    setField("Tags", [...form.Tags, tag]);
    setTagDraft("");
  };

  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
      return;
    }
    if (event.key === "Backspace" && !tagDraft && form.Tags.length > 0) {
      setField("Tags", form.Tags.slice(0, -1));
    }
  };

  const submit = async (publish: boolean): Promise<void> => {
    const parsed = NewsSchema.safeParse({
      ...form,
      ImageURL: record?.ImageURL ?? "",
    });
    if (!parsed.success) {
      setErrors(fieldErrors<keyof NewsFieldErrors>(parsed.error));
      return;
    }
    setErrors({});
    await onSubmit({
      Title: parsed.data.Title,
      Description: parsed.data.Description,
      Tags: parsed.data.Tags,
      URL: parsed.data.URL,
      MainAuthor: parsed.data.MainAuthor,
      Location: parsed.data.Location,
      currentImageUrl: record?.ImageURL ?? "",
      newCover: cover,
      publish,
    });
  };

  return (
    <ModalShell
      open={open}
      title={isEdit ? "Edit News" : "Create News"}
      description={
        isEdit
          ? record?.Status === "Published"
            ? "Changes are visible on the OPAC as soon as you save."
            : "This news item is still a draft. Nobody has been notified."
          : "Save it as a draft, or publish it to the OPAC now."
      }
      icon={<Newspaper className="size-5" />}
      size="lg"
      onClose={submitting ? undefined : onClose}
      footerLeft={<RequiredLegend />}
      actions={
        <>
          <Button variant="cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {(!isEdit || record?.Status !== "Published") && (
            <Button
              type="button"
              variant="outline"
              onClick={() => submit(false)}
              disabled={submitting}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save Draft
            </Button>
          )}
          <Button
            type="button"
            onClick={() =>
              submit(isEdit ? record?.Status !== "Published" : true)
            }
            disabled={submitting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isEdit
              ? record?.Status === "Published"
                ? "Save Changes"
                : "Save & Publish"
              : "Publish"}
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] md:gap-8">
          <div className="space-y-5">
            <Input
              id="news-title"
              name="Title"
              label={
                <FieldLabel
                  htmlFor="news-title"
                  required
                  hint={
                    <CharCount value={form.Title} limit={NEWS_TITLE_LIMIT} />
                  }
                >
                  Title
                </FieldLabel>
              }
              value={form.Title}
              maxLength={NEWS_TITLE_LIMIT + 20}
              onChange={(e) => setField("Title", e.target.value)}
              placeholder="Headline"
              disabled={submitting}
              aria-required="true"
              aria-invalid={!!errors.Title}
              error={errors.Title}
            />

            <Textarea
              id="news-description"
              name="Description"
              label={
                <FieldLabel
                  htmlFor="news-description"
                  required
                  hint={
                    <CharCount
                      value={form.Description}
                      limit={NEWS_DESC_LIMIT}
                    />
                  }
                >
                  Description
                </FieldLabel>
              }
              value={form.Description}
              rows={10}
              maxLength={NEWS_DESC_LIMIT + 200}
              onChange={(e) => setField("Description", e.target.value)}
              placeholder="Write the story..."
              disabled={submitting}
              aria-required="true"
              aria-invalid={!!errors.Description}
              error={errors.Description}
            />

            <div className="space-y-1">
              <FieldLabel
                htmlFor="news-tags"
                hint={
                  <span className="text-xs tabular-nums text-gray-400">
                    {form.Tags.length}/{MAX_TAGS}
                  </span>
                }
              >
                Tags
              </FieldLabel>
              <div
                className={`flex flex-wrap items-center gap-1.5 rounded-md border bg-white p-2 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 ${
                  errors.Tags ? "border-red-500" : "border-input"
                }`}
              >
                {form.Tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-[#EAF4FE] px-2 py-0.5 text-xs text-[#003067]"
                  >
                    {tag}
                    <button
                      type="button"
                      disabled={submitting}
                      aria-label={`Remove tag ${tag}`}
                      onClick={() =>
                        setField(
                          "Tags",
                          form.Tags.filter((t) => t !== tag),
                        )
                      }
                      className="text-[#128CF1] hover:text-red-600"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="news-tags"
                  name="Tags"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={onTagKeyDown}
                  onBlur={addTag}
                  disabled={submitting || form.Tags.length >= MAX_TAGS}
                  aria-invalid={!!errors.Tags}
                  placeholder={
                    form.Tags.length >= MAX_TAGS
                      ? `${MAX_TAGS} tags maximum`
                      : "Add a tag and press Enter"
                  }
                  className="min-w-[10rem] flex-1 border-none bg-transparent text-sm font-[gothamLight] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                />
              </div>
              {errors.Tags && (
                <Text className="text-xs text-red-600">{errors.Tags}</Text>
              )}
            </div>

            <Input
              id="news-source"
              name="URL"
              label={<FieldLabel htmlFor="news-source">Source link</FieldLabel>}
              value={form.URL}
              onChange={(e) => setField("URL", e.target.value)}
              placeholder="pasigcity.gov.ph/news"
              disabled={submitting}
              aria-invalid={!!errors.URL}
              error={errors.URL}
            />
          </div>

          <div className="space-y-5">
            <div className="space-y-1">
              <FieldLabel>Cover image</FieldLabel>
              <CoverImageUpload
                currentUrl={record?.ImageURL ?? ""}
                pending={cover}
                onChangePending={setCover}
                disabled={submitting}
              />
              {errors.ImageURL && (
                <Text className="text-xs text-red-600">{errors.ImageURL}</Text>
              )}
            </div>

            <div className="space-y-5 border-t border-gray-100 pt-5">
              <Input
                id="news-author"
                name="MainAuthor"
                label={
                  <FieldLabel htmlFor="news-author">Main author</FieldLabel>
                }
                value={form.MainAuthor}
                onChange={(e) => setField("MainAuthor", e.target.value)}
                placeholder="Who wrote the story, e.g. Pasig City PIO"
                disabled={submitting}
                aria-invalid={!!errors.MainAuthor}
                error={errors.MainAuthor}
              />

              <Input
                id="news-location"
                name="Location"
                label={
                  <FieldLabel htmlFor="news-location">Location</FieldLabel>
                }
                value={form.Location}
                onChange={(e) => setField("Location", e.target.value)}
                placeholder="Pasig City"
                disabled={submitting}
                aria-invalid={!!errors.Location}
                error={errors.Location}
              />
            </div>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
