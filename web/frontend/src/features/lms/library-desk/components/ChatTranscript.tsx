import {
  Fragment,
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronUp, Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Text } from "@/components/ui/Text";
import { DEFAULT_AVATAR } from "@/lib/auth/auth-types";
import type { ChatMessage } from "@/features/lms/library-desk/types/chat-types";

interface ChatTranscriptProps {
  messages: ChatMessage[];
  ownUid: string;
  otherTyping: boolean;
  otherLabel: string;
  otherAvatar?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
  disabledReason?: string;
  disabledFooter?: ReactNode;
  canLoadEarlier?: boolean;
  onLoadEarlier?: () => void;
  loadingEarlier?: boolean;
  className?: string;
}

function Avatar({ src, label }: { src: string; label: string }) {
  return (
    <span className="relative block size-11 shrink-0 overflow-hidden rounded-full bg-[#EAF4FE] shadow-sm ring-2 ring-[#128CF1]/45 ring-offset-1 ring-offset-white">
      <img
        src={src || DEFAULT_AVATAR}
        alt=""
        aria-hidden
        title={label}
        draggable={false}
        onError={(event) => {
          const img = event.currentTarget;
          if (img.src.endsWith(DEFAULT_AVATAR)) return;
          img.src = DEFAULT_AVATAR;
        }}
        className="size-full select-none object-cover"
      />
    </span>
  );
}

const QUIET_GAP_MS = 3 * 60 * 1000;

const SAME_BREATH_MS = 60 * 1000;

const LINE_HEIGHT = 24;
const BOX_PADDING = 16;
const MAX_LINES = 3;
const MIN_BOX = LINE_HEIGHT + BOX_PADDING;
const MAX_BOX = LINE_HEIGHT * MAX_LINES + BOX_PADDING;

const MANILA = "Asia/Manila";

