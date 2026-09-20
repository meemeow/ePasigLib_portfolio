import { useEffect, useMemo, useState } from "react";
import {
  Barcode,
  ImageOff,
  Layers,
  Minus,
  Plus,
  Printer,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";
import type { TableCollection } from "@/features/lms/collections/pages/index/types/collections-types";
import type {
  BarcodeGroup,
  BarcodeSelectionMap,
} from "@/features/lms/collections/components/collection-modals-types";

interface BarcodeModalProps {
  open: boolean;
  collections: TableCollection[];
  onClose: () => void;
}

const barcodeSrc = (accession: string): string =>
  `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(accession)}&code=Code128&dpi=96`;

function QuantityStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-gray-200 bg-white p-0.5"
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        variant={null}
        size={null}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
        className="flex size-6 items-center justify-center rounded text-gray-500 transition hover:bg-gray-100 hover:text-[#003067] disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Minus className="size-3" />
      </Button>
      <Input
        type="number"
        min={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(parseInt(event.target.value, 10) || 1)}
        aria-label="Quantity"
        className="h-auto w-9 px-0 py-0 shadow-none rounded-none [appearance:textfield] border-0 bg-transparent text-center text-sm sm:text-sm md:text-sm font-[gothamMedium] text-[#003067] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant={null}
        size={null}
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        aria-label="Increase quantity"
        className="flex size-6 items-center justify-center rounded text-gray-500 transition hover:bg-gray-100 hover:text-[#003067] disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus className="size-3" />
      </Button>
    </div>
  );
}

