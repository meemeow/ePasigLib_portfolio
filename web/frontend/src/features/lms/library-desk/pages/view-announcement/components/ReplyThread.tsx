import { MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import AttachmentList from "@/features/lms/library-desk/components/AttachmentList";
import { formatMillis } from "@/features/lms/library-desk/api/desk-helpers";
import type {
  AnnouncementReplyRecord,
} from "@/features/lms/library-desk/types/updates-types";

interface ReplyThreadProps {
  replies: AnnouncementReplyRecord[];
  canManage: boolean;
  disabled: boolean;
  onAdd: () => void;
  onEdit: (reply: AnnouncementReplyRecord) => void;
  onDelete: (reply: AnnouncementReplyRecord) => void;
}

export default function ReplyThread({
  replies,
  canManage,
  disabled,
  onAdd,
  onEdit,
  onDelete,
}: ReplyThreadProps) {
  return (
    <section className="mt-7 border-t pt-6">
      <div className="flex items-center justify-between gap-3">
        <Text className="flex items-center gap-2 text-lg font-[gothamBlack] text-[#011b38]">
          <MessageSquare className="size-4 text-[#128CF1]" />
          Replies
          <span className="rounded-full bg-[#EAF4FE] px-2 py-0.5 text-xs font-[gothamMedium] text-[#003067]">
            {replies.length}
          </span>
        </Text>
        {canManage && !disabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="border-[#003067]/50 text-xs text-[#003067] hover:bg-[#EAF4FE]"
          >
            <Plus className="size-3.5" />
            Add Reply
          </Button>
        )}
      </div>

      {replies.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed bg-gray-50 p-8 text-center">
          <Text className="text-sm text-gray-500">
            No replies yet.
            {canManage && !disabled
              ? " Add one to follow up on this announcement."
              : ""}
          </Text>
        </div>
      ) : (
        <ol className="mt-3 space-y-3">
          {replies.map((reply) => (
            <li
              key={reply.ReplyID}
              className="rounded-xl border border-gray-200 bg-gray-50/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Text className="font-[gothamMedium] text-[#011b38]">
                    {reply.Subject || "Untitled reply"}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {reply.AuthorName || "Unknown"} ·{" "}
                    {formatMillis(reply.CreatedOn)}
                    {reply.ModifiedOn
                      ? ` · edited by ${reply.ModifiedBy || "staff"} ${formatMillis(reply.ModifiedOn)}`
                      : ""}
                  </Text>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(reply)}
                      aria-label={`Edit reply ${reply.Subject}`}
                      className="border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(reply)}
                      aria-label={`Delete reply ${reply.Subject}`}
                      className="border-red-200 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <Text className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                {reply.Message}
              </Text>
              <AttachmentList files={reply.Files} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
