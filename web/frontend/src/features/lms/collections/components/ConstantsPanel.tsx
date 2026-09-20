import { GripVertical, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import type { ConstantsEditorState } from "@/features/lms/collections/components/collection-modals-types";
import { MAX_NAME_LENGTH } from "@/features/lms/collections/components/collection-modals-types";

interface ConstantsPanelProps {
  title: string;
  itemLabel: string;
  items: string[];
  lockedItems?: string[];
  editor: ConstantsEditorState;
  busy: boolean;
  onStartMode: (mode: ConstantsEditorState["mode"]) => void;
  onDraftChange: (index: number, value: string) => void;
  onAdditionChange: (index: number, value: string) => void;
  onAddRow: () => void;
  onDropRow: (index: number) => void;
  onToggleChecked: (value: string) => void;
}

const ROW = "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition";

export default function ConstantsPanel({
  title,
  itemLabel,
  items,
  lockedItems,
  editor,
  busy,
  onStartMode,
  onDraftChange,
  onAdditionChange,
  onAddRow,
  onDropRow,
  onToggleChecked,
}: ConstantsPanelProps) {
  const { mode, drafts, additions, checked, error } = editor;

  const locked = new Set(
    (lockedItems || []).map((value) => value.trim().toLowerCase()),
  );
  const isLocked = (item: string): boolean =>
    locked.has(item.trim().toLowerCase());

  const modeButton = (
    target: Exclude<ConstantsEditorState["mode"], "idle">,
    label: string,
    icon: React.ReactNode,
    danger = false,
  ) => {
    const active = mode === target;
    return (
      <Button
        size="sm"
        variant={active ? (danger ? "destructive" : "secondary") : "outline"}
        onClick={() => onStartMode(active ? "idle" : target)}
        disabled={busy || (mode !== "idle" && !active) || (target !== "add" && items.length === 0)}
        className={
          !active && danger
            ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            : undefined
        }
      >
        {icon}
        {label}
      </Button>
    );
  };

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Text className="font-[gothamMedium] text-sm text-[#003067]">
          {title}
        </Text>

        <div className="flex items-center gap-2">
          {modeButton("add", "Add", <Plus className="size-3.5" />)}
          {modeButton("edit", "Rename", <Pencil className="size-3.5" />)}
          {modeButton("remove", "Remove", <Trash2 className="size-3.5" />, true)}
        </div>
      </header>

      {error && (
        <div className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <Text className="text-xs text-red-700">{error}</Text>
        </div>
      )}

      {mode === "remove" && (
        <div className="mx-4 mb-3 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2">
          <Text className="text-xs text-red-700">
            {checked.size === 0
              ? `Tick the ${itemLabel}s you want to remove.`
              : `${checked.size} ${itemLabel}${checked.size === 1 ? "" : "s"} marked for removal.`}
          </Text>
        </div>
      )}

      <div className="flex max-h-[46vh] min-h-[140px] flex-col gap-2 overflow-y-auto px-4 pb-4">
        {items.length === 0 && additions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
            <Text className="text-sm text-gray-500">No {itemLabel}s yet.</Text>
            <Text className="text-xs text-gray-400">
              Use Add to create the first one.
            </Text>
          </div>
        ) : (
          items.map((item, index) => {
            const isChecked = checked.has(item);
            const pinned = isLocked(item);
            const removing = mode === "remove" && !pinned;
            const renaming = mode === "edit" && !pinned;
            const draft = drafts[index] ?? item;

            return (
              <div
                key={`${item}-${index}`}
                role={removing ? "checkbox" : undefined}
                aria-checked={removing ? isChecked : undefined}
                tabIndex={removing ? 0 : undefined}
                onClick={removing ? () => onToggleChecked(item) : undefined}
                onKeyDown={
                  removing
                    ? (event) => {
                      if (event.key === " " || event.key === "Enter") {
                        event.preventDefault();
                        onToggleChecked(item);
                      }
                    }
                    : undefined
                }
                className={`${ROW} ${
                  pinned
                    ? "border-gray-200 bg-gray-50"
                    : removing
                      ? isChecked
                        ? "cursor-pointer border-red-300 bg-red-50"
                        : "cursor-pointer border-gray-200 bg-white hover:border-red-200 hover:bg-red-50/40"
                      : "border-gray-200 bg-white"
                }`}
              >
                {pinned ? (
                  <Lock className="size-4 shrink-0 text-gray-400" />
                ) : removing ? (
                  <Checkbox
                    checked={isChecked}
                    className="pointer-events-none data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500"
                    tabIndex={-1}
                    aria-hidden
                  />
                ) : (
                  <GripVertical className="size-4 shrink-0 text-gray-300" />
                )}

                <span className="w-4 shrink-0 text-xs text-gray-400">
                  {index + 1}
                </span>

                {renaming ? (
                  <div className="min-w-0 flex-1">
                    <Input
                      value={draft}
                      maxLength={MAX_NAME_LENGTH}
                      onChange={(event) =>
                        onDraftChange(index, event.target.value)
                      }
                      disabled={busy}
                      className={`h-8 ${
                        draft !== item ? "border-[#128CF1] bg-[#EAF4FE]/40" : ""
                      }`}
                    />
                  </div>
                ) : (
                  <Text
                    className={`min-w-0 flex-1 truncate text-sm ${
                      pinned
                        ? "text-gray-500"
                        : removing && isChecked
                          ? "text-red-700 line-through"
                          : "text-[#0F76CC]"
                    }`}
                    title={item}
                  >
                    {item}
                  </Text>
                )}

                {pinned && (mode === "edit" || mode === "remove") && (
                  <span className="shrink-0 text-xs text-gray-500">
                    Used by the catalogue
                  </span>
                )}
              </div>
            );
          })
        )}

        {mode === "add" &&
          additions.map((value, index) => (
            <div
              key={`new-${index}`}
              className={`${ROW} border-[#128CF1]/40 bg-[#EAF4FE]/40`}
            >
              <Plus className="size-4 shrink-0 text-[#128CF1]" />
              <span className="w-4 shrink-0 text-xs text-gray-400">
                {items.length + index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Input
                  value={value}
                  maxLength={MAX_NAME_LENGTH}
                  autoFocus={index === additions.length - 1}
                  placeholder={`Enter a ${itemLabel}`}
                  onChange={(event) =>
                    onAdditionChange(index, event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onAddRow();
                    }
                  }}
                  disabled={busy}
                  className="h-8 border-[#128CF1]/40 bg-white"
                />
              </div>
              <Button
                type="button"
                variant={null}
                size={null}
                onClick={() => onDropRow(index)}
                disabled={busy}
                aria-label={`Remove new ${itemLabel}`}
                className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-white hover:text-red-600 disabled:opacity-40"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}

        {mode === "add" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddRow}
            disabled={busy}
            className="mt-1 w-full border-dashed text-[#128CF1]"
          >
            <Plus className="size-3.5" />
            Add another {itemLabel}
          </Button>
        )}
      </div>
    </section>
  );
}
