import { useRef, useState, type DragEvent } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  attachmentRejectionReason,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
} from "@/features/lms/library-desk/api/use-updates-uploads";
import type {
  UpdateFile,
} from "@/features/lms/library-desk/types/updates-types";

interface AttachmentUploaderProps {
  existing: UpdateFile[];
  onRemoveExisting: (url: string) => void;
  pending: File[];
  onChangePending: (files: File[]) => void;
  disabled?: boolean;
}

export default function AttachmentUploader({
  existing,
  onRemoveExisting,
  pending,
  onChangePending,
  disabled = false,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = existing.length + pending.length;
  const remaining = Math.max(0, MAX_ATTACHMENTS - total);

  const addFiles = (incoming: FileList | File[]): void => {
    const list = Array.from(incoming);
    if (list.length === 0) return;

    const seen = new Set(
      pending.map((f) => `${f.name}:${f.size}:${f.lastModified}`),
    );
    const accepted: File[] = [];
    let rejection: string | null = null;

    for (const file of list) {
      if (accepted.length >= remaining) {
        rejection = `Up to ${MAX_ATTACHMENTS} attachments.`;
        break;
      }
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) continue;
      const reason = attachmentRejectionReason(file);
      if (reason) {
        rejection = reason;
        continue;
      }
      seen.add(key);
      accepted.push(file);
    }

    setError(rejection);
    if (accepted.length > 0) onChangePending([...pending, ...accepted]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    addFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
          dragging
            ? "border-[#128CF1] bg-[#EAF4FE]"
            : "border-gray-200 bg-gray-50"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <Paperclip className="mx-auto size-5 text-[#128CF1]" />
        <Text className="mt-1 text-sm text-gray-600">
          Drag files here, or{" "}
          <button
            type="button"
            disabled={disabled || remaining === 0}
            onClick={() => inputRef.current?.click()}
            className="font-[gothamMedium] text-[#128CF1] underline underline-offset-2 disabled:no-underline disabled:opacity-50"
          >
            browse
          </button>
        </Text>
        <Text className="mt-0.5 text-xs text-gray-400">
          Up to {MAX_ATTACHMENTS} files,{" "}
          {(MAX_ATTACHMENT_BYTES / (1024 * 1024)).toFixed(0)} MB each.{" "}
          {remaining} remaining.
        </Text>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <Text className="text-xs text-red-600">{error}</Text>}

      {total > 0 && (
        <ul className="space-y-1">
          {existing.map((file) => (
            <li
              key={file.URL}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5"
            >
              <FileText className="size-4 shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate text-xs" title={file.Name}>
                {file.Name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={`Remove ${file.Name}`}
                onClick={() => onRemoveExisting(file.URL)}
                className="size-6 text-gray-400 hover:text-red-600"
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
          {pending.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center gap-2 rounded-lg border border-[#128CF1]/30 bg-[#EAF4FE] px-2 py-1.5"
            >
              <FileText className="size-4 shrink-0 text-[#128CF1]" />
              <span className="min-w-0 flex-1 truncate text-xs" title={file.name}>
                {file.name}
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-[#128CF1]">
                New
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  onChangePending(pending.filter((_, i) => i !== index))
                }
                className="size-6 text-gray-400 hover:text-red-600"
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
