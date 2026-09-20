import { useEffect, useState } from "react";
import { IdCard, Info, TriangleAlert, UploadCloud } from "lucide-react";
import { Text } from "@/components/ui/Text";

interface ProfileIDReuploadProps {
  currentID?: string;
  state?: string;
  selectedID: File | null;
  isProcessing: boolean;
  onSelectID: (file: File) => void;
}

const STATE_NOTICE: Record<string, { tone: string; message: string }> = {
  Verified: {
    tone: "bg-[#EAF4FE] text-[#0B2545]",
    message: "Your ID has been verified. No action is needed.",
  },
  Unverified: {
    tone: "bg-yellow-50 text-yellow-800",
    message:
      "Your ID is waiting for a librarian to review it. You will be notified once it is checked.",
  },
  Rejected: {
    tone: "bg-red-50 text-red-700",
    message:
      "Your ID was rejected. Upload a clear photo of a valid ID that matches your profile details.",
  },
};

export default function ProfileIDReupload({
  currentID,
  state,
  selectedID,
  isProcessing,
  onSelectID,
}: ProfileIDReuploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!selectedID) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedID);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedID]);

  const isRejected = state === "Rejected";
  const notice = STATE_NOTICE[state || ""] || {
    tone: "bg-[#EAF4FE] text-[#0B2545]",
    message: "Your ID is on file with the library.",
  };

  const handleFile = (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    onSelectID(file);
  };

  return (
    <div className="space-y-6" id="reupload-id-section">
      <div className="flex items-start gap-3">
        <div className="my-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:h-10 md:w-10">
          <IdCard className="size-4 md:size-5" />
        </div>
        <div>
          <Text className="font-[gothamMedium] text-base text-[#003067] md:text-lg">
            ID Verification
          </Text>
          <Text className="text-xs text-gray-500 md:text-sm">
            The ID the library uses to verify your account.
          </Text>
        </div>
      </div>

      <div className={`flex items-center gap-2 rounded-lg px-4 py-3 ${notice.tone}`}>
        {isRejected ? (
          <TriangleAlert className="size-3 shrink-0 md:size-4" />
        ) : (
          <Info className="size-3 shrink-0 text-[#128CF1] md:size-4" />
        )}
        <Text className="text-xs md:text-sm">{notice.message}</Text>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="space-y-3">
          <Text className="font-[gothamMedium] text-sm text-[#003067]">
            Current ID
          </Text>
          <div
            className={`flex min-h-[220px] items-center justify-center rounded-lg border bg-gray-50 p-4 ${
              isRejected ? "border-red-300" : ""
            }`}
          >
            {currentID ? (
              <img
                src={currentID}
                alt="Current ID"
                className="max-h-64 w-full max-w-xs rounded-md border object-contain shadow"
              />
            ) : (
              <Text className="text-sm text-gray-500">No ID uploaded</Text>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Text className="font-[gothamMedium] text-sm text-[#003067]">
            {isRejected ? "New ID" : "Replacement ID"}
          </Text>
          <div
            className={`w-full place-content-center rounded-lg border-2 border-dashed p-6 text-center transition min-h-[220px] ${
              selectedID
                ? "border-green-500 bg-green-50"
                : dragging
                  ? "border-[#128CF1] bg-[#EAF4FE]"
                  : "border-gray-300 bg-white"
            } ${
              isProcessing || !isRejected
                ? "pointer-events-none opacity-60"
                : "cursor-pointer"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (isRejected) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (isRejected) handleFile(e.dataTransfer.files[0]);
            }}
          >
            <UploadCloud className="mx-auto mb-2 size-6 text-[#128CF1]" />
            <Text className="mb-2 text-xs font-[gothamLight] text-gray-600 sm:text-sm">
              Drag and drop your ID here, or
            </Text>
            <Text
              as="label"
              className="inline-block cursor-pointer rounded border bg-gray-100 px-4 py-2 text-xs font-[gothamMedium] text-[#003067] hover:bg-gray-200 sm:text-sm"
            >
              Choose File
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isProcessing || !isRejected}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </Text>

            {previewUrl && (
              <div className="mt-4">
                <img
                  src={previewUrl}
                  alt="Selected ID"
                  className="mx-auto max-w-[200px] rounded shadow"
                />
                {selectedID && (
                  <Text className="mt-2 text-xs font-medium text-gray-700">
                    Selected File:{" "}
                    <span className="text-[#128CF1]">{selectedID.name}</span>
                  </Text>
                )}
              </div>
            )}
          </div>

          {!isRejected && (
            <Text className="text-xs text-gray-500">
              Reuploading is only available while your ID is rejected.
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
