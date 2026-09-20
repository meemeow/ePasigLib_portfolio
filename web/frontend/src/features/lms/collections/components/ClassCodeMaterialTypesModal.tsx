import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BookMarked,
  Check,
  CheckCircle2,
  Hash,
  Loader2,
  Tags,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";
import { cachedFetch, clearCachedFetch } from "@/lib/fetching-data-cache";
import { readCallableError } from "@/lib/api/callable-error";
import type {
  ClassCodeMaterialTypesResponse,
  ConstantsBanner,
  ConstantsEditorState,
  ConstantsEditResponse,
  ConstantsRename,
  ConstantsType,
  PendingRemoval,
  RemovalAvailabilityResponse,
  RemovalBlocker,
} from "@/features/lms/collections/components/collection-modals-types";
import { idleEditor } from "@/features/lms/collections/components/collection-modals-types";
import ConstantsPanel from "@/features/lms/collections/components/ConstantsPanel";
import { callEditRecord as callable } from "@/lib/api/callables";

interface ClassCodeMaterialTypesModalProps {
  open: boolean;
  classCodes: string[];
  materialTypes: string[];
  onClose: () => void;
  onUpdated: (next: { classCodes: string[]; materialTypes: string[] }) => void;
}

const LABELS: Record<ConstantsType, string> = {
  classCodes: "class code",
  materialTypes: "material type",
};

const TITLES: Record<ConstantsType, string> = {
  classCodes: "Class Codes",
  materialTypes: "Material Types",
};

