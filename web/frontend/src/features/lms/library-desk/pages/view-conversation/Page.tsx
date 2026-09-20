import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Cake,
  GraduationCap,
  Hand,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  SquareCheck,
  Star,
  TimerOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import Modal from "@/components/ui/ValidationModal";
import ChatTranscript from "@/features/lms/library-desk/components/ChatTranscript";
import EndChatModal from "@/features/lms/library-desk/components/EndChatModal";
import DetailSidebar, {
  dateFact,
  FACT_ICONS,
  type DetailFact,
} from "@/features/lms/library-desk/components/DetailSidebar";
import { formatMillis } from "@/features/lms/library-desk/api/desk-helpers";
import { useDeskRail } from "@/features/lms/library-desk/api/desk-rail-context";
import { usePublishBreadcrumbLabel } from "@/hooks/breadcrumb-label";
import { useConversationView } from "@/features/lms/library-desk/pages/view-conversation/api/conversation-view-logic";
import { asset } from "@/lib/asset";

export default function ViewConversation() {
  const navigate = useNavigate();
  const view = useConversationView();
  const { chat } = view;
  const { collapsed } = useDeskRail();

  usePublishBreadcrumbLabel(
    chat?.ChatNumber ? `Chat #${chat.ChatNumber}` : null,
  );

  const back = () => navigate("/lms/library-desk/conversations");

  if (view.loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (view.error || !chat) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border bg-white p-10 text-center shadow-sm">
        <AlertTriangle className="size-7 text-red-500" />
        <Text className="text-sm text-gray-600">
          {view.error ?? "This conversation could not be found."}
        </Text>
        <Button variant="cancel" size="sm" onClick={back}>
          Back to Conversations
        </Button>
      </div>
    );
  }

  const locked = view.heldByOther;

  const expired = chat.ClosedByRole === "system";

  const person = chat.GuestInfo ?? chat.PatronInfo;
  const canReply = view.canManage && view.isMine && !view.isClosed;

  const facts: DetailFact[] = [
    { label: "Concern", value: chat.Concern || "—", icon: <MessageSquare /> },
    dateFact("Started", chat.StartedOn, FACT_ICONS.created),
    {
      label: "Handled by",
      value: chat.TakenByName || chat.TakenBy || "Nobody yet",
      icon: FACT_ICONS.author,
    },
    ...(view.isClosed
      ? [dateFact("Closed", chat.ClosedOn, FACT_ICONS.modified)]
      : []),
  ];

  const details = person
    ? [
        { label: "School/Work", value: person.School, icon: <GraduationCap /> },
        { label: "City", value: person.City, icon: <MapPin /> },
        { label: "Barangay", value: person.Barangay, icon: <MapPin /> },
        { label: "Age", value: person.Age, icon: <Cake /> },
      ]
    : [];

  const badge = (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-[gothamMedium] ${
        view.isClosed
          ?
            expired
            ? "border-slate-200 bg-slate-100 text-slate-600"
            : "border-red-200 bg-red-50 text-red-700"
          : chat.TakenBy
            ? view.isMine
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-[#128CF1]/40 bg-[#EAF4FE] text-[#0e6bb8]"
            : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {view.isClosed
        ? expired
          ? "Expired"
          : "Closed"
        : chat.TakenBy
          ? "Active"
          : "Waiting"}
    </span>
  );

  const readOnly = (() => {
    if (view.isClosed && expired) {
      return {
        icon: <TimerOff className="size-4 md:size-5" />,
        title: "Conversation expired",
        detail: `The guest stopped replying, so this closed itself ${formatMillis(chat.ClosedOn)}. The transcript is kept, and a new question starts a new conversation.`,
      };
    }
    if (view.isClosed) {
      return {
        icon: <SquareCheck className="size-4 md:size-5" />,
        title: "Conversation closed",
        detail: `Closed ${formatMillis(chat.ClosedOn)}. The transcript is kept, but neither side can send another message.`,
      };
    }
    if (!chat.TakenBy) {
      return {
        icon: <Hand className="size-4 md:size-5" />,
        title: "Nobody has taken this yet",
        detail:
          "Take the chat from the panel beside it to reply. Until then it sits in the queue for the whole desk.",
      };
    }
    return {
      icon: <Lock className="size-4 md:size-5" />,
      title: `${chat.TakenByName || "Another librarian"} is handling this`,
      detail:
        "Only the librarian who took a chat can reply to it. It opens to the desk once it is closed.",
    };
  })();

  return (
    <>
      {view.modal && (
        <Modal
          message={view.modal.message}
          type={view.modal.type}
          onClose={() => view.setModal(null)}
        />
      )}

      <div
        className={`mx-auto flex w-full flex-col gap-6 ${
          collapsed
            ? "lg:h-[calc(100vh-220px)] lg:flex-row lg:items-start"
            : "xl:h-[calc(100vh-220px)] xl:flex-row xl:items-start"
        }`}
      >
        <DetailSidebar
          sideBySideAt={collapsed ? "lg" : "xl"}
          badge={badge}
          title={chat.StartedByName || "Unknown"}
          kindLabel={chat.IsGuest ? "Guest conversation" : "Patron conversation"}
          artwork={asset("/assets/images/chats.png")}
          artworkWidth="w-56"
          artworkTop="-top-11"
          onBack={back}
          facts={facts}
          actions={
            view.canManage && !view.isClosed ? (
              <>
                {!chat.TakenBy && (
                  <Button
                    onClick={view.take}
                    disabled={view.actionBusy}
                    className="w-full bg-[#1668D6] text-white hover:bg-[#0F57B5]"
                  >
                    {view.actionBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Hand className="size-4" />
                    )}
                    Take this chat
                  </Button>
                )}
                {view.isMine && (
                  <Button
                    variant="outline"
                    onClick={view.openEnd}
                    className="w-full border-red-600/50 text-red-600 hover:border-red-600 hover:bg-red-200/10 hover:text-red-600"
                  >
                    <SquareCheck className="size-4" />
                    End conversation
                  </Button>
                )}
              </>
            ) : undefined
          }
        />

        <div
          className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-24px_rgba(0,48,103,0.45)] ${
            collapsed ? "lg:h-full" : "xl:h-full"
          }`}
        >
          <div className="shrink-0 bg-[#003067] px-6 py-4 sm:px-8 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white">
                  <MessageSquare className="size-5" />
                </div>
                <div className="min-w-0">
                  <Text className="truncate font-[gothamMedium] text-base text-white sm:text-lg">
                    {chat.Concern || "Conversation"}
                  </Text>
                  <Text className="text-xs text-white/70 sm:text-sm">
                    {chat.MessageCount} message
                    {chat.MessageCount === 1 ? "" : "s"}
                  </Text>
                </div>
              </div>

                {details.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {details.map((detail) => (
                      <span
                        key={detail.label}
                        title={detail.label}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 py-1 pl-1.5 pr-2.5"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-white [&_svg]:size-3">
                          {detail.icon}
                        </span>
                        <span className="truncate text-xs text-white/85">
                          {detail.value || "—"}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 text-left sm:self-center sm:text-right">
                <div className="flex items-center gap-2 sm:justify-end">
                  <Text className="font-[gothamMedium] text-base text-white sm:text-lg">
                    Rating:
                  </Text>
                  <span
                    className="flex items-center gap-1"
                    title={
                      chat.Rating
                        ? `${chat.Rating} out of 5`
                        : "Not rated by the patron"
                    }
                    aria-label={
                      chat.Rating
                        ? `Rated ${chat.Rating} out of 5`
                        : "Not rated by the patron"
                    }
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        aria-hidden
                        className={`size-5 sm:size-[1.375rem] ${
                          value <= chat.Rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-white/35"
                        }`}
                      />
                    ))}
                  </span>
                </div>

                {chat.RatingComment && (
                  <Text
                    title={chat.RatingComment}
                    className="mt-1 line-clamp-2 max-w-[18rem] text-left text-xs italic leading-snug text-white/75 [overflow-wrap:anywhere] sm:text-right sm:text-sm"
                  >
                    “{chat.RatingComment}”
                  </Text>
                )}
              </div>
            </div>
          </div>

          {locked ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Lock className="size-5" />
              </span>
              <Text className="font-[gothamMedium] text-[#011b38]">
                {chat.TakenByName || "Another librarian"} is handling this
                conversation
              </Text>
              <Text className="max-w-sm text-sm leading-relaxed text-gray-500">
                Only the librarian who took a chat can read it while it is
                running, so two people cannot answer the same patron at once.
                It opens to the whole desk once it is closed.
              </Text>
            </div>
          ) : (
          <ChatTranscript
            messages={view.messages}
            ownUid={view.ownUid}
            otherTyping={view.otherTyping}
            otherLabel={chat.StartedByName || "The patron"}
            otherAvatar={chat.PatronAvatar}
            canLoadEarlier={view.canLoadEarlier}
            onLoadEarlier={view.loadEarlier}
            loadingEarlier={view.loadingEarlier}
            draft={view.draft}
            onDraftChange={view.onDraftChange}
            onSend={view.send}
            sending={view.sending}
            disabled={!canReply}
            className="bg-[#F8FBFF]"
            disabledFooter={
              <div className="flex shrink-0 items-center gap-3 border-t bg-white px-6 py-4 sm:px-8 sm:py-5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:size-10">
                  {readOnly.icon}
                </div>
                <div className="min-w-0">
                  <Text className="font-[gothamMedium] text-base text-[#003067] md:text-lg">
                    {readOnly.title}
                  </Text>
                  <Text className="text-xs text-gray-500 md:text-sm">
                    {readOnly.detail}
                  </Text>
                </div>
              </div>
            }
          />
          )}
        </div>
      </div>

      <EndChatModal
        open={view.endOpen}
        patronName={chat.StartedByName}
        isProcessing={view.ending}
        onCancel={view.cancelEnd}
        onConfirm={view.confirmEnd}
      />
    </>
  );
}
