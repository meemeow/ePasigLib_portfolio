import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { Text } from "@/components/ui/Text";

interface IDUploadAreaProps {
  idFile: File | null;
  setIdFile: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  fieldError?: string;
  disabled?: boolean;
}

export default function IDUploadArea({
  idFile,
  setIdFile,
  previewUrl,
  setPreviewUrl,
  fieldError,
  disabled,
}: IDUploadAreaProps) {
  const [dragging, setDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setIdFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      setIdFile(file);
    }
  };

  return (
    <div
      className={`w-full place-content-center p-6 min-h-[220px] border-2 border-dashed rounded-lg text-center transition ${
        idFile
          ? "border-green-500 bg-green-50"
          : dragging
            ? "border-[#128CF1] bg-[#EAF4FE]"
            : "border-gray-300 bg-white"
      } ${disabled ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <UploadCloud className="mx-auto mb-2 size-6 text-[#128CF1]" />
      <Text className="mb-2 text-xs sm:text-sm font-[gothamLight] text-gray-600">
        Drag and drop the ID here, or
      </Text>
      <Text
        as="label"
        className="inline-block bg-gray-100 hover:bg-gray-200 border px-4 py-2 rounded cursor-pointer text-xs sm:text-sm font-[gothamMedium] text-[#003067]"
      >
        Choose File
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      </Text>
      {fieldError && (
        <Text className="text-red-500 text-xs mt-2">{fieldError}</Text>
      )}
      {previewUrl && (
        <div className="mt-4">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-[200px] rounded shadow mx-auto"
          />
          {idFile && (
            <Text className="mt-2 text-xs text-gray-700 font-medium">
              Selected File: <span className="text-[#128CF1]">{idFile.name}</span>
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
