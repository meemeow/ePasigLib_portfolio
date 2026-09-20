import { useEffect, useState } from "react";
import { AlertTriangle, CalendarX2, Clock, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";
import { useLibraryStatus } from "@/hooks/use-library-status";

const PRESETS = [
  "Suspension of work",
  "Inclement weather",
  "Power interruption",
  "Emergency maintenance",
];

const REASON_MAX = 50;

const CONFIRM_DELAY_SECONDS = 5;

export default function CloseLibraryModal({
  open,
  processing,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  processing: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const status = useLibraryStatus(open || undefined);
  const blocked = status.isClosed;

  useEffect(() => {
    if (!open) return;
    setReason("");
    setConfirmed(false);
  }, [open]);

  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!open || !confirmed) {
      setSecondsLeft(0);
      return;
    }
    setSecondsLeft(CONFIRM_DELAY_SECONDS);
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, confirmed]);

  const waiting = secondsLeft > 0;
  const trimmed = reason.trim();
  const ready =
    !blocked && trimmed.length > 0 && confirmed && !processing && !waiting;

  const today = new Date().toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <ModalShell
      open={open}
      size="md"
      tone="danger"
      title="Close the library today?"
      description={`This takes effect immediately for ${today}.`}
      icon={<CalendarX2 className="size-5" />}
      onClose={processing ? undefined : onCancel}
      footerLeft={
        <Text as="label" className="flex cursor-pointer items-center gap-2">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(value) => setConfirmed(value === true)}
            disabled={processing || blocked}
          />
          <Text className="text-xs text-gray-600">
            I confirm the library is closed today
          </Text>
        </Text>
      }
      actions={
        <>
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Go back
          </Button>
          <Button
            variant={null}
            onClick={() => onConfirm(trimmed)}
            disabled={!ready}
            className={`gap-2 border font-[gothamMedium] text-white transition md:min-w-[170px] ${
              ready
                ? "border-red-600 bg-red-600 hover:bg-red-700 hover:no-underline"
                : "cursor-not-allowed border-gray-300 bg-gray-300 hover:bg-gray-300 hover:no-underline"
            }`}
          >
            {processing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Closing...
              </>
            ) : waiting ? (
              `Close in ${secondsLeft}s`
            ) : (
              <>
                <CalendarX2 className="size-4" />
                Close the library
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {blocked && (
          <div className="flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-amber-600"
              strokeWidth={2}
            />
            <div className="min-w-0">
              <Text className="text-xs font-[gothamMedium] text-amber-900">
                The library is already closed — {status.statusDetail.toLowerCase()}.
              </Text>
              <Text className="mt-1 text-xs leading-relaxed text-amber-800">
                There is nothing to close and no due date to move — none fall on
                a day the library is shut. Come back during opening hours, or
                edit the calendar directly if a future date needs closing.
              </Text>
            </div>
          </div>
        )}

        <div className="space-y-2.5 rounded-xl border bg-gray-50 p-3">
          <Row icon={<Clock className="size-4" />}>
            Books due <span className="font-[gothamMedium]">today</span> move to
            the{" "}
            <span className="font-[gothamMedium] text-[#003067]">next open day </span>
            — Saturday becomes Monday, a holiday run carries further. Loans due
            later are left alone.
          </Row>
          <Row icon={<CalendarX2 className="size-4" />}>
            The Library Operating Hours card on the public About page reads{" "}
            <span className="font-[gothamMedium] text-red-600">Closed</span> for
            the rest of today, with your reason under it.
          </Row>
          <Row icon={<Users className="size-4" />}>
            Every patron whose due date moves is notified, naming their book and
            its new date.
          </Row>
        </div>

        <div className="space-y-1">
          <Input
            label="Reason"
            required
            labelClassName="text-[#003067] font-[gothamMedium]"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={REASON_MAX}
            disabled={processing}
            placeholder="Suspension of work, inclement weather, power interruption..."
          />
          <div className="flex items-center justify-between gap-2">
            <Text className="text-xs text-gray-500">
              Shown on the OPAC About page.
            </Text>
            <Text className="shrink-0 text-xs text-gray-400">
              {reason.length}/{REASON_MAX}
            </Text>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              disabled={processing}
              className={`rounded-full border px-2.5 py-1 text-xs font-[gothamMedium] transition disabled:opacity-50 ${
                trimmed === preset
                  ? "border-[#003067] bg-[#003067] text-white"
                  : "border-gray-300 text-gray-600 hover:border-[#003067] hover:text-[#003067]"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <Text className="text-xs text-gray-500">
          Due dates that move stay moved, and a notification cannot be recalled.
          Reopening the library later is a separate edit.
        </Text>
      </div>
    </ModalShell>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 text-[#003067]">{icon}</span>
      <Text className="text-xs leading-relaxed text-gray-600">{children}</Text>
    </div>
  );
}
