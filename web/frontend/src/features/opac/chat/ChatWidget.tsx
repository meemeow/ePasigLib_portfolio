import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertTriangle,
  HelpCircle,
  Loader2,
  MessageSquare,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { DEFAULT_AVATAR } from "@/lib/auth/auth-types";
import { useAuth } from "@/lib/auth/use-auth";
import ChatTranscript from "@/features/lms/library-desk/components/ChatTranscript";
import ChatStartForm from "@/features/opac/chat/components/ChatStartForm";
import { useOpacChat } from "@/features/opac/chat/api/opac-chat-logic";
import { useChatLauncher } from "@/features/opac/chat/api/chat-launcher";
import { useNotificationSummary } from "@/hooks/use-notification-summary";
import FaqChat from "@/features/opac/chat/components/FaqChat";
import ChatRatingCard from "@/features/opac/chat/components/ChatRatingCard";

const NAVY = "#002248";
const BLUE = "#128CF1";

const POP_FADE =
  "linear-gradient(to bottom, #000 87.5%, rgba(0, 0, 0, 0) 97.5%)";

const HAIR_TRIM =
  "linear-gradient(to right, rgba(0, 0, 0, 0) 32%, #000 36.4%)";

const TEASER_LINES = [
  "Hi! I'm Mutya — Questions about the library? Chat with a librarian here!",
  "FAQ's? Cannot find what you're looking for? The desk is happy to help.",
  "Leave a message and a librarian will reply.",
] as const;

const TEASER_FIRST_MS = 1_000;
const TEASER_HOLD_MS = 60_000;
const TEASER_SWAP_MS = 300;
const TEASER_SETTLE_MS = 30;
const TEASER_DISMISS_MS = 10 * 60_000;
const TEASER_AFTER_PANEL_MS = 10 * 60_000;
const TEASER_AFTER_CHAT_MS = 5 * 60_000;

