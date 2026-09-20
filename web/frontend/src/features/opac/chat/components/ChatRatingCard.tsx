import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

const COMMENT_LIMIT = 50;

const STARS = [1, 2, 3, 4, 5];

interface ChatRatingCardProps {
  onRate: (stars: number, comment: string) => Promise<boolean>;
  busy: boolean;
  onDismiss: () => void;
}

export default function ChatRatingCard({
  onRate,
  busy,
  onDismiss,
}: ChatRatingCardProps) {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const shown = hovered || stars;

  return (
    <div className="w-full max-w-[19rem] rounded-2xl border border-[#128CF1]/20 bg-white p-4 shadow-[0_18px_40px_-24px_rgba(0,48,103,0.55)]">
      <Text
        as="div"
        className="text-center text-sm font-[gothamMedium] text-[#011b38]"
      >
        How did we do?
      </Text>
      <Text className="mt-1 text-center text-xs leading-relaxed text-gray-500">
        Please select a rating out of 5 stars.
      </Text>

      <div
        role="radiogroup"
        aria-label="Rating out of 5 stars"
        className="mt-3 flex items-center justify-center gap-1"
        onMouseLeave={() => setHovered(0)}
      >
        {STARS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={stars === value}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            disabled={busy}
            onMouseEnter={() => setHovered(value)}
            onFocus={() => setHovered(value)}
            onBlur={() => setHovered(0)}
            onClick={() => setStars(value)}
            className="rounded-full p-1 transition-[scale] duration-150 hover:scale-110 disabled:cursor-not-allowed motion-reduce:transition-none"
          >
            <Star
              className={`size-7 transition-colors ${
                value <= shown
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="mt-3">
        <textarea
          value={comment}
          onChange={(event) =>
            setComment(event.target.value.slice(0, COMMENT_LIMIT))
          }
          maxLength={COMMENT_LIMIT}
          rows={2}
          disabled={busy}
          placeholder="Add a comment (optional)"
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#011b38] outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-[#128CF1]/60 focus:ring-4 focus:ring-[#128CF1]/10 disabled:opacity-60"
        />
        <Text
          className={`mt-0.5 text-right text-[10px] tabular-nums ${
            comment.length === COMMENT_LIMIT ? "text-amber-600" : "text-gray-400"
          }`}
        >
          {comment.length}/{COMMENT_LIMIT}
        </Text>
      </div>

      <Button
        type="button"
        variant={null}
        disabled={!stars || busy}
        onClick={() => void onRate(stars, comment.trim())}
        className="mt-1 w-full rounded-xl bg-[#128CF1] font-[gothamMedium] text-sm text-white transition hover:bg-[#0e6bb8] hover:no-underline disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving
          </>
        ) : (
          "Rate"
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        disabled={busy}
        onClick={onDismiss}
        className="mt-1 w-full text-xs font-normal text-gray-500 hover:bg-transparent hover:text-[#003067] hover:no-underline"
      >
        Maybe later
      </Button>
    </div>
  );
}
