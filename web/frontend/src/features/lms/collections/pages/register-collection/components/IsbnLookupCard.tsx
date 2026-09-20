import {
  AlertCircle,
  CircleCheck,
  Info,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import type {
  GoogleBooksVolume,
  IsbnLookupState,
} from "@/features/lms/collections/pages/register-collection/types/collections-register-types";

interface IsbnLookupCardProps {
  isbn: string;
  onIsbnChange: (value: string) => void;
  onClear: () => void;
  state: IsbnLookupState;
  volume: GoogleBooksVolume | null;
  hint: string;
}

const MESSAGES: Record<IsbnLookupState, string> = {
  idle: "",
  typing: "Waiting for you to finish typing...",
  searching: "Searching Google Books...",
  found: "Book found — fields autofilled.",
  "not-found": "No book matched this ISBN.",
  invalid: "Enter a complete ISBN-10 or ISBN-13.",
  error: "Could not reach Google Books. Try again.",
};

const TONES: Record<IsbnLookupState, string> = {
  idle: "text-gray-500",
  typing: "text-gray-500",
  searching: "text-[#128CF1]",
  found: "text-green-700",
  "not-found": "text-red-600",
  invalid: "text-amber-600",
  error: "text-red-600",
};

function StatusIcon({ state }: { state: IsbnLookupState }) {
  if (state === "searching") {
    return <Loader2 className="size-4 animate-spin text-[#128CF1]" />;
  }
  if (state === "found") {
    return <CircleCheck className="size-4 text-green-600" />;
  }
  if (state === "not-found" || state === "error") {
    return <AlertCircle className="size-4 text-red-500" />;
  }
  if (state === "invalid") {
    return <AlertCircle className="size-4 text-amber-500" />;
  }
  return <Search className="size-4 text-gray-400" />;
}

export default function IsbnLookupCard({
  isbn,
  onIsbnChange,
  onClear,
  state,
  volume,
  hint,
}: IsbnLookupCardProps) {
  const message = MESSAGES[state];

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <Info className="mt-0.5 size-4 shrink-0 text-[#128CF1]" />
        <Text className="text-xs text-gray-600">{hint}</Text>
      </div>

      <div className="relative">
        <Input
          id="GoogleBooksISBN"
          value={isbn}
          onChange={(event) => onIsbnChange(event.target.value)}
          placeholder="Google Books ISBN"
          inputMode="numeric"
          autoComplete="off"
          className={`pr-9 ${
            state === "found"
              ? "border-green-500 focus-visible:border-green-500"
              : state === "not-found" || state === "error"
                ? "border-red-400"
                : ""
          }`}
        />
        <div className="absolute top-1/2 right-3 -translate-y-1/2">
          <StatusIcon state={state} />
        </div>
      </div>

      {message && (
        <Text className={`mt-2 text-xs ${TONES[state]}`}>{message}</Text>
      )}

      {state === "found" && volume && (
        <div className="mt-3 flex gap-2 rounded-lg border border-green-200 bg-green-50/60 p-2">
          {volume.thumbnail && (
            <img
              src={volume.thumbnail}
              alt={volume.title}
              className="h-16 w-11 shrink-0 rounded object-cover"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <Text
              className="line-clamp-2 text-xs font-[gothamMedium] text-[#003067]"
              title={volume.title}
            >
              {volume.title}
            </Text>
            <Text className="truncate text-[11px] text-gray-600">
              {volume.authors[0] || "Unknown author"}
            </Text>
            {volume.publicationYear && (
              <Text className="text-[11px] text-gray-500">
                {volume.publicationYear}
              </Text>
            )}
          </div>
        </div>
      )}

      {isbn && (
        <Button variant="link" size="sm" onClick={onClear} className="mt-2 px-0">
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