export default function ClassCodeMaterialTypes({
  open,
  classCodes,
  materialTypes,
  onClose,
  onUpdated,
}: ClassCodeMaterialTypesModalProps) {
  const [localClassCodes, setLocalClassCodes] = useState<string[]>(classCodes);
  const [localMaterialTypes, setLocalMaterialTypes] =
    useState<string[]>(materialTypes);
  const [activeTab, setActiveTab] = useState<ConstantsType>("classCodes");
  const [editor, setEditor] = useState<ConstantsEditorState>(idleEditor);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<ConstantsBanner | null>(null);

  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(
    null,
  );
  const [blockers, setBlockers] = useState<RemovalBlocker[]>([]);
  const [checkingBlockers, setCheckingBlockers] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const items = activeTab === "classCodes" ? localClassCodes : localMaterialTypes;

  useEffect(() => {
    setLocalClassCodes(classCodes);
  }, [classCodes]);

  useEffect(() => {
    setLocalMaterialTypes(materialTypes);
  }, [materialTypes]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("classCodes");
    setEditor(idleEditor);
    setBanner(null);
    setBusy(false);
    setPendingRemoval(null);
    setBlockers([]);
    setConfirmChecked(false);
  }, [open]);

  const startMode = (mode: ConstantsEditorState["mode"]): void => {
    setBanner(null);
    setEditor({
      mode,
      drafts: mode === "edit" ? [...items] : [],
      additions: mode === "add" ? [""] : [],
      checked: new Set<string>(),
      error: null,
    });
  };

  const switchTab = (tab: ConstantsType): void => {
    setActiveTab(tab);
    setEditor(idleEditor);
    setBanner(null);
  };

  const callEditRecord = async (
    payload: Record<string, unknown>,
  ): Promise<ConstantsEditResponse> => {
        const result = await callable(payload);
    return (result?.data || {}) as ConstantsEditResponse;
  };

  const syncConstants = useCallback(async (): Promise<void> => {
    try {
      clearCachedFetch("fetchClassCodeMaterialTypes");
      const next = await cachedFetch<ClassCodeMaterialTypesResponse>(
        "fetchClassCodeMaterialTypes",
        {},
        { force: true },
      );
      if (!next) return;
      const nextClassCodes = Array.isArray(next.classCodes)
        ? next.classCodes
        : localClassCodes;
      const nextMaterialTypes = Array.isArray(next.materialTypes)
        ? next.materialTypes
        : localMaterialTypes;
      setLocalClassCodes(nextClassCodes);
      setLocalMaterialTypes(nextMaterialTypes);
      onUpdated({
        classCodes: nextClassCodes,
        materialTypes: nextMaterialTypes,
      });
    } catch (error) {
      console.warn("Failed to refresh constants after update", error);
    }
  }, [localClassCodes, localMaterialTypes, onUpdated]);

  const fail = (message: string): void =>
    setEditor((prev) => ({ ...prev, error: message }));

  const duplicateOf = (value: string, ignoreIndex?: number): boolean => {
    const target = value.trim().toLowerCase();
    if (!target) return false;
    return items.some(
      (item, index) =>
        index !== ignoreIndex && item.trim().toLowerCase() === target,
    );
  };

  const runWrite = async (
    payload: Record<string, unknown>,
    successText: string,
  ): Promise<void> => {
    setBusy(true);
    setEditor((prev) => ({ ...prev, error: null }));
    try {
      await callEditRecord({
        case: "editClassCodesAndMaterialTypes",
        type: activeTab,
        ...payload,
      });
      await syncConstants();
      setEditor(idleEditor);
      setBanner({ tone: "success", text: successText });
    } catch (error) {
      const { code, message } = readCallableError(error);
      if (code.endsWith("already-exists") || code.endsWith("not-found")) {
        setEditor(idleEditor);
        setBanner({
          tone: "error",
          text: `${message} The list has been refreshed.`,
        });
        await syncConstants();
        return;
      }
      fail(message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const saveAdd = async (): Promise<void> => {
    const cleaned = editor.additions.map((value) => value.trim());
    const label = LABELS[activeTab];

    if (cleaned.some((value) => !value)) {
      fail(`Every new ${label} needs a name.`);
      return;
    }
    const duplicates = cleaned.filter((value) => duplicateOf(value));
    if (duplicates.length) {
      fail(`Already exists: ${Array.from(new Set(duplicates)).join(", ")}`);
      return;
    }
    const lowered = cleaned.map((value) => value.toLowerCase());
    if (new Set(lowered).size !== lowered.length) {
      fail("The new entries repeat each other.");
      return;
    }

    await runWrite(
      { action: "add", items: cleaned },
      `Added ${cleaned.length} ${label}${cleaned.length === 1 ? "" : "s"}.`,
    );
  };

  const saveRename = async (): Promise<void> => {
    const label = LABELS[activeTab];
    const changes: ConstantsRename[] = [];
    items.forEach((original, index) => {
      const next = (editor.drafts[index] ?? original).trim();
      if (next && next !== original) changes.push({ from: original, to: next });
    });

    if (editor.drafts.some((value) => !value.trim())) {
      fail(`A ${label} cannot be blank.`);
      return;
    }
    const conflict = changes.find((change) =>
      duplicateOf(
        change.to,
        items.findIndex((item) => item === change.from),
      ),
    );
    if (conflict) {
      fail(`"${conflict.to}" already exists.`);
      return;
    }
    const targets = changes.map((change) => change.to.toLowerCase());
    if (new Set(targets).size !== targets.length) {
      fail("Two entries were renamed to the same value.");
      return;
    }
    if (changes.length === 0) {
      setEditor(idleEditor);
      return;
    }

    await runWrite(
      { action: "edit", changes },
      `Renamed ${changes.length} ${label}${changes.length === 1 ? "" : "s"}.`,
    );
  };

  const requestRemoval = async (): Promise<void> => {
    const values = Array.from(editor.checked);
    if (values.length === 0) return;
    setPendingRemoval({ type: activeTab, values });
    setConfirmChecked(false);
    setBlockers([]);
    setBanner(null);
    setCheckingBlockers(true);
    try {
      const response = await cachedFetch<RemovalAvailabilityResponse>(
        "checkRemovalAvailability",
        { type: activeTab, values },
        { force: true },
      );
      setBlockers(Array.isArray(response?.blocked) ? response.blocked : []);
    } catch (error) {
      console.warn("Failed to check removal availability", error);
      setBanner({
        tone: "error",
        text: "Could not check whether these are still in use.",
      });
    } finally {
      setCheckingBlockers(false);
    }
  };

  const confirmRemoval = async (): Promise<void> => {
    if (!pendingRemoval) return;
    const { type, values } = pendingRemoval;
    const label = LABELS[type];
    setBusy(true);
    try {
      const response = await callEditRecord({
        case: "editClassCodesAndMaterialTypes",
        action: "remove",
        type,
        remove: values,
      });

      if (response?.status === "blocked") {
        setBlockers(response.blocked || []);
        return;
      }

      await syncConstants();
      setPendingRemoval(null);
      setBlockers([]);
      setConfirmChecked(false);
      setEditor(idleEditor);
      setBanner({
        tone: "success",
        text: `Removed ${values.length} ${label}${values.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setBanner({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to remove.",
      });
    } finally {
      setBusy(false);
    }
  };

  const hasChanges =
    editor.mode === "add"
      ? editor.additions.some((value) => value.trim())
      : editor.mode === "edit"
        ? editor.drafts.some(
          (value, index) => value.trim() !== (items[index] ?? ""),
        )
        : editor.mode === "remove"
          ? editor.checked.size > 0
          : false;

  const tab = (type: ConstantsType, icon: React.ReactNode, count: number) => {
    const active = activeTab === type;
    return (
      <Button
        type="button"
        variant={null}
        size={null}
        onClick={() => switchTab(type)}
        disabled={busy}
        className={`-mb-px flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-normal font-[gothamMedium] transition disabled:opacity-60 ${
          active
            ? "border-gray-200 bg-white text-[#128CF1]"
            : "border-transparent text-gray-500 hover:text-[#003067]"
        }`}
      >
        {icon}
        {TITLES[type]}
        <Badge
          variant={null}
          className={`border-0 font-normal rounded-full px-2 py-0.5 text-[11px] ${
            active
              ? "bg-[#EAF4FE] text-[#0F76CC]"
              : "bg-gray-200/70 text-gray-600"
          }`}
        >
          {count}
        </Badge>
      </Button>
    );
  };

  return (
    <>
      <ModalShell
        open={open}
        title="Class Codes & Material Types"
        description="Manage the lists used in cataloguing forms and collection filters."
        icon={<Tags className="size-5" />}
        size="md"
        onClose={busy ? undefined : onClose}
        bodyClassName="bg-gray-50"
        actions={
          <>
            <Button
              variant="cancel"
              onClick={
                editor.mode === "idle" ? onClose : () => setEditor(idleEditor)
              }
              disabled={busy}
              className="w-auto md:w-[110px]"
            >
              Cancel
            </Button>
            {editor.mode === "remove" ? (
              <Button
                variant="destructive"
                onClick={requestRemoval}
                disabled={busy || !hasChanges}
                className="w-auto md:w-[170px]"
              >
                <Trash2 className="size-4" />
                Remove{editor.checked.size > 0 ? ` (${editor.checked.size})` : ""}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={editor.mode === "add" ? saveAdd : saveRename}
                disabled={busy || editor.mode === "idle" || !hasChanges}
                className="w-auto md:w-[170px]"
              >
                <Check className="size-4" />
                {busy ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </>
        }
      >
        {banner && (
          <div
            className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 ${
              banner.tone === "success"
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            {banner.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
            )}
            <Text
              className={`text-sm ${
                banner.tone === "success" ? "text-green-800" : "text-red-800"
              }`}
            >
              {banner.text}
            </Text>
          </div>
        )}

        <div className="flex gap-1 border-b border-gray-200">
          {tab("classCodes", <Hash className="size-4" />, localClassCodes.length)}
          {tab(
            "materialTypes",
            <BookMarked className="size-4" />,
            localMaterialTypes.length,
          )}
        </div>

        <div className="mt-4">
          <ConstantsPanel
            title={TITLES[activeTab]}
            itemLabel={LABELS[activeTab]}
            items={items}
            editor={editor}
            busy={busy}
            onStartMode={startMode}
            onDraftChange={(index, value) =>
              setEditor((prev) => ({
                ...prev,
                error: null,
                drafts: prev.drafts.map((entry, i) =>
                  i === index ? value : entry,
                ),
              }))
            }
            onAdditionChange={(index, value) =>
              setEditor((prev) => ({
                ...prev,
                error: null,
                additions: prev.additions.map((entry, i) =>
                  i === index ? value : entry,
                ),
              }))
            }
            onAddRow={() =>
              setEditor((prev) => ({ ...prev, additions: [...prev.additions, ""] }))
            }
            onDropRow={(index) =>
              setEditor((prev) => ({
                ...prev,
                additions:
                  prev.additions.length === 1
                    ? [""]
                    : prev.additions.filter((_, i) => i !== index),
              }))
            }
            onToggleChecked={(value) =>
              setEditor((prev) => {
                const next = new Set(prev.checked);
                if (next.has(value)) next.delete(value);
                else next.add(value);
                return { ...prev, checked: next };
              })
            }
          />
        </div>
      </ModalShell>

      <ModalShell
        open={!!pendingRemoval}
        title="Remove permanently?"
        description={
          pendingRemoval
            ? `${pendingRemoval.values.length} ${LABELS[pendingRemoval.type]}${pendingRemoval.values.length === 1 ? "" : "s"} will be deleted and cleared from any archived collection using them.`
            : undefined
        }
        icon={<AlertTriangle className="size-5" />}
        tone="danger"
        size="md"
        onClose={busy ? undefined : () => setPendingRemoval(null)}
        footerLeft={
          blockers.length === 0 &&
          !checkingBlockers && (
            <Text as="label" className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={confirmChecked}
                onCheckedChange={(value) => setConfirmChecked(value === true)}
                disabled={busy}
                className="data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500"
              />
              <Text className="text-xs text-red-700">
                I understand this cannot be undone.
              </Text>
            </Text>
          )
        }
        actions={
          <>
            <Button
              variant="cancel"
              onClick={() => setPendingRemoval(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoval}
              disabled={
                busy ||
                checkingBlockers ||
                blockers.length > 0 ||
                !confirmChecked
              }
            >
              {busy ? "Removing..." : "Remove"}
            </Button>
          </>
        }
      >
        {checkingBlockers ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="size-4 animate-spin text-[#128CF1]" />
            <Text className="text-sm text-gray-600">
              Checking whether these are still in use...
            </Text>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingRemoval?.values.map((value) => {
              const blocked = blockers.find(
                (blocker) => blocker.value === value,
              );

              return (
                <div
                  key={value}
                  className={`rounded-lg border px-4 py-3 ${
                    blocked
                      ? "border-red-200 bg-red-50"
                      : "border-green-200 bg-green-50/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {blocked ? (
                      <XCircle className="size-4 shrink-0 text-red-600" />
                    ) : (
                      <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                    )}
                    <Text className="font-[gothamMedium] text-sm text-[#003067]">
                      {value}
                    </Text>
                  </div>

                  {blocked ? (
                    <div className="mt-2 pl-6">
                      <Text className="text-xs text-red-700">
                        Still used by {blocked.blocking.length} collection
                        {blocked.blocking.length === 1 ? "" : "s"}:
                      </Text>
                      <ul className="mt-1 space-y-0.5">
                        {blocked.blocking.slice(0, 5).map((item) => (
                          <li
                            key={item.id}
                            className="truncate text-xs text-red-800"
                            title={item.title}
                          >
                            • {item.title || item.id}
                            {item.status && item.status !== "Available"
                              ? ` (${item.status.toLowerCase()})`
                              : ""}
                          </li>
                        ))}
                        {blocked.blocking.length > 5 && (
                          <li className="text-xs text-red-600">
                            + {blocked.blocking.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <Text className="mt-1 pl-6 text-xs text-green-700">
                      Not used by any collection — safe to remove.
                    </Text>
                  )}
                </div>
              );
            })}

            {blockers.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                <Text className="text-xs text-yellow-800">
                  Archive or re-tag the collections above first, then try again.
                </Text>
              </div>
            )}
          </div>
        )}
      </ModalShell>
    </>
  );
}
