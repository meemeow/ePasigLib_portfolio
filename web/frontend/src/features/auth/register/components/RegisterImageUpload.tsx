import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";

interface RegisterImageUploadProps {
  idFile: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File | null) => void;
  onPreviewChange: (url: string | null) => void;
  error?: string;
  isProcessing: boolean;
  required?: boolean;
}

export default function RegisterImageUpload({
  idFile,
  previewUrl,
  onFileSelect,
  onPreviewChange,
  error,
  isProcessing,
  required,
}: RegisterImageUploadProps) {
  const [dragging, setDragging] = useState(false);

  const handleFileChange = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) {
      onFileSelect(null);
      if (file) alert("Only image files are allowed for ID.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum allowed size is 5MB.");
      return;
    }

    try {
      const imageBitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      ctx.drawImage(imageBitmap, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.8),
      );

      if (!blob) throw new Error("WebP conversion failed");

      const webpFile = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, ".webp"),
        {
          type: "image/webp",
        },
      );

      onFileSelect(webpFile);
      onPreviewChange(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Image conversion error:", err);
      alert("Failed to convert image to WebP format");
      onFileSelect(null);
      onPreviewChange(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileChange(file);
    } else {
      alert("Only image files are allowed for ID.");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) handleFileChange(file);
  };

  return (
    <div className="space-y-2">
      <Text className="block text-[#002248] text-sm sm:text-base font-medium">
        Government ID / School ID
        {required && <span className="text-red-500 ml-1">*</span>}
      </Text>
      <div
        className={cn(
          "border-2 border-dashed rounded-md text-center transition cursor-pointer",
          "py-8 sm:py-12 md:py-16",
          idFile
            ? "border-green-500 bg-green-50"
            : dragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-400/40 bg-gray-200",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Text className="mb-2 text-gray-600 text-sm sm:text-base p-4">
          Drag and drop your School ID or Government-issued ID here, or
        </Text>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-white hover:bg-gray-100 border"
          disabled={isProcessing}
          onClick={() => document.getElementById("id-file-input")?.click()}
        >
          Choose File
        </Button>
        <input
          id="id-file-input"
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={isProcessing}
        />

        {previewUrl && (
          <div className="mt-4 px-4">
            <div className="relative mx-auto max-w-full">
              <img
                src={previewUrl}
                alt="ID Preview"
                className={cn(
                  "mx-auto rounded shadow",
                  "w-full max-w-[200px] sm:max-w-[250px] md:max-w-[300px]",
                  "h-auto object-contain",
                )}
              />
            </div>
            {idFile && (
              <Text className="mt-2 text-sm text-gray-700 font-medium truncate max-w-[250px] mx-auto">
                Selected File:{" "}
                <span className="text-blue-600">{idFile.name}</span>
              </Text>
            )}
          </div>
        )}
      </div>
      {error && <Text className="text-red-600 text-xs">{error}</Text>}
    </div>
  );
}