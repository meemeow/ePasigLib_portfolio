import type { RefObject } from "react";
import { ImageUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

interface CollectionCoverUploadProps {
  preview: string;
  editing: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onStartEditing: () => void;
  onSelectFile: (file: File) => void;
  onUseDefault: () => void;
  onCancel: () => void;
}

export default function CollectionCoverUpload({
  preview,
  editing,
  fileInputRef,
  onStartEditing,
  onSelectFile,
  onUseDefault,
  onCancel,
}: CollectionCoverUploadProps) {
  return (
    <div className="flex flex-col gap-5">
      <Text className="text-xs font-[gothamMedium] text-[#003067] sm:text-sm">
        Collection Cover
      </Text>

      <div
        role="button"
        tabIndex={editing ? 0 : -1}
        className={`relative mx-auto aspect-[2/3] w-full max-w-[200px] overflow-hidden rounded-lg border bg-gray-100 shadow-sm transition ${
          editing ? "cursor-pointer ring-2 ring-[#128CF1]" : ""
        }`}
        onClick={() => editing && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (editing && (e.key === "Enter" || e.key === " ")) {
            fileInputRef.current?.click();
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (editing && e.dataTransfer.files.length > 0) {
            onSelectFile(e.dataTransfer.files[0]);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <img
          src={preview}
          alt="Collection cover"
          className="h-full w-full object-cover"
        />
        {editing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white">
            <ImageUp className="size-6" />
            <span className="px-2 text-center text-[10px] font-[gothamMedium] leading-tight">
              Click or drop an image
            </span>
          </div>
        )}
      </div>

      {!editing ? (
        <Button
          onClick={onStartEditing}
          variant="secondary"
          size="sm"
          className="mx-auto w-full max-w-[200px]"
        >
          Change Cover
        </Button>
      ) : (
        <div className="mx-auto flex w-full max-w-[200px] flex-col gap-2">
          <Button onClick={onUseDefault} variant="outline" size="sm">
            Use Default
          </Button>
          <Button onClick={onCancel} variant="cancel" size="sm">
            Cancel
          </Button>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) onSelectFile(e.target.files[0]);
        }}
      />
    </div>
  );
}
