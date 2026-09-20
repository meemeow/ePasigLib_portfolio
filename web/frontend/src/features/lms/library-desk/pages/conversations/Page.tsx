import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Hand, Loader2, MessageSquare, SquareCheck, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import Modal from "@/components/ui/ValidationModal";
import EndChatModal from "@/features/lms/library-desk/components/EndChatModal";
import type { RecordColumn } from "@/components/ui/RecordsTable";
import DeskScreen from "@/features/lms/library-desk/components/DeskScreen";
import {
  formatMillis,
  truncate,
} from "@/features/lms/library-desk/api/desk-helpers";
import { useConversationsPage } from "@/features/lms/library-desk/pages/conversations/api/conversations-logic";
import type { ChatRow } from "@/features/lms/library-desk/types/chat-types";

export default function Conversations() {
  const navigate = useNavigate();
  const page = useConversationsPage();
  const { list } = page;

  const columns = useMemo<RecordColumn<ChatRow>[]>(
    () => [
      {
        key: "number",
        header: "No.",
        headClassName: "w-px whitespace-nowrap text-center",
        cellClassName: "align-middle whitespace-nowrap text-center",
        cell: (row) =>
          row.ChatNumber ? (
            <span className="text-xs font-[gothamMedium] tabular-nums text-[#003067]">
              #{row.ChatNumber}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
      },
      {
        key: "patron",
        header: "Patron",
        headClassName: "min-w-[13rem]",
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                row.IsGuest
                  ? "bg-gray-100 text-gray-500"
                  : "bg-[#EAF4FE] text-[#128CF1]"
              }`}
            >
              <User className="size-4" />
            </span>
            <div className="min-w-0">
              <Text className="truncate font-[gothamMedium] text-[#011b38]">
                {row.StartedByName || "Unknown"}
              </Text>
              <Text className="text-xs text-gray-500">
                {row.IsGuest ? "Guest" : "Patron"}
              </Text>
            </div>
          </div>
        ),
      },
      {
        key: "concern",
        header: "Concern",
        headClassName: "min-w-[14rem]",
        cell: (row) => (
          <div className="min-w-0">
            <Text className="truncate font-[gothamMedium] text-[#003067]">
              {row.Concern || "—"}
            </Text>
            <Text className="truncate text-xs text-gray-500">
              {truncate(row.LastMessageText, 70) || "No messages yet"}
            </Text>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        headClassName: "text-center",
        cellClassName: "align-middle text-center",
        cell: (row) => {
          const mine = !!page.staffCode && row.TakenBy === page.staffCode;
          const expired = row.ClosedByRole === "system";
          const label =
            row.Status === "closed"
              ? expired
                ? "Expired"
                : "Closed"
              : row.Status === "active"
                ? "Active"
                : "Waiting";
          const tone =
            row.Status === "closed"
              ? expired
                ? "bg-slate-100 text-slate-600 border-slate-200"
                : "bg-red-50 text-red-700 border-red-200"
              : row.Status === "active"
                ? mine
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-[#EAF4FE] text-[#0e6bb8] border-[#128CF1]/40"
                : "bg-amber-50 text-amber-700 border-amber-200";
          return (
            <span
              title={
                expired
                  ? "Closed automatically — the guest stopped replying for an hour."
                  : undefined
              }
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-[gothamMedium] ${tone}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        key: "takenBy",
        header: "Handled by",
        cell: (row) => {
          const mine = !!page.staffCode && row.TakenBy === page.staffCode;
          const name = row.TakenByName || row.TakenBy;
          if (!name) return <span className="text-sm">—</span>;
          return (
            <div className="min-w-0">
              <Text
                className={`truncate text-sm ${
                  mine ? "font-[gothamMedium] text-[#003067]" : ""
                }`}
              >
                {mine ? `${name} (You)` : name}
              </Text>
              {row.TakenByName && row.TakenBy && (
                <Text className="truncate text-xs text-gray-500">
                  {row.TakenBy}
                </Text>
              )}
            </div>
          );
        },
      },
      {
        key: "unread",
        header: "Unread",
        headClassName: "text-center",
        cellClassName: "align-middle text-center",
        cell: (row) =>
          row.Unread > 0 ? (
            <span className="inline-flex min-w-[22px] justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-[gothamBlack] text-white">
              {row.Unread > 9 ? "9+" : row.Unread}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
      },
      {
        key: "lastMessage",
        header: "Last Message",
        cell: (row) => (
          <span className="whitespace-nowrap text-sm">
            {formatMillis(row.LastMessageAt)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        headClassName: "w-px whitespace-nowrap text-center",
        cellClassName: "align-middle whitespace-nowrap text-center",
        cell: (row) => {
          const busy = page.processingIds.has(row.id);
          const isMine = !!page.staffCode && row.TakenBy === page.staffCode;
          const shared = "shrink-0 text-xs";
          const held = row.Status === "active" && !isMine;
          return (
            <div className="inline-flex items-center gap-1.5">
              {held ? (
                <Text className="text-right text-xs leading-tight text-gray-400">
                  {row.TakenByName || "Another librarian"} is handling this
                </Text>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/lms/library-desk/conversations/view/${row.id}`)
                  }
                  className={`${shared} border-[#003067]/50 text-[#003067] hover:border-[#003067] hover:bg-[#EAF4FE] hover:text-[#003067]`}
                >
                  {row.Status === "closed" ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <MessageSquare className="size-3.5" />
                  )}
                  {row.Status === "closed" ? "View Chat Details" : "Open Chat"}
                </Button>
              )}

              {page.canManage && row.Status === "waiting" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => page.take(row)}
                  className={`${shared} border-green-600/40 text-green-700 hover:bg-green-50`}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Hand className="size-3.5" />
                  )}
                  Take Chat
                </Button>
              )}

              {page.canManage && row.Status === "active" && isMine && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => page.requestEnd(row)}
                  className={`${shared} border-red-600/50 text-red-600 hover:border-red-600 hover:bg-red-200/10 hover:text-red-600`}
                >
                  <SquareCheck className="size-3.5" />
                  Close Chat
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [navigate, page],
  );

  return (
    <>
      {page.modal && (
        <Modal
          message={page.modal.message}
          type={page.modal.type}
          onClose={() => page.setModal(null)}
        />
      )}

      <DeskScreen
        list={list}
        columns={columns}
        onCreate={() => undefined}
        canCreate={false}
        availableTags={page.availableConcerns}
      >
        <EndChatModal
          open={!!page.endTarget}
          patronName={page.endTarget?.StartedByName ?? ""}
          isProcessing={page.ending}
          onCancel={page.cancelEnd}
          onConfirm={page.confirmEnd}
        />
      </DeskScreen>
    </>
  );
}
