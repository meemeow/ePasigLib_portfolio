import { useCallback, useEffect, useState } from "react";
import { Loader2, Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Text } from "@/components/ui/Text";
import { ModalShell } from "@/components/ui/ModalShell";
import AttachmentUploader from "@/features/lms/library-desk/components/AttachmentUploader";
import FieldLabel, {
  CharCount,
  RequiredLegend,
} from "@/features/lms/library-desk/components/FieldLabel";
import {
  AnnouncementSchema,
  fieldErrors,
  MESSAGE_LIMIT,
  SUBJECT_LIMIT,
} from "@/features/lms/library-desk/schema/updates-schema";
import type {
  AnnouncementFieldErrors,
  AnnouncementFormState,
  AnnouncementRecord,
  SetField,
  UpdateFile,
} from "@/features/lms/library-desk/types/updates-types";

export interface AnnouncementSubmitPayload {
  Subject: string;
  Message: string;
  keptFiles: UpdateFile[];
  newFiles: File[];
  publish: boolean;
}

interface AnnouncementFormModalProps {
  open: boolean;
  record?: AnnouncementRecord | null;
  onClose: () => void;
  onSubmit: (payload: AnnouncementSubmitPayload) => Promise<void>;
  submitting: boolean;
}

const EMPTY_FORM: AnnouncementFormState = {
  Subject: "",
  Message: "",
};

export default function AnnouncementFormModal({
  open,
  record,
  onClose,
  onSubmit,
  submitting,
}: AnnouncementFormModalProps) {
  const isEdit = !!record;

  const [form, setForm] = useState<AnnouncementFormState>(EMPTY_FORM);
  const [keptFiles, setKeptFiles] = useState<UpdateFile[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<AnnouncementFieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setForm({
      Subject: record?.Subject ?? "",
      Message: record?.Message ?? "",
    });
    setKeptFiles(record?.Files ?? []);
    setNewFiles([]);
    setErrors({});
  }, [open, record]);

  const setField = useCallback<SetField<AnnouncementFormState>>(
    (name, value) => {
      setForm((current) => ({ ...current, [name]: value }));
      setErrors((current) =>
        current[name] === undefined
          ? current
          : { ...current, [name]: undefined },
      );
    },
    [],
  );

  const busy = submitting;

  const submit = async (publish: boolean): Promise<void> => {
    const parsed = AnnouncementSchema.safeParse({
      Subject: form.Subject,
      Message: form.Message,
      Files: keptFiles,
    });
    if (!parsed.success) {
      setErrors(fieldErrors<keyof AnnouncementFieldErrors>(parsed.error));
      return;
    }
    setErrors({});
    await onSubmit({
      Subject: parsed.data.Subject,
      Message: parsed.data.Message,
      keptFiles,
      newFiles,
      publish,
    });
  };

  return (
    <ModalShell
      open={open}
      title={isEdit ? "Edit Announcement" : "Compose Announcement"}
      description={
        isEdit
          ? record?.Status === "Published"
            ? "Changes are visible to patrons as soon as you save."
            : "This announcement is still a draft. Nobody has been notified."
          : "Save it as a draft, or publish it to every patron now."
      }
      icon={<Megaphone className="size-5" />}
      size="lg"
      onClose={busy ? undefined : onClose}
      footerLeft={<RequiredLegend />}
      actions={
        <>
          <Button variant="cancel" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {(!isEdit || record?.Status !== "Published") && (
            <Button
              type="button"
              variant="outline"
              onClick={() => submit(false)}
              disabled={busy}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Save Draft
            </Button>
          )}
          <Button
            type="button"
            onClick={() =>
              submit(isEdit ? record?.Status !== "Published" : true)
            }
            disabled={busy}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {busy ? (
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
        <div className="space-y-5">
          <Input
            id="announcement-subject"
            name="Subject"
            label={
              <FieldLabel
                htmlFor="announcement-subject"
                required
                hint={<CharCount value={form.Subject} limit={SUBJECT_LIMIT} />}
              >
                Subject
              </FieldLabel>
            }
            value={form.Subject}
            maxLength={SUBJECT_LIMIT + 20}
            onChange={(e) => setField("Subject", e.target.value)}
            placeholder="What is this announcement about?"
            disabled={busy}
            aria-required="true"
            aria-invalid={!!errors.Subject}
            error={errors.Subject}
          />

          <Textarea
            id="announcement-message"
            name="Message"
            label={
              <FieldLabel
                htmlFor="announcement-message"
                required
                hint={<CharCount value={form.Message} limit={MESSAGE_LIMIT} />}
              >
                Message
              </FieldLabel>
            }
            value={form.Message}
            rows={7}
            maxLength={MESSAGE_LIMIT + 100}
            onChange={(e) => setField("Message", e.target.value)}
            placeholder="Write the announcement..."
            disabled={busy}
            aria-required="true"
            aria-invalid={!!errors.Message}
            error={errors.Message}
          />

          <div className="space-y-1">
            <FieldLabel>Attachments</FieldLabel>
            <AttachmentUploader
              existing={keptFiles}
              onRemoveExisting={(url) =>
                setKeptFiles((files) => files.filter((f) => f.URL !== url))
              }
              pending={newFiles}
              onChangePending={setNewFiles}
              disabled={busy}
            />
            {errors.Files && (
              <Text className="text-xs text-red-600">{errors.Files}</Text>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
