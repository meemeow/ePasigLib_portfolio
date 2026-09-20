import { useCallback, useEffect, useState } from "react";
import { cachedFetch, clearCachedFetch } from '@/lib/fetching-data-cache';
import { usePagedList, type PagedList } from '@/hooks/use-paged-list';
import { fetchCollectionById } from '@/features/lms/collections/api/collection-record';
import { invalidateCollectionCaches } from '@/features/lms/collections/collection-cache';
import {
    CollectionData,
    CollectionViewTab,
    CollectionLogs,
    ModificationLog,
    CheckoutHistory,
    CheckinHistory,
    CopyMutationResult,
    OtherLibraryCopy,
    OtherLibraryCopyDraft,
} from "@/features/lms/collections/pages/view-collection/types/collections-view-types";

export interface PaginatedTab<T> extends PagedList<T> {
    loading: boolean;
    refresh: () => Promise<void>;
}

export type CopyKind = "pkc" | "other";

export { PKC_LOCATION } from "@/features/lms/collections/components/collection-modals-types";
import { PKC_LOCATION } from "@/features/lms/collections/components/collection-modals-types";
import { callAddRecord as addCall, callArchiveRecord as archiveCall, callEditRecord as editCall } from "@/lib/api/callables";

export const OTHER_SECTION = "Others";

export const OTHER_LOCATION = "Others";

const ACCESSION_PATTERN = /^[A-Za-z0-9-]+$/;
const CALL_NUMBER_PATTERN = /^(?=.*[A-Za-z0-9])[A-Za-z0-9./\-\s]+$/;

function parseCopyCount(value: string): number | null {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const count = Number(trimmed);
    return count > 0 ? count : null;
}

function callableErrorCode(error: unknown): string {
    if (error && typeof error === "object" && "code" in error) {
        return String((error as { code: unknown }).code ?? "");
    }
    return "";
}

function callableErrorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : "";
}

type ConstantsFetch = "fetchLibraryLocations" | "fetchSections";
type ConstantsKey = "libraryLocations" | "sections";

async function readConstantsList(
    fetchCase: ConstantsFetch,
    key: ConstantsKey,
    force = false,
): Promise<string[] | null> {
    try {
        if (force) clearCachedFetch(fetchCase);
        const payload = await cachedFetch<Partial<Record<ConstantsKey, unknown>>>(
            fetchCase,
            {},
            { force },
        );
        const list = payload?.[key];
        return Array.isArray(list) ? list.map((value) => String(value)) : [];
    } catch (error) {
        console.warn(`Failed to read ${key}`, error);
        return null;
    }
}

const EMPTY_LOGS: CollectionLogs = {
    modificationLogs: [],
    checkoutHistory: [],
    checkinHistory: [],
};

export interface CollectionsViewHook {
    collectionData: CollectionData | null;
    loading: boolean;
    activeTab: CollectionViewTab;
    setActiveTab: (tab: CollectionViewTab) => void;
    modalMessage: string | null;
    modalType: "success" | "error";
    setModalMessage: (message: string | null) => void;
    showFullDesc: boolean;
    setShowFullDesc: (show: boolean) => void;

    activeMarcBlock: string;
    setActiveMarcBlock: (block: string) => void;

    showArchiveModal: boolean;
    setShowArchiveModal: (show: boolean) => void;
    archiveConfirmChecked: boolean;
    setArchiveConfirmChecked: (checked: boolean) => void;
    archiveAction: "archive" | "unarchive";
    setArchiveAction: (action: "archive" | "unarchive") => void;
    archiveProcessing: boolean;

    newCopyInput: string;
    setNewCopyInput: (input: string) => void;
    editingIndex: number | null;
    setEditingIndex: (index: number | null) => void;
    editLocation: string;
    setEditLocation: (location: string) => void;
    editValue: string;
    setEditValue: (value: string) => void;
    editForLibraryUse: boolean;
    setEditForLibraryUse: (value: boolean) => void;
    newForLibraryUse: boolean;
    setNewForLibraryUse: (value: boolean) => void;
    newSection: string;
    setNewSection: (section: string) => void;
    customSection: string;
    setCustomSection: (section: string) => void;
    customEditLocation: string;
    setCustomEditLocation: (location: string) => void;