function timeOf(millis: number): string {
  return new Date(millis).toLocaleTimeString("en-US", {
    timeZone: MANILA,
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayOf(millis: number): string {
  return new Date(millis).toLocaleDateString("en-US", { timeZone: MANILA });
}

function stampOf(millis: number): string {
  const time = timeOf(millis);
  if (dayOf(millis) === dayOf(Date.now())) return time;
  const date = new Date(millis).toLocaleDateString("en-US", {
    timeZone: MANILA,
    month: "short",
    day: "numeric",
  });
  return `${date} · ${time}`;
}

function fullStampOf(millis: number | null): string | undefined {
  if (millis === null) return undefined;
  const date = new Date(millis).toLocaleDateString("en-US", {
    timeZone: MANILA,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${date} at ${timeOf(millis)}`;
}

export default function ChatTranscript({
  messages,
  ownUid,
  otherTyping,
  otherLabel,
  otherAvatar,
  draft,
  onDraftChange,
  onSend,
  sending,
  disabled,
  disabledReason,
  disabledFooter,
  canLoadEarlier = false,
  onLoadEarlier,
  loadingEarlier = false,
  className = "",
}: ChatTranscriptProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prependRef = useRef<number | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fieldRef.current?.querySelector("textarea");
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_BOX), MAX_BOX)}px`;
  }, [draft, disabled]);

  useEffect(() => {
    const list = listRef.current;
    const anchor = prependRef.current;
    if (anchor !== null && list) {
      prependRef.current = null;
      list.scrollTop += list.scrollHeight - anchor;
      return;
    }
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, otherTyping]);

  const loadEarlier = () => {
    if (!onLoadEarlier || loadingEarlier) return;
    prependRef.current = listRef.current?.scrollHeight ?? null;
    onLoadEarlier();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || sending || disabled) return;
    onSend();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (draft.trim() && !sending && !disabled) onSend();
    }
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {canLoadEarlier && (
          <div className="mb-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadEarlier}
              disabled={loadingEarlier}
              className="gap-1.5 rounded-full border-gray-200 bg-white/80 px-3 text-xs text-[#003067] hover:border-[#128CF1]/50 hover:bg-white"
            >
              {loadingEarlier ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading
                </>
              ) : (
                <>
                  <ChevronUp className="size-3.5" />
                  Load earlier messages
                </>
              )}
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          <Text className="py-10 text-center text-sm text-gray-500">
            No messages yet.
          </Text>
        ) : (
          messages.map((message, index) => {
            const mine = !!ownUid && message.SenderUID === ownUid;
            const previous = messages[index - 1];
            const showDivider =
              message.CreatedOn !== null &&
              (!previous ||
                previous.CreatedOn === null ||
                message.CreatedOn - previous.CreatedOn >= QUIET_GAP_MS);

            const next = messages[index + 1];
            const runsOn =
              !!next &&
              next.SenderUID === message.SenderUID &&
              next.CreatedOn !== null &&
              message.CreatedOn !== null &&
              next.CreatedOn - message.CreatedOn < QUIET_GAP_MS;
            const hasAvatar = !mine && otherAvatar !== undefined;
            const showAvatar = hasAvatar && !runsOn;

            const sameSpeaker =
              !!previous && previous.SenderUID === message.SenderUID;
            const sincePrevious =
              previous && previous.CreatedOn !== null && message.CreatedOn !== null
                ? message.CreatedOn - previous.CreatedOn
                : 0;
            const spacing = showDivider
              ? ""
              : !sameSpeaker
                ? "mt-3"
                : sincePrevious < SAME_BREATH_MS
                  ? "mt-0.5"
                  : "mt-2";
            return (
              <Fragment key={message.id}>
              {showDivider && message.CreatedOn !== null && (
                <div
                  className={`mb-3 text-center text-[11px] leading-none text-gray-400 ${
                    index === 0 ? "" : "mt-5"
                  }`}
                >
                  {stampOf(message.CreatedOn)}
                </div>
              )}
              <div
                className={`flex flex-col ${mine ? "items-end" : "items-start"} ${
                  index === 0 ? "" : spacing
                }`}
              >
                <div className="flex max-w-[85%] items-end gap-2">
                  {showAvatar && <Avatar src={otherAvatar ?? ""} label={otherLabel} />}
                  {hasAvatar && !showAvatar && (
                    <span aria-hidden className="w-11 shrink-0" />
                  )}
                  <div
                    title={fullStampOf(message.CreatedOn)}
                    className={`min-w-0 px-3.5 py-2.5 ${
                      mine
                        ? "rounded-2xl rounded-br-md bg-[#128CF1] text-white"
                        : "rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 text-[#011b38]"
                    } ${
                      sameSpeaker && !showDivider
                        ? mine
                          ? "rounded-tr-md"
                          : "rounded-tl-md"
                        : ""
                    } ${
                      message.pending ? "opacity-70" : ""
                    }`}
                  >
                    <Text className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.Text}
                    </Text>
                  </div>
                </div>
                {message.pending && (
                  <Text className="mt-1 px-1 text-[10px] text-gray-400">
                    Sending...
                  </Text>
                )}
              </div>
              </Fragment>
            );
          })
        )}

        {otherTyping && (
          <div className="mt-3 flex items-end justify-start gap-2">
            {otherAvatar !== undefined && (
              <Avatar src={otherAvatar} label={otherLabel} />
            )}
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 px-3.5 py-3">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-1.5 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
              <span className="sr-only">{otherLabel} is typing</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {disabled && disabledFooter ? (
        disabledFooter
      ) : (
      <form
        onSubmit={submit}
        className="shrink-0 border-t border-gray-100 bg-white p-3"
      >
        {disabled ? (
          <Text className="py-1.5 text-center text-xs leading-relaxed text-gray-500">
            {disabledReason ?? "This conversation is closed."}
          </Text>
        ) : (
          <div className="flex items-end gap-2">
            <div
              ref={fieldRef}
              className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-1 shadow-sm transition-[border-color,box-shadow] focus-within:border-[#128CF1]/60 focus-within:ring-4 focus-within:ring-[#128CF1]/10"
            >
              <Textarea
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Type your message..."
                disabled={sending}
                className="resize-none overflow-y-auto border-0 bg-transparent px-2.5 py-2 text-sm leading-6 shadow-none focus-visible:border-0 focus-visible:ring-0 sm:text-sm"
                style={{ minHeight: MIN_BOX, maxHeight: MAX_BOX }}
              />
            </div>
            <Button
              type="submit"
              variant={null}
              disabled={!draft.trim() || sending}
              className="h-[42px] shrink-0 gap-2 rounded-xl bg-[#128CF1] px-4 font-[gothamMedium] text-sm text-white shadow-sm transition hover:bg-[#0e6bb8] hover:no-underline active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
              {sending ? "Sending" : "Send"}
            </Button>
          </div>
        )}
      </form>
      )}
    </div>
  );
}
