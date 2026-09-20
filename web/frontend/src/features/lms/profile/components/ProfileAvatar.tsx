import type { RefObject } from "react";
import { Camera, ImageUp, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

interface ProfileAvatarProps {
  avatarPreview: string | null;
  avatarEditing: boolean;
  selectedAvatar: File | null;
  isProcessing: boolean;
  disabled?: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onStartEditing: () => void;
  onSelectFile: (file: File) => void;
  onUpload: () => void;
  onCancel: () => void;
}

export default function ProfileAvatar({
  avatarPreview,
  avatarEditing,
  selectedAvatar,
  isProcessing,
  disabled = false,
  fileInputRef,
  onStartEditing,
  onSelectFile,
  onUpload,
  onCancel,
}: ProfileAvatarProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="button"
        tabIndex={avatarEditing ? 0 : -1}
        className={`relative size-28 sm:size-32 md:size-36 overflow-hidden rounded-full border-4 border-[#EAF4FE] bg-gray-100 shadow-sm transition ${
          avatarEditing ? "ring-2 ring-[#128CF1] cursor-pointer" : ""
        }`}
        onClick={() => avatarEditing && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (avatarEditing && (e.key === "Enter" || e.key === " ")) {
            fileInputRef.current?.click();
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (avatarEditing && e.dataTransfer.files.length > 0) {
            onSelectFile(e.dataTransfer.files[0]);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {avatarPreview ? (
          <img
            src={avatarPreview}
            alt="Profile photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <UserRound className="size-14" />
          </div>
        )}

        {avatarEditing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white">
            <ImageUp className="size-6" />
            <span className="px-2 text-center text-[10px] font-[gothamMedium] leading-tight">
              Click or drop an image
            </span>
          </div>
        )}
      </div>

      {selectedAvatar && (
        <Text className="max-w-[200px] truncate text-center text-xs text-gray-500">
          {selectedAvatar.name}
        </Text>
      )}

      {!avatarEditing ? (
        <Button
          onClick={onStartEditing}
          variant="secondary"
          size="sm"
          disabled={disabled || isProcessing}
          className="w-full sm:w-[160px]"
        >
          <Camera className="size-4" /> Change Photo
        </Button>
      ) : (
        <div className="flex w-full flex-col gap-2 sm:w-[160px]">
          <Button
            onClick={onUpload}
            size="sm"
            disabled={isProcessing || !selectedAvatar}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            {isProcessing ? "Saving..." : "Save Photo"}
          </Button>
          <Button
            onClick={onCancel}
            variant="cancel"
            size="sm"
            disabled={isProcessing}
          >
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