    copyToArchiveIndex: number | null;
    setCopyToArchiveIndex: (index: number | null) => void;
    showCopyArchiveModal: boolean;
    setShowCopyArchiveModal: (show: boolean) => void;
    copyArchiveConfirmChecked: boolean;
    setCopyArchiveConfirmChecked: (checked: boolean) => void;

    otherLibraryCopyRows: OtherLibraryCopyDraft[];
    setOtherLibraryCopyRows: React.Dispatch<
        React.SetStateAction<OtherLibraryCopyDraft[]>
    >;
    editingOtherIdx: number | null;
    setEditingOtherIdx: (index: number | null) => void;
    editedOtherRow: OtherLibraryCopy | null;
    setEditedOtherRow: (row: OtherLibraryCopy | null) => void;
    otherCopyToArchiveIndex: number | null;
    setOtherCopyToArchiveIndex: (index: number | null) => void;
    showOtherCopyArchiveModal: boolean;
    setShowOtherCopyArchiveModal: (show: boolean) => void;
    otherCopyArchiveConfirmChecked: boolean;
    setOtherCopyArchiveConfirmChecked: (checked: boolean) => void;

    modificationLogs: PaginatedTab<ModificationLog>;
    checkoutHistory: PaginatedTab<CheckoutHistory>;
    checkinHistory: PaginatedTab<CheckinHistory>;

    libraryLocations: string[];
    setLibraryLocations: (locations: string[]) => void;
    showLibraryLocationsModal: boolean;
    setShowLibraryLocationsModal: (show: boolean) => void;
    sections: string[];
    setSections: (sections: string[]) => void;
    showSectionsModal: boolean;
    setShowSectionsModal: (show: boolean) => void;
    constantsReady: boolean;

    handleArchiveToggleClick: () => void;
    confirmArchiveToggle: () => Promise<void>;
    handleAddCopy: (
        kind: CopyKind,
        draft?: OtherLibraryCopyDraft,
        draftIndex?: number,
    ) => Promise<void>;
    handleSaveCopyEdit: (kind: CopyKind) => Promise<void>;
    handleConfirmCopyArchive: (kind: CopyKind) => Promise<void>;
    cancelCopyEdit: () => void;
    handleOpenLibraryLocationsModal: () => Promise<void>;
    handleOpenSectionsModal: () => Promise<void>;
    updateOtherRow: <K extends keyof OtherLibraryCopyDraft>(
        idx: number,
        field: K,
        value: OtherLibraryCopyDraft[K],
    ) => void;
    updateEditedOtherRow: <K extends keyof OtherLibraryCopy>(
        field: K,
        value: OtherLibraryCopy[K],
    ) => void;
    startEditPkcCopy: (idx: number) => void;
    startEditOtherLibraryCopy: (idx: number) => void;
    getOrdinal: (n: number) => string;
    isAddingPkcCopy: boolean;
    setIsAddingPkcCopy: (v: boolean) => void;
    isSavingPkcCopy: boolean;
    isSavingOtherLibraryCopy: boolean;
    isRefreshing: boolean;
    refetchCollection: () => Promise<void>;
    homeButtonsDisabled: boolean;
}