export default function ChatWidget() {
  const chat = useOpacChat();
  const { pathname } = useLocation();
  const { user, userType } = useAuth();
  const { refresh: refreshCounts } = useNotificationSummary();

  const [confirmEnd, setConfirmEnd] = useState(false);

  const [ratingDismissed, setRatingDismissed] = useState(false);

  const [mode, setMode] = useState<"faqs" | "librarian">(() =>
    chat.chatId ? "librarian" : "faqs",
  );

  const handleLaunch = useCallback((tab: "faqs" | "librarian") => {
    setMode(tab);
    chat.setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useChatLauncher(handleLaunch);

  useEffect(() => {
    if (!chat.open || mode !== "librarian" || !chat.chat) return;
    chat.markConversationRead();
    void refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.open, mode, chat.chat?.id]);

  const cartInTheCorner =
    pathname.startsWith("/opac/collections") &&
    Boolean(user) &&
    userType === "Patron";
  const alignLeft = cartInTheCorner;

  const facing = alignLeft ? "" : "scale-x-[-1]";

  const [teaser, setTeaser] = useState<{
    line: number;
    phase: "hidden" | "shown" | "exit";
  } | null>(null);
  const clock = useRef({ next: 0, quietUntil: 0 });
  const before = useRef({ open: false, ongoing: false });
  const justEnded = useRef(false);
  const dismissTeaser = useRef<(() => void) | null>(null);

  const [endedChat, setEndedChat] = useState<string | null>(null);
  useEffect(() => {
    if (chat.isClosed && chat.chatId) setEndedChat(chat.chatId);
  }, [chat.isClosed, chat.chatId]);

  useEffect(() => {
    if (chat.isClosed) setConfirmEnd(false);
  }, [chat.isClosed]);
  const ongoing = !!chat.chatId && chat.chatId !== endedChat;

  useEffect(() => {
    const quiet = (ms: number) => {
      clock.current.quietUntil = Math.max(
        clock.current.quietUntil,
        Date.now() + ms,
      );
    };
    if (before.current.ongoing && !ongoing) {
      quiet(TEASER_AFTER_CHAT_MS);
      justEnded.current = true;
    }
    if (before.current.open && !chat.open && !ongoing) {
      quiet(justEnded.current ? TEASER_AFTER_CHAT_MS : TEASER_AFTER_PANEL_MS);
      justEnded.current = false;
    }
    before.current = { open: chat.open, ongoing };

    if (chat.open || ongoing) {
      setTeaser(null);
      return;
    }

    let timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    const show = (line: number): void => {
      clock.current.next = (line + 1) % TEASER_LINES.length;

      setTeaser({ line, phase: "hidden" });
      at(TEASER_SETTLE_MS, () => setTeaser({ line, phase: "shown" }));
      at(TEASER_SETTLE_MS + TEASER_HOLD_MS, () => {
        setTeaser({ line, phase: "exit" });
        at(TEASER_SWAP_MS, () => show(clock.current.next));
      });
    };

    dismissTeaser.current = () => {
      timers.forEach(clearTimeout);
      timers = [];
      setTeaser((standing) =>
        standing ? { line: standing.line, phase: "exit" } : null,
      );
      quiet(TEASER_DISMISS_MS);
      at(TEASER_SWAP_MS + TEASER_DISMISS_MS, () => show(clock.current.next));
    };

    at(
      Math.max(clock.current.quietUntil - Date.now(), TEASER_FIRST_MS),
      () => show(clock.current.next),
    );

    return () => {
      timers.forEach(clearTimeout);
      timers = [];
      dismissTeaser.current = null;
      setTeaser(null);
    };
  }, [chat.open, ongoing]);

  const launcher = (
    <div
      className={cn(
        "fixed z-40",
        alignLeft ? "left-8 xs:left-9 sm:left-12" : "right-8 xs:right-9 sm:right-12",
        chat.open && "hidden sm:block",
      )}
      style={{ bottom: "calc(2.25rem + env(safe-area-inset-bottom))" }}
    >
      <Button
        onClick={() => chat.setOpen(!chat.open)}
        aria-label={chat.open ? "Close the chat" : "Ask a librarian"}
        aria-expanded={chat.open}
        title={chat.open ? "Close the chat" : "Ask a librarian"}
        className={cn(
          "group relative h-14 w-14 xs:h-16 xs:w-16 p-0 rounded-full text-white hover:no-underline",
          "bg-gradient-to-br from-[#128CF1] via-[#0F76CC] to-[#003067]",
          "shadow-[0_10px_30px_-6px_rgba(0,48,103,0.5)] ring-4 ring-white/70",
          "transition-[transform,box-shadow] duration-300 ease-out",
          "hover:scale-105 hover:shadow-[0_16px_40px_-8px_rgba(0,48,103,0.65)]",
          "active:scale-95",
        )}
      >

        <span className="relative block size-full overflow-hidden rounded-full">
          <img
            src={
              chat.open
                ? "/assets/images/mutya2.png"
                : "/assets/images/mutya.png"
            }
            alt=""
            aria-hidden
            draggable={false}
            className={cn(
              "pointer-events-none absolute left-1/2 top-1/2 w-[500%] max-w-none -translate-x-1/2 select-none",
              chat.open
                ? "-translate-y-[33.1%]"
                : "-translate-y-[18%] transition-transform duration-300 ease-out group-hover:-translate-y-[33.1%]",
              facing,
            )}
          />
        </span>

        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-0 left-[-200%] right-[-200%] top-[-100%]",
            facing,
          )}
          style={{
            maskImage: POP_FADE,
            WebkitMaskImage: POP_FADE,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        >
          <span
            className="absolute inset-0"
            style={{
              maskImage: HAIR_TRIM,
              WebkitMaskImage: HAIR_TRIM,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          >
            <span className="absolute left-[40%] top-1/2 h-1/2 w-[20%]">
              <img
                src={
                  chat.open
                    ? "/assets/images/mutya2.png"
                    : "/assets/images/mutya.png"
                }
                alt=""
                draggable={false}
                className={cn(
                  "absolute left-1/2 top-1/2 w-[500%] max-w-none -translate-x-1/2 select-none",
                  chat.open
                    ? "-translate-y-[33.1%] opacity-100"
                    : "-translate-y-[18%] opacity-0 transition-[opacity,translate] duration-300 ease-out group-hover:-translate-y-[33.1%] group-hover:opacity-100",
                )}
              />
            </span>
          </span>
        </span>
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-green-500 ring-2 ring-white"
        />
      </Button>
    </div>
  );

  const active = chat.chat;
  const closed = chat.isClosed;
  const askRating = chat.canRate && !ratingDismissed;

  return (
    <>
      {launcher}

      <div
        aria-hidden
        className={cn(
          "fixed z-40 max-w-[15rem]",
          alignLeft
            ? "left-[7rem] xs:left-[7.75rem] sm:left-[8.75rem]"
            : "right-[7rem] xs:right-[7.75rem] sm:right-[8.75rem]",
          teaser?.phase === "shown" &&
            "translate-y-0 opacity-100 transition-[opacity,translate] duration-300 ease-out",
          teaser?.phase === "exit" &&
            "pointer-events-none -translate-y-4 opacity-0 transition-[opacity,translate] duration-300 ease-out",
          (!teaser || teaser.phase === "hidden") &&
            "pointer-events-none translate-y-4 opacity-0",
        )}
        style={{ bottom: "calc(2.75rem + env(safe-area-inset-bottom))" }}
      >
        <div
          onClick={() => chat.setOpen(true)}
          className="relative cursor-pointer rounded-2xl bg-white py-2.5 pl-3.5 pr-7 shadow-[0_10px_30px_-8px_rgba(0,34,72,0.45)]"
        >
          <Text
            className="text-[12px] font-[gothamMedium] leading-snug"
            style={{ color: NAVY }}
          >
            {teaser ? TEASER_LINES[teaser.line] : ""}
          </Text>

          <button
            type="button"
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation();
              dismissTeaser.current?.();
            }}
            className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="size-3" />
          </button>

          <span
            className={cn(
              "absolute bottom-3.5 size-2.5 rotate-45 bg-white",
              alignLeft ? "-left-1" : "-right-1",
            )}
          />
        </div>
      </div>

      {chat.open && (
      <div
        className={cn(
          "fixed inset-x-3 bottom-7 z-40 flex h-[min(42rem,calc(100vh-4rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-x-auto sm:w-[min(30rem,calc(100vw-10.5rem))]",
          alignLeft ? "sm:left-[9.75rem]" : "sm:right-[9.75rem]",
        )}
      >
        <div
          className="flex shrink-0 items-center gap-3 px-5 py-4 text-white"
          style={{ backgroundColor: NAVY }}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
            <MessageSquare className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <Text className="truncate text-base font-[gothamBlack] leading-tight text-white">
              {mode === "faqs" ? "Ask Mutya" : "Ask a librarian"}
            </Text>
            <Text className="truncate text-xs leading-tight text-white/60">
              {mode === "faqs"
                ? "Quick answers, even when we're closed"
                : closed
                  ? "This conversation has ended"
                  : "We usually reply during library hours"}
            </Text>
          </div>

          {closed && mode === "librarian" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={chat.reset}
              aria-label="Start a new chat"
              className="size-9 shrink-0 rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => chat.setOpen(false)}
            aria-label="Close chat"
            className="size-9 shrink-0 rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </Button>
        </div>

        {chat.error && (
          <div className="flex shrink-0 items-start gap-2 border-b border-red-100 bg-red-50 px-4 py-2.5">
            <Text className="flex-1 text-xs leading-relaxed text-red-700">
              {chat.error}
            </Text>
            <button
              type="button"
              onClick={() => chat.setError(null)}
              aria-label="Dismiss"
              className="mt-0.5 shrink-0 text-red-400 transition hover:text-red-700"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <div
          role="tablist"
          aria-label="Chat sections"
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const next = mode === "faqs" ? "librarian" : "faqs";
            setMode(next);
            document.getElementById(`chat-tab-${next}`)?.focus();
          }}
          className="flex shrink-0 gap-1 border-b border-gray-200 bg-gray-50 px-3 pt-2"
        >
          {(
            [
              { key: "faqs", label: "FAQs", icon: HelpCircle },
              {
                key: "librarian",
                label: "Ask a librarian",
                icon: MessageSquare,
              },
            ] as const
          ).map(({ key, label, icon: Icon }) => {
            const active = mode === key;
            return (
              <Button
                key={key}
                id={`chat-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                variant={null}
                size={null}
                onClick={() => setMode(key)}
                className={cn(
                  "-mb-px flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2.5 text-sm font-normal font-[gothamMedium] transition hover:no-underline sm:px-4",
                  active
                    ? "border-gray-200 bg-white text-[#128CF1]"
                    : "border-transparent text-gray-500 hover:text-[#003067]",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Button>
            );
          })}
        </div>

        {mode === "faqs" ? (
          <FaqChat />
        ) : !chat.chatId ? (
          <ChatStartForm
            isSignedIn={chat.isSignedIn}
            patronName={chat.patronName}
            submitting={chat.starting}
            onSubmit={chat.start}
          />
        ) : chat.loading ? (
          <div className="flex flex-1 items-center justify-center p-10">
            <Text className="text-sm text-gray-500">Loading conversation...</Text>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-2.5 border-b border-gray-100 bg-white px-4 py-3">
              <span className="relative flex shrink-0">
                {active?.TakenByName ? (
                  <span className="block size-9 overflow-hidden rounded-full bg-[#EAF4FE] shadow-sm ring-2 ring-[#128CF1]/45 ring-offset-1 ring-offset-white">
                    <img
                      src={active.TakenByAvatar || DEFAULT_AVATAR}
                      alt=""
                      aria-hidden
                      draggable={false}
                      onError={(event) => {
                        const img = event.currentTarget;
                        if (img.src.endsWith(DEFAULT_AVATAR)) return;
                        img.src = DEFAULT_AVATAR;
                      }}
                      className="size-full select-none object-cover"
                    />
                  </span>
                ) : (
                  <span
                    className="flex size-9 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: BLUE }}
                  >
                    <MessageSquare className="size-4" />
                  </span>
                )}
                {active?.TakenByName && (
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <Text
                  as="div"
                  className="truncate text-sm font-[gothamMedium] leading-tight"
                  style={{ color: NAVY }}
                >
                  {active?.TakenByName || "Librarian"}
                </Text>
                <Text
                  as="div"
                  className="flex items-center gap-1.5 text-[11px] leading-tight text-gray-500"
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      active?.TakenByName ? "bg-green-500" : "bg-amber-400"
                    }`}
                  />
                  {closed
                    ? "Conversation ended"
                    : active?.TakenByName
                      ? "Online"
                      : "Connecting you..."}
                </Text>
              </div>

              {!closed && (
                <Button
                  type="button"
                  variant={null}
                  size={null}
                  onClick={() => setConfirmEnd(true)}
                  className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-normal font-[gothamMedium] text-red-600 transition hover:border-red-300 hover:bg-red-100 hover:no-underline"
                >
                  End chat
                </Button>
              )}
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              className={`flex min-h-0 flex-1 flex-col transition-[filter] duration-200 motion-reduce:transition-none ${
                askRating ? "pointer-events-none select-none blur-[3px]" : ""
              }`}
              aria-hidden={askRating}
              inert={askRating || undefined}
            >
            <ChatTranscript
              messages={chat.messages}
              ownUid={chat.ownUid}
              otherTyping={chat.otherTyping}
              otherLabel={active?.TakenByName || "The librarian"}
              canLoadEarlier={chat.canLoadEarlier}
              onLoadEarlier={chat.loadEarlier}
              loadingEarlier={chat.loadingEarlier}
              otherAvatar={
                active?.TakenByName ? active.TakenByAvatar : undefined
              }
              draft={chat.draft}
              onDraftChange={chat.onDraftChange}
              onSend={chat.send}
              sending={chat.sending}
              disabled={closed}
              disabledFooter={
                <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
                  <Text className="text-center text-xs leading-relaxed text-gray-500">
                    This conversation has ended. Tap{" "}
                    <button
                      type="button"
                      onClick={chat.reset}
                      aria-label="Start a new chat"
                      className="mx-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-gray-200 align-middle text-[#128CF1] transition hover:border-[#128CF1]/50 hover:bg-[#EAF4FE]"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>{" "}
                    at the top to start a new one.
                  </Text>
                </div>
              }
              className="bg-white"
            />
            </div>

            {askRating && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/55 p-4">
                <ChatRatingCard
                  onRate={chat.rate}
                  busy={chat.rating}
                  onDismiss={() => setRatingDismissed(true)}
                />
              </div>
            )}
            </div>
          </>
        )}
      </div>
      )}

      <ModalShell
        open={confirmEnd}
        size="sm"
        tone="danger"
        title="End this conversation?"
        description="The librarian will be told it has finished."
        icon={<AlertTriangle className="size-5" />}
        onClose={chat.ending ? undefined : () => setConfirmEnd(false)}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmEnd(false)}
              disabled={chat.ending}
            >
              Keep chatting
            </Button>
            <Button
              variant={null}
              onClick={() => {
                void (async () => {
                  await chat.end();
                  setConfirmEnd(false);
                })();
              }}
              disabled={chat.ending}
              className="gap-2 border border-red-600 bg-red-600 font-[gothamMedium] text-white transition hover:bg-red-700 hover:no-underline disabled:cursor-not-allowed"
            >
              {chat.ending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Ending...
                </>
              ) : (
                "End chat"
              )}
            </Button>
          </>
        }
      >
        <Text className="text-sm leading-relaxed text-gray-600">
          You can read this conversation afterwards, but you will not be able to
          add to it. If you have another question later, start a new chat and a
          librarian will pick it up.
        </Text>
      </ModalShell>
    </>
  );
}
