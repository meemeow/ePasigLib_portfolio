import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { coverRejectionReason } from "@/features/lms/library-desk/api/use-updates-uploads";

interface CoverImageUploadProps {
  currentUrl: string;
  pending: File | null;
  onChangePending: (file: File | null) => void;
  disabled?: boolean;
}

export default function CoverImageUpload({
  currentUrl,
  pending,
  onChangePending,
  disabled = false,
}: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pending);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  const accept = (file: File | undefined): void => {
    if (!file) return;
    const reason = coverRejectionReason(file);
    setError(reason);
    if (!reason) onChangePending(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files?.[0]);
  };

  const shown = previewUrl || currentUrl;

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          dragging
            ? "border-[#128CF1] bg-[#EAF4FE]"
            : "border-gray-200 bg-gray-50"
        } ${disabled ? "opacity-60" : ""}`}
      >
        {shown ? (
          <div className="relative">
            <img
              src={shown}
              alt="Cover preview"
              className="h-48 w-full object-cover"
            />
            {pending && (
              <span className="absolute left-2 top-2 rounded-full bg-[#128CF1] px-2 py-0.5 text-[10px] font-[gothamMedium] uppercase tracking-wider text-white">
                New
              </span>
            )}
            {pending && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove selected cover"
                onClick={() => {
                  onChangePending(null);
                  setError(null);
                }}
                className="absolute right-2 top-2 size-7 rounded-full bg-white/90 text-gray-600 hover:bg-white hover:text-red-600"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
            <ImageIcon className="size-6 text-[#128CF1]" />
            <Text className="mt-1 text-sm text-gray-600">
              Drag a cover image here
            </Text>
          </div>
        )}

        <div className="border-t border-gray-200 bg-white px-3 py-2 text-center">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="text-sm font-[gothamMedium] text-[#128CF1] underline underline-offset-2 disabled:no-underline disabled:opacity-50"
          >
            {shown ? "Choose a different image" : "Browse for an image"}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error && <Text className="text-xs text-red-600">{error}</Text>}

      <Text className="text-xs leading-relaxed text-gray-400">
        Converted to WebP and resized to 1600px.
        {!shown && " Leave it empty to use the Pasig City seal."}
      </Text>
    </div>
  );
}
