import { useMemo } from "react";
import { Archive, ArchiveRestore, BookCopy, Landmark, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TablePagination,
    TableRow,
} from "@/components/ui/Table";
import { usePagedList } from "@/hooks/use-paged-list";
import { formatTimestamp } from "@/lib/format/date";
import {
    OTHER_SECTION,
    PKC_LOCATION,
    type CollectionsViewHook,
} from "@/features/lms/collections/pages/view-collection/api/collections-view-logic";
import { emptyOtherLibraryCopyDraft } from "@/features/lms/collections/pages/view-collection/types/collections-view-types";
import type { EpochMillis } from "@/features/lms/collections/pages/view-collection/types/collections-view-types";

interface ViewCollectionCopiesProps {
    view: CollectionsViewHook;
    canAdd: boolean;
    canEdit: boolean;
    canArchive: boolean;
    canConfigureLibraryLocations: boolean;
}

const HEAD = "px-3 py-2 border text-left";

const CELL = "px-3 py-2 border";

const COPIES_PER_PAGE = 5;
const PER_PAGE_OPTIONS = [5, 10];

const ACTIONS_CELL = "mx-auto flex w-[200px] items-stretch gap-2";
const ACTION_BTN = "flex-1 text-xs";
const ACTIONS_HEAD = "px-3 py-2 border text-center w-[224px]";

const FLAG_CELL = `${CELL} text-center`;

const SECTION_ACTIONS =
    "flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row";
const SECTION_ACTION_BTN = "w-full text-xs sm:w-auto sm:text-sm";

const when = (value: EpochMillis): string => formatTimestamp(value) || "-";

function AvailabilityBadge({ status }: { status?: string }) {
    const label = (status || "").trim() || "Available";
    const tone =
        {
            Archived: "bg-red-100 text-red-700",
            Borrowed: "bg-amber-100 text-amber-700",
            Reserved: "bg-blue-100 text-blue-700",
            Available: "bg-green-100 text-green-700",
        }[label] ?? "bg-gray-100 text-gray-600";

    return (
        <Badge
            variant={null}
            className={`shrink-0 border-0 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-normal font-[gothamMedium] ${tone}`}
        >
            {label}
        </Badge>
    );
}

function SectionPicker({
    section,
    onSectionChange,
    custom,
    onCustomChange,
    sections,
}: {
    section: string;
    onSectionChange: (value: string) => void;
    custom: string;
    onCustomChange: (value: string) => void;
    sections: string[];
}) {
    return (
        <div className="space-y-1">
            <Select
                value={section || undefined}
                onValueChange={(value) => {
                    onSectionChange(value);
                    if (value !== OTHER_SECTION) onCustomChange("");
                }}
            >
                <SelectTrigger className={CELL_SELECT}>
                    <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                    {sections.map((s) => (
                        <SelectItem key={s} value={s}>
                            {s}
                        </SelectItem>
                    ))}
                    <SelectItem value={OTHER_SECTION}>
                        {OTHER_SECTION} (type your own)
                    </SelectItem>
                </SelectContent>
            </Select>
            {section === OTHER_SECTION && (
                <Input
                    type="text"
                    placeholder="Enter custom section"
                    value={custom}
                    onChange={(e) => onCustomChange(e.target.value)}
                    className={CELL_INPUT}
                />
            )}
        </div>
    );
}

const CELL_SELECT =
    "h-auto rounded border px-2 py-1 text-base shadow-none w-full";

const CELL_INPUT =
    "h-auto rounded border px-2 py-1 shadow-none text-base sm:text-base md:text-base w-full";

const EDIT_BTN =
    "border-green-700/70 text-green-700 hover:border-green-600 hover:bg-green-200/10 hover:text-green-700";
const ARCHIVE_BTN =
    "border-red-600/50 text-red-600 hover:border-red-600 hover:bg-red-200/10 hover:text-red-600";
const UNARCHIVE_BTN =
    "border-yellow-600/70 text-yellow-700 hover:border-yellow-600 hover:bg-yellow-200/10 hover:text-yellow-700";

