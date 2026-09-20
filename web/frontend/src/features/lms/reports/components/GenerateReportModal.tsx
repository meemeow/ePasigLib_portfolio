import { useMemo, useState } from "react";
import { FileText, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";
import { REPORT_SECTIONS } from "@/features/lms/reports/api/report-sections";
import { buildReportHtml } from "@/features/lms/reports/api/report-print";
import type {
  ReportSection,
  ReportSummary,
} from "@/features/lms/reports/types/report-types";

interface GenerateReportModalProps {
  open: boolean;
  onClose: () => void;
  summary: ReportSummary;
}

export default function GenerateReportModal({
  open,
  onClose,
  summary,
}: GenerateReportModalProps) {
  const [chosen, setChosen] = useState<ReportSection[]>(() =>
    REPORT_SECTIONS.map((entry) => entry.section),
  );
  const [printing, setPrinting] = useState(false);

  const allOn = chosen.length === REPORT_SECTIONS.length;

  const toggle = (section: ReportSection) => {
    setChosen((current) =>
      current.includes(section)
        ? current.filter((entry) => entry !== section)
        : [...current, section],
    );
  };

  const html = useMemo(
    () => buildReportHtml(summary, chosen),
    [summary, chosen],
  );

  const print = () => {
    setPrinting(true);
    try {
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
      document.body.appendChild(frame);

      const remove = () => {
        window.setTimeout(() => frame.remove(), 1000);
      };

      frame.onload = () => {
        const view = frame.contentWindow;
        if (!view) {
          remove();
          setPrinting(false);
          return;
        }
        view.focus();
        view.print();
        remove();
        setPrinting(false);
      };

      const doc = frame.contentDocument;
      if (!doc) {
        frame.remove();
        setPrinting(false);
        return;
      }
      doc.open();
      doc.write(html);
      doc.close();
    } catch (error) {
      console.error("Could not print the report:", error);
      setPrinting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={printing ? undefined : onClose}
      title="Generate a report"
      description={`${summary.period.label} — pick the sections to print.`}
      icon={<FileText className="size-5" />}
      size="md"
      footerLeft={
        <Text className="text-xs text-gray-500">
          {chosen.length} of {REPORT_SECTIONS.length} sections
        </Text>
      }
      actions={
        <>
          <Button variant="cancel" onClick={onClose} disabled={printing}>
            Cancel
          </Button>
          <Button
            onClick={print}
            disabled={chosen.length === 0 || printing}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {printing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Preparing
              </>
            ) : (
              <>
                <Printer className="size-4" />
                Print
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Text className="text-[10px] font-[gothamMedium] uppercase tracking-wider text-gray-500">
            Sections
          </Text>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setChosen(
                allOn ? [] : REPORT_SECTIONS.map((entry) => entry.section),
              )
            }
            className="h-auto p-0 text-xs text-blue-600 hover:bg-transparent hover:text-blue-800 hover:underline"
          >
            {allOn ? "Clear all" : "Select all"}
          </Button>
        </div>

        <div className="flex flex-col gap-1">
          {REPORT_SECTIONS.map((entry) => (
            <label
              key={entry.section}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:border-[#128CF1]/40 hover:bg-[#EAF4FE]/50"
            >
              <Checkbox
                checked={chosen.includes(entry.section)}
                onCheckedChange={() => toggle(entry.section)}
                className="mt-0.5 size-4"
              />
              <span className="min-w-0">
                <Text
                  as="div"
                  className="text-sm font-[gothamMedium] text-[#011b38]"
                >
                  {entry.label}
                </Text>
                <Text className="text-xs leading-snug text-gray-500">
                  {entry.blurb}
                </Text>
              </span>
            </label>
          ))}
        </div>

        <Text className="text-xs leading-relaxed text-gray-500">
          The report prints exactly the period on screen. Figures marked{" "}
          <span className="font-[gothamMedium] uppercase text-amber-600">
            as of now
          </span>{" "}
          describe the library at{" "}
          {new Date(summary.generatedAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          , whatever period is selected.
        </Text>
      </div>
    </ModalShell>
  );
}
