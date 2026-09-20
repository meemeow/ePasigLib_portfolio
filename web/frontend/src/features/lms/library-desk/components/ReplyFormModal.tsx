import { useEffect, useState } from "react";
import { Loader2, Reply, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Text } from "@/components/ui/Text";
import { ModalShell } from "@/components/ui/ModalShell";
import AttachmentUploader from "@/features/lms/library-desk/components/AttachmentUploader";
import {
  fieldErrors,
  MESSAGE_LIMIT,
  ReplySchema,
  SUBJECT_LIMIT,
} from "@/features/lms/library-desk/schema/updates-schema";
import type {
  AnnouncementReplyRecord,
  ReplyFieldErrors,
  UpdateFile,
} from "@/features/lms/library-desk/types/updates-types";

export interface ReplySubmitPayload {
  Subject: string;
  Message: string;
  keptFiles: UpdateFile[];
  newFiles: File[];
}

interface ReplyFormModalProps {
  open: boolean;
  reply?: AnnouncementReplyRecord | null;
  parentSubject: string;
  onClose: () => void;
  onSubmit: (payload: ReplySubmitPayload) => Promise<void>;
  submitting: boolean;
}

export default function ReplyFormModal({
  open,
  reply,
  parentSubject,
  onClose,
  onSubmit,
  submitting,
}: ReplyFormModalProps) {
  const isEdit = !!reply;

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [keptFiles, setKeptFiles] = useState<UpdateFile[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<ReplyFieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setSubject(reply?.Subject ?? "");
    setMessage(reply?.Message ?? "");
    setKeptFiles(reply?.Files ?? []);
    setNewFiles([]);
    setErrors({});
  }, [open, reply]);

  const submit = async (): Promise<void> => {
    const parsed = ReplySchema.safeParse({
      Subject: subject,
      Message: message,
      Files: keptFiles,
    });
    if (!parsed.success) {
      setErrors(fieldErrors<keyof ReplyFieldErrors>(parsed.error));
      return;
    }
    setErrors({});
    await onSubmit({
      Subject: parsed.data.Subject,
      Message: parsed.data.Message,
      keptFiles,
      newFiles,
    });
  };

  return (
    <ModalShell
      open={open}
      title={isEdit ? "Edit Reply" : "Post a Reply"}
      description={`On "${parentSubject}"`}
      icon={<Reply className="size-5" />}
      size="md"
      onClose={submitting ? undefined : onClose}
      actions={
        <>
          <Button variant="cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isEdit ? "Save Reply" : "Post Reply"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Input
            id="reply-subject"
            label="Subject"
            value={subject}
            maxLength={SUBJECT_LIMIT + 20}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What is this reply about?"
            disabled={submitting}
            labelClassName="text-[#011b38]"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-red-600">{errors.Subject ?? ""}</span>
            <span className="text-xs text-gray-400">
              {subject.length}/{SUBJECT_LIMIT}
            </span>
          </div>
        </div>

        <div>
          <Textarea
            id="reply-message"
            label="Message"
            value={message}
            rows={6}
            maxLength={MESSAGE_LIMIT + 100}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write the reply..."
            disabled={submitting}
            labelClassName="text-[#011b38]"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-red-600">{errors.Message ?? ""}</span>
            <span className="text-xs text-gray-400">
              {message.length}/{MESSAGE_LIMIT}
            </span>
          </div>
        </div>

        <div>
          <Text
            as="div"
            className="mb-1.5 text-sm font-[gothamMedium] text-[#011b38]"
          >
            Attachments
          </Text>
          <AttachmentUploader
            existing={keptFiles}
            onRemoveExisting={(url) =>
              setKeptFiles((files) => files.filter((f) => f.URL !== url))
            }
            pending={newFiles}
            onChangePending={setNewFiles}
            disabled={submitting}
          />
        </div>
      </div>
    </ModalShell>
  );
}