export default function BarcodeModal({
  open,
  collections,
  onClose,
}: BarcodeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"select" | "preview">("select");
  const [selection, setSelection] = useState<BarcodeSelectionMap>({});

  useEffect(() => {
    if (!open) return;
    const initial: BarcodeSelectionMap = {};
    collections.forEach((collection) => {
      initial[collection.id] = {};
      collection.Copies.forEach((copy) => {
        initial[collection.id][copy.Accession] = { checked: false, quantity: 1 };
      });
    });
    setSelection(initial);
    setStep("select");
  }, [open, collections]);

  const totalCopies = useMemo(
    () =>
      collections.reduce((sum, collection) => sum + collection.Copies.length, 0),
    [collections],
  );

  const groups = useMemo<BarcodeGroup[]>(() => {
    const result: BarcodeGroup[] = [];
    Object.values(selection).forEach((copies) => {
      Object.entries(copies).forEach(([accession, info]) => {
        if (info.checked) result.push({ accession, quantity: info.quantity });
      });
    });
    return result;
  }, [selection]);

  const totalLabels = useMemo(
    () => groups.reduce((sum, group) => sum + group.quantity, 0),
    [groups],
  );

  const setCopy = (
    collectionId: string,
    accession: string,
    patch: Partial<{ checked: boolean; quantity: number }>,
  ): void =>
    setSelection((prev) => ({
      ...prev,
      [collectionId]: {
        ...prev[collectionId],
        [accession]: {
          checked: prev[collectionId]?.[accession]?.checked ?? false,
          quantity: prev[collectionId]?.[accession]?.quantity ?? 1,
          ...patch,
        },
      },
    }));

  const toggleCopy = (collectionId: string, accession: string): void =>
    setCopy(collectionId, accession, {
      checked: !selection[collectionId]?.[accession]?.checked,
    });

  const setAll = (checked: boolean, collectionId?: string): void =>
    setSelection((prev) => {
      const next: BarcodeSelectionMap = {};
      Object.entries(prev).forEach(([id, copies]) => {
        if (collectionId && id !== collectionId) {
          next[id] = copies;
          return;
        }
        next[id] = {};
        Object.entries(copies).forEach(([accession, info]) => {
          next[id][accession] = { ...info, checked };
        });
      });
      return next;
    });

  const handlePrint = (): void => {
    setIsProcessing(true);
    try {
      const labels = groups.flatMap((group) =>
        Array<string>(group.quantity).fill(group.accession),
      );
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcodes</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    .item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; text-align: center; }
    .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; margin-top: 6px; }
    @media print { .item { page-break-inside: avoid; } }
  </style>
  <script>
    function doPrint(){ setTimeout(function(){ window.print(); }, 300); }
  </script>
</head>
<body onload="doPrint()">
  <div class="grid">
    ${labels
      .map(
        (accession) => `
      <div class="item">
        <img src="${barcodeSrc(accession)}" alt="${accession}" style="max-height:64px;margin-bottom:6px;" />
        <div class="code">${accession}</div>
      </div>`,
      )
      .join("")}
  </div>
</body>
</html>`;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const allSelected = totalCopies > 0 && groups.length === totalCopies;

  const summary = (
    <div className="z-10 -mx-6 -mt-5 mb-5 flex flex-col gap-3 border-b border-gray-200 bg-white px-6 pt-5 pb-3 sm:-mx-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="flex items-center gap-2">
        <ScanLine className="size-4 shrink-0 text-[#128CF1]" />
        <Text className="text-sm text-gray-600">
          <span className="font-[gothamMedium] text-[#003067]">
            {groups.length}
          </span>
          {` of ${totalCopies} cop${totalCopies === 1 ? "y" : "ies"} selected`}
          {totalLabels > 0 && (
            <span className="text-gray-400">{` • ${totalLabels} label${totalLabels === 1 ? "" : "s"}`}</span>
          )}
        </Text>
      </div>

      {step === "select" && totalCopies > 0 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAll(!allSelected)}
          >
            {allSelected ? "Clear all" : "Select all"}
          </Button>
        </div>
      )}
    </div>
  );

  const selectStep = (
    <div className="space-y-4">
      {collections.map((collection) => {
        const copies = collection.Copies;
        const chosen = copies.filter(
          (copy) => selection[collection.id]?.[copy.Accession]?.checked,
        ).length;
        const everySelected = copies.length > 0 && chosen === copies.length;

        return (
          <section
            key={collection.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Text
                  className="truncate font-[gothamMedium] text-sm text-[#003067]"
                  title={collection.CollectionTitle}
                >
                  {collection.CollectionTitle}
                </Text>
                <Text className="truncate text-xs text-gray-500">
                  {collection.MainAuthor || "Unknown author"}
                </Text>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF4FE] px-2.5 py-0.5 text-xs font-[gothamMedium] text-[#0F76CC]">
                <Layers className="size-3" />
                {chosen}/{copies.length}
              </span>

              {copies.length > 0 && (
                <Button
                  type="button"
                  variant={null}
                  size={null}
                  onClick={() => setAll(!everySelected, collection.id)}
                  className="font-normal text-xs font-[gothamMedium] text-[#128CF1] transition hover:underline"
                >
                  {everySelected ? "Clear" : "Select all"}
                </Button>
              )}
            </header>

            {copies.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500">
                <ImageOff className="size-4 shrink-0 text-gray-400" />
                No PKC copies to print for this collection.
              </div>
            ) : (
              <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {copies.map((copy) => {
                  const info = selection[collection.id]?.[copy.Accession];
                  const checked = !!info?.checked;

                  return (
                    <div
                      key={copy.Accession}
                      role="checkbox"
                      aria-checked={checked}
                      tabIndex={0}
                      onClick={() => toggleCopy(collection.id, copy.Accession)}
                      onKeyDown={(event) => {
                        if (event.key === " " || event.key === "Enter") {
                          event.preventDefault();
                          toggleCopy(collection.id, copy.Accession);
                        }
                      }}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                        checked
                          ? "border-[#128CF1] bg-[#EAF4FE]/60 ring-1 ring-[#128CF1]"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        className="pointer-events-none"
                        tabIndex={-1}
                        aria-hidden
                      />

                      <div className="min-w-0 flex-1">
                        <Text className="truncate font-mono text-sm font-[gothamMedium] text-[#003067]">
                          {copy.Accession}
                        </Text>
                        <Text className="truncate text-xs text-gray-500">
                          {copy.LibraryLocation || "No location"}
                        </Text>
                      </div>

                      {checked && (
                        <QuantityStepper
                          value={info?.quantity ?? 1}
                          disabled={isProcessing}
                          onChange={(next) =>
                            setCopy(collection.id, copy.Accession, {
                              quantity: Math.max(1, next),
                            })
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {collections.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-6 py-12 text-center">
          <Barcode className="size-8 text-gray-300" />
          <Text className="font-[gothamMedium] text-sm text-[#003067]">
            No collections selected
          </Text>
          <Text className="text-xs text-gray-500">
            Tick the collections you want barcodes for in the table, then reopen
            this dialog.
          </Text>
        </div>
      )}
    </div>
  );

  const previewStep = (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-6 py-12 text-center">
          <Barcode className="size-8 text-gray-300" />
          <Text className="text-sm text-gray-500">
            No barcodes selected yet.
          </Text>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-[#128CF1]/30 bg-[#EAF4FE]/50 px-4 py-3">
            <Text className="text-sm text-[#003067]">
              <span className="font-[gothamMedium]">{totalLabels}</span>
              {` label${totalLabels === 1 ? "" : "s"} across ${groups.length} accession${groups.length === 1 ? "" : "s"} will be sent to the printer.`}
            </Text>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {groups.map((group) => (
              <div
                key={group.accession}
                className="relative flex flex-col items-center rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                {group.quantity > 1 && (
                  <span className="absolute top-2 right-2 rounded-full bg-[#003067] px-1.5 py-0.5 text-[10px] font-[gothamMedium] text-white">
                    ×{group.quantity}
                  </span>
                )}
                <img
                  src={barcodeSrc(group.accession)}
                  alt={`Barcode for ${group.accession}`}
                  className="mb-2 max-h-16"
                  loading="lazy"
                />
                <Text className="font-mono text-xs text-gray-600">
                  {group.accession}
                </Text>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <ModalShell
      open={open}
      title={step === "select" ? "Print Barcodes" : "Print Preview"}
      description={
        step === "select"
          ? "Pick the copies to label and how many of each."
          : "Check the layout before sending it to the printer."
      }
      icon={step === "select" ? <Barcode className="size-5" /> : <Printer className="size-5" />}
      size="lg"
      onClose={onClose}
      bodyClassName="bg-gray-50"
      actions={
        <>
          <Button
            onClick={step === "select" ? onClose : () => setStep("select")}
            variant="cancel"
            className="w-auto md:w-[100px]"
            disabled={isProcessing}
          >
            {step === "select" ? "Cancel" : "Back"}
          </Button>
          <Button
            onClick={step === "select" ? () => setStep("preview") : handlePrint}
            variant="secondary"
            disabled={isProcessing || groups.length === 0}
            className="w-auto md:w-[170px]"
          >
            {step === "select" ? (
              "Preview Barcodes"
            ) : (
              <>
                <Printer className="size-4" />
                {isProcessing ? "Printing..." : "Print"}
              </>
            )}
          </Button>
        </>
      }
    >
      {summary}
      {step === "select" ? selectStep : previewStep}
    </ModalShell>
  );
}
