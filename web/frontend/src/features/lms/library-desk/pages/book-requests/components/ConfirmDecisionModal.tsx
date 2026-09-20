import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";
import RequestStatusBadge from "@/features/lms/library-desk/pages/book-requests/components/RequestStatusBadge";
import { formatMillisDate } from "@/features/lms/library-desk/api/desk-helpers";
import type {
  BookRequestGroup,
  BookRequestStatus,
} from "@/features/lms/library-desk/types/book-request-types";

const COPY: Record<
  BookRequestStatus,
  {
    title: string;
    description: string;
    verb: string;
    icon: typeof Check;
    tone: "default" | "danger" | "warning";
    button: string;
    aftermath: string;
  }
> = {
  Approved: {
    title: "Approve this request?",
    description:
      "Every request for this title is marked approved as soon as you confirm.",
    verb: "Approve",
    icon: Check,
    tone: "default",
    button:
      "border border-green-600 bg-green-600 text-white hover:bg-green-700 hover:no-underline",
    aftermath:
      "An approved title cannot be reopened from this tab — it is on its way to the collection. New requests for it keep arriving against the same record.",
  },
  Declined: {
    title: "Decline this request?",
    description:
      "Every request for this title is marked declined. The records stay on file.",
    verb: "Decline",
    icon: X,
    tone: "danger",
    button:
      "border border-red-600 bg-red-600 text-white hover:bg-red-700 hover:no-underline",
    aftermath:
      "Nothing leaves the queue: a declined title keeps its row, and you can reopen it whenever you want to look again.",
  },
  "Under Review": {
    title: "Put this back under review?",
    description:
      "The decision is cleared and the title returns to the undecided queue.",
    verb: "Reopen",
    icon: RotateCcw,
    tone: "warning",
    button:
      "border border-[#003067] bg-[#003067] text-white hover:bg-[#011b38] hover:no-underline",
    aftermath:
      "It rejoins the undecided pile, where it can be approved or declined again.",
  },
};

export default function ConfirmDecisionModal({
  group,
  status,
  processing,
  onCancel,
  onConfirm,
}: {
  group: BookRequestGroup | null;
  status: BookRequestStatus | null;
  processing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!group || !status) return null;

  const copy = COPY[status];
  const Icon = copy.icon;
  const requests = `${group.Count} request${group.Count === 1 ? "" : "s"}`;
  const patrons = `${group.Requesters} patron${group.Requesters === 1 ? "" : "s"}`;

  return (
    <ModalShell
      open
      size="sm"
      tone={copy.tone}
      title={copy.title}
      description={copy.description}
      icon={<Icon className="size-5" />}
      onClose={processing ? undefined : onCancel}
      actions={
        <>
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Go back
          </Button>
          <Button
            variant={null}
            onClick={onConfirm}
            disabled={processing}
            className={copy.button}
          >
            {processing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon className="size-4" />
                {copy.verb}
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border">
          <div className="flex items-start justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <Text className="truncate text-sm font-[gothamMedium] text-[#003067]">
                {group.Title}
              </Text>
              <Text className="truncate text-xs text-gray-500">
                {group.Author || "Unknown author"}
              </Text>
            </div>
            <Badge className="shrink-0 bg-[#EAF4FE] text-[#128CF1]">
              {requests}
            </Badge>
          </div>
        </div>

        <div>
          <Text className="text-xs font-[gothamMedium] text-[#003067]">
            Where it stands
          </Text>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={group.Status} />
            <Text className="text-xs text-gray-500">
              {patrons} asked · last on{" "}
              {formatMillisDate(group.LastRequestedOn)}
            </Text>
          </div>
        </div>

        <Text className="text-xs text-gray-500">
          That marks{" "}
          <span className="font-[gothamMedium] text-[#003067]">
            {requests} from {patrons}
          </span>{" "}
          as{" "}
          <span className="font-[gothamMedium] text-[#003067]">{status}</span>,
          and the patrons who asked keep their weekly slot either way.{" "}
          {copy.aftermath}
        </Text>
      </div>
    </ModalShell>
  );
}