export default function ViewCollectionCopies({
    view,
    canAdd,
    canEdit,
    canArchive,
    canConfigureLibraryLocations,
}: ViewCollectionCopiesProps) {
    const {
        collectionData,
        newCopyInput,
        setNewCopyInput,
        editingIndex,
        editLocation,
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
        setCopyToArchiveIndex,
        setShowCopyArchiveModal,
        setCopyArchiveConfirmChecked,
        otherLibraryCopyRows,
        setOtherLibraryCopyRows,
        editingOtherIdx,
        editedOtherRow,
        setOtherCopyToArchiveIndex,
        setShowOtherCopyArchiveModal,
        setOtherCopyArchiveConfirmChecked,
        libraryLocations,
        sections,
        constantsReady,
        handleAddCopy,
        handleSaveCopyEdit,
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
        homeButtonsDisabled,
    } = view;

    const copies = useMemo(() => collectionData?.Copies ?? [], [collectionData?.Copies]);
    const otherCopies = useMemo(() => collectionData?.OtherCopies ?? [], [collectionData?.OtherCopies]);

    const copiesPage = usePagedList(copies, COPIES_PER_PAGE);
    const otherCopiesPage = usePagedList(otherCopies, COPIES_PER_PAGE);

    const absoluteIndex = (page: { currentPage: number; itemsPerPage: number }, row: number) =>
        (page.currentPage - 1) * page.itemsPerPage + row;

    return (
        <div className="space-y-8">
            <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-3 mb-6">
                    <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
                        <BookCopy className="size-4 md:size-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                                    Copies from PKC
                                </Text>
                                <Text className="text-xs md:text-sm text-gray-500">
                                    Physical copies held at this library, and where on the shelves each one sits.
                                </Text>
                            </div>
                            <div className={SECTION_ACTIONS}>
                                {canAdd && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className={SECTION_ACTION_BTN}
                                        onClick={() => {
                                            setNewCopyInput("");
                                            setNewSection("");
                                            setCustomSection("");
                                            setNewForLibraryUse(true);
                                            setIsAddingPkcCopy(true);
                                        }}
                                        disabled={homeButtonsDisabled || !constantsReady}
                                    >
                                        {isSavingPkcCopy ? 'Saving...' : 'Add a Copy'}
                                    </Button>
                                )}
                                {canConfigureLibraryLocations && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={SECTION_ACTION_BTN}
                                        onClick={() => handleOpenSectionsModal()}
                                        disabled={homeButtonsDisabled}
                                    >
                                        Configure Sections
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl shadow-sm max-h-[60vh] overflow-y-auto bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={HEAD}>Copy</TableHead>
                                <TableHead className={HEAD}>Accession</TableHead>
                                <TableHead className={HEAD}>Library Location</TableHead>
                                <TableHead className={HEAD}>Section</TableHead>
                                <TableHead className={HEAD}>Created By</TableHead>
                                <TableHead className={HEAD}>Created On</TableHead>
                                <TableHead className={HEAD}>Last Modified By</TableHead>
                                <TableHead className={HEAD}>Modified On</TableHead>
                                <TableHead className={HEAD}>Last Borrowed By</TableHead>
                                <TableHead className={HEAD}>Last Borrowed Date</TableHead>
                                <TableHead className={HEAD}>For Library Use?</TableHead>
                                <TableHead className={HEAD}>Availability</TableHead>
                                <TableHead className={ACTIONS_HEAD}>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {copies.length > 0 || isAddingPkcCopy ? (
                                <>
                                    {copiesPage.items.map((copy, row) => {
                                      const idx = absoluteIndex(copiesPage, row);
                                      return (
                                        <TableRow key={`existing-${idx}`} className="bg-white">
                                            <TableCell className={CELL}>{getOrdinal(idx + 1)} Copy</TableCell>
                                            <TableCell className={CELL}>
                                                {editingIndex === idx ? (
                                                    <Input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className={CELL_INPUT}
                                                        placeholder="Enter Accession"
                                                    />
                                                ) : (
                                                    copy.Accession
                                                )}
                                            </TableCell>
                                            <TableCell className={CELL}>
                                                {copy.LibraryLocation || PKC_LOCATION}
                                                {copy.LibraryLocation &&
                                                    copy.LibraryLocation !== PKC_LOCATION && (
                                                        <span className="ml-1 text-xs text-amber-700">
                                                            (not the library's recorded name)
                                                        </span>
                                                    )}
                                            </TableCell>
                                            <TableCell className={CELL}>
                                                {editingIndex === idx
                                                    ? editLocation === PKC_LOCATION && (
                                                          <SectionPicker
                                                              section={newSection}
                                                              onSectionChange={setNewSection}
                                                              custom={customSection}
                                                              onCustomChange={setCustomSection}
                                                              sections={sections}
                                                          />
                                                      )
                                                    : copy.Section || "-"}
                                            </TableCell>
                                            <TableCell className={CELL}>{copy.CreatedBy}</TableCell>
                                            <TableCell className={CELL}>{when(copy.CreatedOn)}</TableCell>
                                            <TableCell className={CELL}>{copy.LastModifiedBy}</TableCell>
                                            <TableCell className={CELL}>{when(copy.ModifiedOn)}</TableCell>
                                            <TableCell className={CELL}>{copy.LastBorrowedBy || "-"}</TableCell>
                                            <TableCell className={CELL}>{when(copy.LastBorrowedDate)}</TableCell>
                                            <TableCell className={FLAG_CELL}>
                                                {editingIndex === idx ? (
                                                    <Select
                                                        value={editForLibraryUse ? "true" : "false"}
                                                        onValueChange={(value) => setEditForLibraryUse(value === "true")}
                                                    >
                                                        <SelectTrigger className={CELL_SELECT}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="true">Yes</SelectItem>
                                                            <SelectItem value="false">No</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : copy.ForLibraryUse ? (
                                                    "Yes"
                                                ) : (
                                                    "No"
                                                )}
                                            </TableCell>
                                            <TableCell className={FLAG_CELL}><AvailabilityBadge status={copy.Availability} /></TableCell>
                                            <TableCell className={CELL}>
                                                <div className={ACTIONS_CELL}>
                                                    {editingIndex === idx ? (
                                                        <>
                                                            <Button
                                                                variant="success"
                                                                size="sm"
                                                                className={ACTION_BTN}
                                                                onClick={() => handleSaveCopyEdit("pkc")}
                                                                disabled={isSavingPkcCopy}
                                                            >
                                                                {isSavingPkcCopy ? 'Saving...' : 'Save'}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className={ACTION_BTN}
                                                                onClick={cancelCopyEdit}
                                                                disabled={isSavingPkcCopy}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {canEdit && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className={`${ACTION_BTN} ${EDIT_BTN}`}
                                                                    onClick={() => startEditPkcCopy(idx)}
                                                                    disabled={
                                                                        homeButtonsDisabled ||
                                                                        !constantsReady ||
                                                                        copy.Availability === "Archived"
                                                                    }
                                                                >
                                                                    <Pencil className="size-3.5" />
                                                                    Edit
                                                                </Button>
                                                            )}
                                                            {canArchive && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className={`${ACTION_BTN} ${
                                                                        copy.Availability === "Archived"
                                                                            ? UNARCHIVE_BTN
                                                                            : ARCHIVE_BTN
                                                                    }`}
                                                                    onClick={() => {
                                                                        setCopyToArchiveIndex(idx);
                                                                        setShowCopyArchiveModal(true);
                                                                        setCopyArchiveConfirmChecked(false);
                                                                    }}
                                                                    disabled={homeButtonsDisabled}
                                                                >
                                                                    {copy.Availability === "Archived" ? (
                                                                        <ArchiveRestore className="size-3.5" />
                                                                    ) : (
                                                                        <Archive className="size-3.5" />
                                                                    )}
                                                                    {copy.Availability === "Archived" ? "Unarchive" : "Archive"}
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                      );
                                    })}

                                    {isAddingPkcCopy && (
                                        <TableRow key="new-pkc" className="bg-white">
                                            <TableCell className={CELL}>{getOrdinal((collectionData?.Copies?.length || 0) + 1)} Copy</TableCell>
                                            <TableCell className={CELL}>
                                                <Input
                                                    type="text"
                                                    value={newCopyInput}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (/^[a-zA-Z0-9-]*$/.test(value)) {
                                                            setNewCopyInput(value);
                                                        }
                                                    }}
                                                    className={CELL_INPUT}
                                                    placeholder="Enter Accession"
                                                />
                                            </TableCell>
                                            <TableCell className={CELL}>{PKC_LOCATION}</TableCell>
                                            <TableCell className={CELL}>
                                                <SectionPicker
                                                    section={newSection}
                                                    onSectionChange={setNewSection}
                                                    custom={customSection}
                                                    onCustomChange={setCustomSection}
                                                    sections={sections}
                                                />
                                            </TableCell>
                                            <TableCell className={CELL}>-</TableCell>
                                            <TableCell className={CELL}>-</TableCell>
                                            <TableCell className={CELL}>-</TableCell>
                                            <TableCell className={CELL}>-</TableCell>
                                            <TableCell className={CELL}>-</TableCell>
                                            <TableCell className={CELL}>-</TableCell>
                                            <TableCell className={FLAG_CELL}>
                                                <Select
                                                    value={newForLibraryUse ? "true" : "false"}
                                                    onValueChange={(value) => setNewForLibraryUse(value === "true")}
                                                >
                                                    <SelectTrigger className={CELL_SELECT}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="true">Yes</SelectItem>
                                                        <SelectItem value="false">No</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className={FLAG_CELL}><AvailabilityBadge /></TableCell>
                                            <TableCell className={CELL}>
                                                <div className={ACTIONS_CELL}>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className={ACTION_BTN}
                                                        onClick={() => handleAddCopy("pkc")}
                                                        disabled={isSavingPkcCopy}
                                                    >
                                                        {isSavingPkcCopy ? "Saving..." : "Save Copy"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={ACTION_BTN}
                                                        onClick={() => {
                                                            setNewCopyInput("");
                                                            setNewSection("");
                                                            setCustomSection("");
                                                            setIsAddingPkcCopy(false);
                                                        }}
                                                        disabled={isSavingPkcCopy}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ) : (
                                <TableRow className="bg-white">
                                    <TableCell colSpan={13} className={`${CELL} text-center text-gray-500`}>
                                        This collection has no copies.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {copies.length > 0 && (
                    <div className="flex justify-center items-center">
                        <TablePagination
                            currentPage={copiesPage.currentPage}
                            totalPages={copiesPage.totalPages}
                            itemsPerPage={copiesPage.itemsPerPage}
                            itemsPerPageOptions={PER_PAGE_OPTIONS}
                            onItemsPerPageChange={copiesPage.setItemsPerPage}
                            onGoToPage={copiesPage.goToPage}
                            onPrevPage={copiesPage.prevPage}
                            onNextPage={copiesPage.nextPage}
                        />
                    </div>
                )}
            </div>

            <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-3 mb-6">
                    <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
                        <Landmark className="size-4 md:size-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                                    Copies from Other Library
                                </Text>
                                <Text className="text-xs md:text-sm text-gray-500">
                                    Holdings of this title recorded at libraries outside PKC.
                                </Text>
                            </div>
                            <div className={SECTION_ACTIONS}>
                                {canAdd && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className={SECTION_ACTION_BTN}
                                        onClick={() =>
                                            setOtherLibraryCopyRows((rows) => [
                                                ...rows,
                                                emptyOtherLibraryCopyDraft(),
                                            ])
                                        }
                                        disabled={
                                            homeButtonsDisabled ||
                                            isSavingOtherLibraryCopy ||
                                            !constantsReady
                                        }
                                    >
                                        Add a Copy
                                    </Button>
                                )}
                                {canConfigureLibraryLocations && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={SECTION_ACTION_BTN}
                                        onClick={handleOpenLibraryLocationsModal}
                                        disabled={homeButtonsDisabled || isSavingOtherLibraryCopy}
                                    >
                                        Configure Library Locations
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl shadow-sm max-h-[60vh] overflow-y-auto bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={HEAD}>Call Number</TableHead>
                                <TableHead className={HEAD}>Library Location</TableHead>
                                <TableHead className={HEAD}>Copies Available</TableHead>
                                <TableHead className={HEAD}>Created By</TableHead>
                                <TableHead className={HEAD}>Created On</TableHead>
                                <TableHead className={HEAD}>Modified By</TableHead>
                                <TableHead className={HEAD}>Modified On</TableHead>
                                <TableHead className={HEAD}>Availability</TableHead>
                                <TableHead className={ACTIONS_HEAD}>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {otherCopiesPage.items.map((copy, row) => {
                              const idx = absoluteIndex(otherCopiesPage, row);
                              return (
                                <TableRow key={`saved-${idx}`} className="bg-white">
                                    <TableCell className={CELL}>
                                        {editingOtherIdx === idx && editedOtherRow ? (
                                            <Input
                                                type="text"
                                                value={editedOtherRow.CallNumber}
                                                onChange={(e) =>
                                                    updateEditedOtherRow("CallNumber", e.target.value)
                                                }
                                                className={CELL_INPUT}
                                            />
                                        ) : (
                                            copy.CallNumber
                                        )}
                                    </TableCell>
                                    <TableCell className={CELL}>
                                        {editingOtherIdx === idx && editedOtherRow ? (
                                            <Select
                                                value={editedOtherRow.LibraryLocation || undefined}
                                                onValueChange={(value) =>
                                                    updateEditedOtherRow("LibraryLocation", value)
                                                }
                                            >
                                                <SelectTrigger className={CELL_SELECT}>
                                                    <SelectValue placeholder="Select Library Location" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {!libraryLocations.includes(editedOtherRow.LibraryLocation) &&
                                                        editedOtherRow.LibraryLocation && (
                                                            <SelectItem value={editedOtherRow.LibraryLocation}>
                                                                {editedOtherRow.LibraryLocation} (not on the list)
                                                            </SelectItem>
                                                        )}
                                                    {libraryLocations.map((loc) => (
                                                        <SelectItem key={loc} value={loc}>
                                                            {loc}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            copy.LibraryLocation
                                        )}
                                    </TableCell>
                                    <TableCell className={CELL}>
                                        {editingOtherIdx === idx && editedOtherRow ? (
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={editedOtherRow.CopiesAvailable}
                                                onChange={(e) =>
                                                    updateEditedOtherRow(
                                                        "CopiesAvailable",
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className={CELL_INPUT}
                                            />
                                        ) : (
                                            copy.CopiesAvailable
                                        )}
                                    </TableCell>
                                    <TableCell className={CELL}>{copy.CreatedBy}</TableCell>
                                    <TableCell className={CELL}>{when(copy.CreatedOn)}</TableCell>
                                    <TableCell className={CELL}>{copy.ModifiedBy}</TableCell>
                                    <TableCell className={CELL}>{when(copy.ModifiedOn)}</TableCell>
                                    <TableCell className={FLAG_CELL}><AvailabilityBadge status={copy.Availability} /></TableCell>
                                    <TableCell className={CELL}>
                                        <div className={ACTIONS_CELL}>
                                            {editingOtherIdx === idx ? (
                                                <>
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        className={ACTION_BTN}
                                                        onClick={() => handleSaveCopyEdit("other")}
                                                        disabled={isSavingOtherLibraryCopy}
                                                    >
                                                        {isSavingOtherLibraryCopy ? 'Saving...' : 'Save'}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={ACTION_BTN}
                                                        onClick={cancelCopyEdit}
                                                        disabled={isSavingOtherLibraryCopy}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    {canEdit && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={`${ACTION_BTN} ${EDIT_BTN}`}
                                                            onClick={() => startEditOtherLibraryCopy(idx)}
                                                            disabled={
                                                                homeButtonsDisabled ||
                                                                !constantsReady ||
                                                                copy.Availability === "Archived"
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                            Edit
                                                        </Button>
                                                    )}
                                                    {canArchive && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={`${ACTION_BTN} ${
                                                                copy.Availability === "Archived"
                                                                    ? UNARCHIVE_BTN
                                                                    : ARCHIVE_BTN
                                                            }`}
                                                            onClick={() => {
                                                                setOtherCopyToArchiveIndex(idx);
                                                                setShowOtherCopyArchiveModal(true);
                                                                setOtherCopyArchiveConfirmChecked(false);
                                                            }}
                                                            disabled={homeButtonsDisabled}
                                                        >
                                                            {copy.Availability === "Archived" ? (
                                                                <ArchiveRestore className="size-3.5" />
                                                            ) : (
                                                                <Archive className="size-3.5" />
                                                            )}
                                                            {copy.Availability === "Archived" ? "Unarchive" : "Archive"}
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                              );
                            })}

                            {otherLibraryCopyRows.map((row, idx) => (
                                <TableRow key={`new-${idx}`} className="bg-white">
                                    <TableCell className={CELL}>
                                        <Input
                                            type="text"
                                            className={CELL_INPUT}
                                            placeholder="Enter Call Number"
                                            value={row.callNumber}
                                            onChange={(e) => updateOtherRow(idx, "callNumber", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className={CELL}>
                                        <Select
                                            value={row.libraryLocation || undefined}
                                            onValueChange={(value) =>
                                                updateOtherRow(idx, "libraryLocation", value)
                                            }
                                        >
                                            <SelectTrigger className={CELL_SELECT}>
                                                <SelectValue placeholder="Select Library Location" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {libraryLocations.map((loc) => (
                                                    <SelectItem key={loc} value={loc}>
                                                        {loc}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className={CELL}>
                                        <Input
                                            type="number"
                                            min={1}
                                            step={1}
                                            className={CELL_INPUT}
                                            placeholder="Enter number of copies"
                                            value={row.copies}
                                            onChange={(e) => updateOtherRow(idx, "copies", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className={`${CELL} text-center text-gray-400`} colSpan={5}>
                                        New entry (unsaved)
                                    </TableCell>
                                    <TableCell className={CELL}>
                                        <div className={ACTIONS_CELL}>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className={ACTION_BTN}
                                                onClick={() => handleAddCopy("other", row, idx)}
                                                disabled={isSavingOtherLibraryCopy}
                                            >
                                                {isSavingOtherLibraryCopy ? 'Saving...' : 'Save'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={ACTION_BTN}
                                                onClick={() =>
                                                    setOtherLibraryCopyRows((rows) =>
                                                        rows.filter((_, i) => i !== idx),
                                                    )
                                                }
                                                disabled={isSavingOtherLibraryCopy}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {otherCopies.length === 0 && otherLibraryCopyRows.length === 0 && (
                                <TableRow className="bg-white">
                                    <TableCell colSpan={9} className={`${CELL} text-center text-gray-500`}>
                                        No copies from other libraries yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {otherCopies.length > 0 && (
                    <div className="flex justify-center items-center">
                        <TablePagination
                            currentPage={otherCopiesPage.currentPage}
                            totalPages={otherCopiesPage.totalPages}
                            itemsPerPage={otherCopiesPage.itemsPerPage}
                            itemsPerPageOptions={PER_PAGE_OPTIONS}
                            onItemsPerPageChange={otherCopiesPage.setItemsPerPage}
                            onGoToPage={otherCopiesPage.goToPage}
                            onPrevPage={otherCopiesPage.prevPage}
                            onNextPage={otherCopiesPage.nextPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