export function useCollectionsView(id: string | undefined): CollectionsViewHook {
    const [collectionData, setCollectionData] = useState<CollectionData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<CollectionViewTab>("home");
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [modalType, setModalType] = useState<"success" | "error">("success");
    const [showFullDesc, setShowFullDesc] = useState(false);

    const [activeMarcBlock, setActiveMarcBlock] = useState<string>("0xx");

    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [archiveConfirmChecked, setArchiveConfirmChecked] = useState(false);
    const [archiveAction, setArchiveAction] = useState<"archive" | "unarchive">("archive");
    const [archiveProcessing, setArchiveProcessing] = useState(false);

    const [newCopyInput, setNewCopyInput] = useState("");
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editLocation, setEditLocation] = useState("");
    const [editValue, setEditValue] = useState("");
    const [editForLibraryUse, setEditForLibraryUse] = useState<boolean>(false);
    const [newForLibraryUse, setNewForLibraryUse] = useState<boolean>(true);
    const [newSection, setNewSection] = useState("");
    const [customSection, setCustomSection] = useState("");
    const [customEditLocation, setCustomEditLocation] = useState("");
    const [isAddingPkcCopy, setIsAddingPkcCopy] = useState<boolean>(false);
    const [isSavingPkcCopy, setIsSavingPkcCopy] = useState<boolean>(false);

    const [editingCopyKey, setEditingCopyKey] = useState<string>("");

    const [copyToArchiveIndex, setCopyToArchiveIndex] = useState<number | null>(null);
    const [showCopyArchiveModal, setShowCopyArchiveModal] = useState(false);
    const [copyArchiveConfirmChecked, setCopyArchiveConfirmChecked] = useState(false);

    const [otherLibraryCopyRows, setOtherLibraryCopyRows] = useState<
        OtherLibraryCopyDraft[]
    >([]);
    const [editingOtherIdx, setEditingOtherIdx] = useState<number | null>(null);
    const [editedOtherRow, setEditedOtherRow] = useState<OtherLibraryCopy | null>(
        null,
    );
    const [otherCopyToArchiveIndex, setOtherCopyToArchiveIndex] = useState<number | null>(null);
    const [showOtherCopyArchiveModal, setShowOtherCopyArchiveModal] = useState(false);
    const [otherCopyArchiveConfirmChecked, setOtherCopyArchiveConfirmChecked] = useState(false);
    const [isSavingOtherLibraryCopy, setIsSavingOtherLibraryCopy] = useState<boolean>(false);

    const collectionUID = collectionData?.UID || "";
    const collectionTitle = collectionData?.CollectionTitle || "";

    const [logs, setLogs] = useState<CollectionLogs>(EMPTY_LOGS);
    const [logsLoading, setLogsLoading] = useState(false);

    const loadLogs = useCallback(
        async (force: boolean = false) => {
            if (!collectionUID && !collectionTitle) return;
            setLogsLoading(true);
            try {
                const res = await cachedFetch<CollectionLogs>(
                    "collectionLogs",
                    { collectionUID, collectionTitle },
                    { force },
                );
                setLogs({
                    modificationLogs: Array.isArray(res?.modificationLogs) ? res.modificationLogs : [],
                    checkoutHistory: Array.isArray(res?.checkoutHistory) ? res.checkoutHistory : [],
                    checkinHistory: Array.isArray(res?.checkinHistory) ? res.checkinHistory : [],
                });
            } catch (err) {
                console.error("Failed to load collection logs", err);
            } finally {
                setLogsLoading(false);
            }
        },
        [collectionUID, collectionTitle],
    );

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const refreshLogs = useCallback(() => loadLogs(true), [loadLogs]);

    const modificationLogsPage = usePagedList<ModificationLog>(logs.modificationLogs);
    const checkoutHistoryPage = usePagedList<CheckoutHistory>(logs.checkoutHistory);
    const checkinHistoryPage = usePagedList<CheckinHistory>(logs.checkinHistory);

    const modificationLogsState: PaginatedTab<ModificationLog> = {
        ...modificationLogsPage,
        loading: logsLoading,
        refresh: refreshLogs,
    };
    const checkoutHistoryState: PaginatedTab<CheckoutHistory> = {
        ...checkoutHistoryPage,
        loading: logsLoading,
        refresh: refreshLogs,
    };
    const checkinHistoryState: PaginatedTab<CheckinHistory> = {
        ...checkinHistoryPage,
        loading: logsLoading,
        refresh: refreshLogs,
    };

    const [libraryLocations, setLibraryLocations] = useState<string[]>([]);
    const [showLibraryLocationsModal, setShowLibraryLocationsModal] = useState(false);

    const [sections, setSections] = useState<string[]>([]);
    const [showSectionsModal, setShowSectionsModal] = useState(false);

    const [constantsReady, setConstantsReady] = useState(false);

    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const loadCollection = async (force = false): Promise<CollectionData | null> => {
        if (!id) return null;

        try {
            const record = (await fetchCollectionById(id, force)) as CollectionData | null;

            if (!record) {
                console.warn('Collection not found', id);
                setModalMessage('Collection not found');
                setModalType('error');
                setCollectionData(null);
                return null;
            }

            setCollectionData(record);
            return record;
        } catch (error) {
            console.error('Error fetching collection data:', error);
            setModalMessage('Failed to fetch collection data');
            setModalType('error');
            return null;
        }
    };

    useEffect(() => {
        let active = true;
        setLoading(true);
        loadCollection().finally(() => {
            if (active) setLoading(false);
        });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const refetchCollection = async () => {
        if (!id) return;
        try {
            setIsRefreshing(true);
            await loadCollection(true);
        } finally {
            setIsRefreshing(false);
        }
    };

    const syncAfterMutation = async () => {
        invalidateCollectionCaches();
        clearCachedFetch("collectionLogs");
        await Promise.all([loadCollection(true), loadLogs(true)]);
    };

    useEffect(() => {
        let active = true;
        void Promise.all([
            readConstantsList("fetchLibraryLocations", "libraryLocations"),
            readConstantsList("fetchSections", "sections"),
        ]).then(([locations, nextSections]) => {
            if (!active) return;
            setLibraryLocations(locations ?? []);
            setSections(nextSections ?? []);
            setConstantsReady(true);
        });
        return () => {
            active = false;
        };
    }, []);

    const handleArchiveToggleClick = () => {
        if (!collectionData) return;
        setArchiveAction(
            collectionData.Status === "Archived" ? "unarchive" : "archive",
        );
        setShowArchiveModal(true);
        setArchiveConfirmChecked(false);
    };

    const confirmArchiveToggle = async () => {
        if (!collectionData) return;

        const prevData = collectionData;
        setArchiveProcessing(true);
        try {
                        await archiveCall({
                case: 'collectionArchiveUnarchive',
                targetUID: collectionData.UID,
                action: archiveAction,
            });

            setShowArchiveModal(false);
            setArchiveConfirmChecked(false);

            await syncAfterMutation();

            setModalMessage(`Collection ${archiveAction}d successfully`);
            setModalType("success");
        } catch (error) {
            console.error("Error archiving/unarchiving collection:", error);
            setModalMessage(
                error instanceof Error && error.message
                    ? error.message
                    : `Failed to ${archiveAction} collection "${prevData.CollectionTitle}". Please try again.`,
            );
            setModalType("error");
            setCollectionData(prevData);
        } finally {
            setArchiveProcessing(false);
        }
    };

    const resolveSection = (): string =>
        (newSection === OTHER_SECTION ? customSection : newSection).trim();

    const cancelCopyEdit = () => {
        setEditingIndex(null);
        setEditValue("");
        setNewSection("");
        setCustomSection("");
        setEditLocation("");
        setCustomEditLocation("");
        setEditingOtherIdx(null);
        setEditedOtherRow(null);
        setEditingCopyKey("");
    };

    const discardCopyDrafts = () => {
        cancelCopyEdit();
        setIsAddingPkcCopy(false);
        setNewCopyInput("");
        setNewForLibraryUse(true);
        setOtherLibraryCopyRows([]);
    };

    useEffect(() => {
        discardCopyDrafts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const closeCopyArchiveModal = (kind: CopyKind) => {
        if (kind === "other") {
            setShowOtherCopyArchiveModal(false);
            setOtherCopyArchiveConfirmChecked(false);
            setOtherCopyToArchiveIndex(null);
        } else {
            setShowCopyArchiveModal(false);
            setCopyArchiveConfirmChecked(false);
            setCopyToArchiveIndex(null);
        }
    };

    const handleAddCopy = async (
        kind: CopyKind,
        draft?: OtherLibraryCopyDraft,
        draftIndex?: number,
    ) => {
        if (!collectionData) return;

        const isOther = kind === "other";
        if (isOther ? isSavingOtherLibraryCopy : isSavingPkcCopy) return;

        let payload: Record<string, unknown>;

        if (isOther) {
            if (!draft) return;

            const callNumber = draft.callNumber.trim();
            const libraryLocation = draft.libraryLocation.trim();
            const copiesAvailable = parseCopyCount(draft.copies);

            if (!callNumber || !libraryLocation) {
                setModalMessage("Please provide both a Call Number and a Library Location.");
                setModalType("error");
                return;
            }
            if (!CALL_NUMBER_PATTERN.test(callNumber)) {
                setModalMessage("Call number may only contain letters, digits, dots, slashes, hyphens and spaces.");
                setModalType("error");
                return;
            }
            if (copiesAvailable === null) {
                setModalMessage("Copies available must be a whole number above zero.");
                setModalType("error");
                return;
            }

            payload = { callNumber, libraryLocation, copiesAvailable };
        } else {
            const accession = newCopyInput.trim();
            if (!accession) {
                setModalMessage("Please provide an Accession number.");
                setModalType("error");
                return;
            }
            if (!ACCESSION_PATTERN.test(accession)) {
                setModalMessage("Accession must be letters, digits and hyphens only.");
                setModalType("error");
                return;
            }

            const section = resolveSection();
            if (!section) {
                setModalMessage("Please select a section for PKC.");
                setModalType("error");
                return;
            }

            payload = {
                accession,
                libraryLocation: PKC_LOCATION,
                section,
                forLibraryUse: newForLibraryUse,
            };
        }

        const setSaving = isOther ? setIsSavingOtherLibraryCopy : setIsSavingPkcCopy;

        try {
            setSaving(true);
                        const result = await addCall({
                case: "addCollectionCopies",
                collectionUID: collectionData.UID || "",
                collectionTitle: collectionData.CollectionTitle,
                isOtherCopy: isOther,
                ...payload,
            });

            const outcome = result.data as CopyMutationResult;
            if (outcome?.success) {
                await syncAfterMutation();
                setModalMessage(outcome.message || "Copy added successfully");
                setModalType("success");

                if (isOther) {
                    setOtherLibraryCopyRows((rows) =>
                        typeof draftIndex === "number"
                            ? rows.filter((_, i) => i !== draftIndex)
                            : [],
                    );
                } else {
                    setNewCopyInput("");
                    setNewSection("");
                    setCustomSection("");
                    setIsAddingPkcCopy(false);
                }
            }
        } catch (error: unknown) {
            setModalMessage(callableErrorMessage(error) || "Failed to add copy");
            setModalType("error");
        } finally {
            setSaving(false);
        }
    };

    const isStaleCopyError = (error: unknown): boolean => {
        const code = callableErrorCode(error);
        return code.endsWith("aborted") || code.endsWith("not-found");
    };

    const reportCopyFailure = async (error: unknown, fallback: string) => {
        if (isStaleCopyError(error)) {
            cancelCopyEdit();
            await syncAfterMutation();
            setModalMessage(
                callableErrorMessage(error) ||
                    "That copy changed while this page was open. It has been refreshed — please try again.",
            );
        } else {
            setModalMessage(callableErrorMessage(error) || fallback);
        }
        setModalType("error");
    };

    const handleSaveCopyEdit = async (kind: CopyKind) => {
        if (!collectionData) return;

        const isOther = kind === "other";
        const setSaving = isOther ? setIsSavingOtherLibraryCopy : setIsSavingPkcCopy;
        let payload: Record<string, unknown>;

        if (isOther) {
            if (editingOtherIdx === null || !editedOtherRow) return;

            const callNumber = editedOtherRow.CallNumber.trim();
            const libraryLocation = editedOtherRow.LibraryLocation.trim();
            const copiesAvailable = parseCopyCount(
                String(editedOtherRow.CopiesAvailable),
            );

            if (!callNumber || !libraryLocation) {
                setModalMessage("Please fill in both Call Number and Library Location.");
                setModalType("error");
                return;
            }
            if (!CALL_NUMBER_PATTERN.test(callNumber)) {
                setModalMessage("Call number may only contain letters, digits, dots, slashes, hyphens and spaces.");
                setModalType("error");
                return;
            }
            if (copiesAvailable === null) {
                setModalMessage("Copies available must be a whole number above zero.");
                setModalType("error");
                return;
            }

            payload = { callNumber, libraryLocation, copiesAvailable, copyIndex: editingOtherIdx };
        } else {
            if (editingIndex === null) return;

            const accession = editValue.trim();
            const libraryLocation =
                editLocation === OTHER_LOCATION ? customEditLocation.trim() : editLocation;

            if (accession && !ACCESSION_PATTERN.test(accession)) {
                setModalMessage("Accession must be letters, digits and hyphens only.");
                setModalType("error");
                return;
            }

            if (!accession || !libraryLocation) {
                setModalMessage("Please fill in both Accession and Library Location.");
                setModalType("error");
                return;
            }

            let section = collectionData.Copies?.[editingIndex]?.Section || "";
            if (libraryLocation === PKC_LOCATION) {
                const resolved = resolveSection();
                if (!resolved) {
                    setModalMessage("Please select a section for PKC.");
                    setModalType("error");
                    return;
                }
                section = resolved;
            }

            payload = {
                accession,
                libraryLocation,
                section,
                forLibraryUse: editForLibraryUse,
                copyIndex: editingIndex,
            };
        }

        try {
            setSaving(true);
                        const result = await editCall({
                case: "editCollectionCopies",
                collectionUID: collectionData.UID || "",
                collectionTitle: collectionData.CollectionTitle,
                isOtherCopy: isOther,
                expectedKey: editingCopyKey,
                ...payload,
            });

            const outcome = result.data as CopyMutationResult;
            if (outcome?.success) {
                await syncAfterMutation();
                setModalMessage(outcome.message || "Copy updated successfully");
                setModalType("success");
                cancelCopyEdit();
            }
        } catch (error: unknown) {
            await reportCopyFailure(error, "Failed to save copy");
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmCopyArchive = async (kind: CopyKind) => {
        if (!collectionData) return;

        const isOther = kind === "other";
        const index = isOther ? otherCopyToArchiveIndex : copyToArchiveIndex;
        if (index === null) return;

        const copy = isOther
            ? collectionData.OtherCopies?.[index]
            : collectionData.Copies?.[index];
        if (!copy) return;

        const action = copy.Availability === "Archived" ? "unarchive" : "archive";
        const expectedKey =
            "CallNumber" in copy ? copy.CallNumber : copy.Accession;

        setArchiveProcessing(true);
        try {
                        const result = await archiveCall({
                case: "archiveUnarchiveCollectionCopies",
                collectionUID: collectionData.UID || "",
                collectionTitle: collectionData.CollectionTitle,
                isOtherCopy: isOther,
                copyIndex: index,
                action,
                expectedKey,
            });

            const outcome = result.data as CopyMutationResult;
            if (outcome?.success) {
                await syncAfterMutation();
                setModalMessage(outcome.message || "Copy updated successfully");
                setModalType("success");
                closeCopyArchiveModal(kind);
            }
        } catch (error: unknown) {
            closeCopyArchiveModal(kind);
            await reportCopyFailure(error, "Failed to archive/unarchive copy");
        } finally {
            setArchiveProcessing(false);
        }
    };

    const openConstantsModal = async (
        fetchCase: ConstantsFetch,
        key: ConstantsKey,
        apply: (next: string[]) => void,
        show: (open: boolean) => void,
    ) => {
        const list = await readConstantsList(fetchCase, key, true);
        if (list) apply(list);
        show(true);
    };

    const handleOpenLibraryLocationsModal = () =>
        openConstantsModal(
            "fetchLibraryLocations",
            "libraryLocations",
            setLibraryLocations,
            setShowLibraryLocationsModal,
        );

    const handleOpenSectionsModal = () =>
        openConstantsModal(
            "fetchSections",
            "sections",
            setSections,
            setShowSectionsModal,
        );

    const updateOtherRow = <K extends keyof OtherLibraryCopyDraft>(
        idx: number,
        field: K,
        value: OtherLibraryCopyDraft[K],
    ) => {
        setOtherLibraryCopyRows((prev) =>
            prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
        );
    };

    const updateEditedOtherRow = <K extends keyof OtherLibraryCopy>(
        field: K,
        value: OtherLibraryCopy[K],
    ) => {
        setEditedOtherRow((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const startEditPkcCopy = (idx: number) => {
        if (!collectionData?.Copies?.[idx]) return;

        const copy = collectionData.Copies[idx];
        setEditingIndex(idx);
        setEditValue(copy.Accession);
        setEditingCopyKey(copy.Accession || "");
        setEditForLibraryUse(copy.ForLibraryUse ?? false);

        if (copy.LibraryLocation === PKC_LOCATION) {
            setEditLocation(copy.LibraryLocation);
            setCustomEditLocation("");
            if (!copy.Section) {
                setNewSection("");
                setCustomSection("");
            } else if (sections.includes(copy.Section)) {
                setNewSection(copy.Section);
                setCustomSection("");
            } else {
                setNewSection(OTHER_SECTION);
                setCustomSection(copy.Section);
            }
        } else {
            setEditLocation(OTHER_LOCATION);
            setCustomEditLocation(copy.LibraryLocation);
            setNewSection("");
            setCustomSection("");
        }
    };

    const startEditOtherLibraryCopy = (idx: number) => {
        if (!collectionData?.OtherCopies?.[idx]) return;

        const copy = collectionData.OtherCopies[idx];
        setEditingOtherIdx(idx);
        setEditedOtherRow({ ...copy });
        setEditingCopyKey(copy.CallNumber || "");
    };

    const getOrdinal = (n: number): string => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const homeButtonsDisabled =
        isAddingPkcCopy ||
        isSavingPkcCopy ||
        isSavingOtherLibraryCopy ||
        archiveProcessing ||
        editingIndex !== null ||
        editingOtherIdx !== null ||
        (otherLibraryCopyRows && otherLibraryCopyRows.length > 0);

    return {
        collectionData,
        loading,
        activeTab,
        setActiveTab,
        modalMessage,
        modalType,
        setModalMessage,
        showFullDesc,
        setShowFullDesc,

        activeMarcBlock,
        setActiveMarcBlock,

        showArchiveModal,
        setShowArchiveModal,
        archiveConfirmChecked,
        setArchiveConfirmChecked,
        archiveAction,
        setArchiveAction,

        newCopyInput,
        setNewCopyInput,
        editingIndex,
        setEditingIndex,
        editLocation,
        setEditLocation,
        editValue,
        setEditValue,
        editForLibraryUse,
        setEditForLibraryUse,
        newForLibraryUse,
        setNewForLibraryUse,
        newSection,
        setNewSection,
        customSection,
        setCustomSection,
        customEditLocation,
        setCustomEditLocation,

        copyToArchiveIndex,
        setCopyToArchiveIndex,
        showCopyArchiveModal,
        setShowCopyArchiveModal,
        copyArchiveConfirmChecked,
        setCopyArchiveConfirmChecked,

        otherLibraryCopyRows,
        setOtherLibraryCopyRows,
        editingOtherIdx,
        setEditingOtherIdx,
        editedOtherRow,
        setEditedOtherRow,
        otherCopyToArchiveIndex,
        setOtherCopyToArchiveIndex,
        showOtherCopyArchiveModal,
        setShowOtherCopyArchiveModal,
        otherCopyArchiveConfirmChecked,
        setOtherCopyArchiveConfirmChecked,

        modificationLogs: modificationLogsState,
        checkoutHistory: checkoutHistoryState,
        checkinHistory: checkinHistoryState,

        libraryLocations,
        setLibraryLocations,
        showLibraryLocationsModal,
        setShowLibraryLocationsModal,
        sections,
        setSections,
        showSectionsModal,
        setShowSectionsModal,
        constantsReady,

        handleArchiveToggleClick,
        confirmArchiveToggle,
        archiveProcessing,
        handleAddCopy,
        handleSaveCopyEdit,
        handleConfirmCopyArchive,
        cancelCopyEdit,
        handleOpenLibraryLocationsModal,
        handleOpenSectionsModal,
        updateOtherRow,
        updateEditedOtherRow,
        startEditPkcCopy,
        startEditOtherLibraryCopy,
        getOrdinal,
        isAddingPkcCopy,
        setIsAddingPkcCopy,
        isSavingPkcCopy,
        isSavingOtherLibraryCopy,
        isRefreshing,
        refetchCollection,
        homeButtonsDisabled,
    };
}
