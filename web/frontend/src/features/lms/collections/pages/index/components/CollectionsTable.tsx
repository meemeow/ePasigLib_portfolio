import {
  Archive,
  ArchiveRestore,
  Eye,
  ImageOff,
  Loader2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Text } from "@/components/ui/Text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
} from "@/components/ui/Table";
import type { TableCollection } from "@/features/lms/collections/pages/index/types/collections-types";

interface CollectionsTableProps {
  collections: TableCollection[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  canEdit: boolean;
  canArchive: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onArchiveToggle: (collection: TableCollection) => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  formatDate: (value: number | null) => string;
}

const NOT_AVAILABLE = "N/A";

function CoverImage({ src, title }: { src?: string; title: string }) {
  return (
    <div className="flex h-40 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-gray-100">
      {src ? (
        <img
          src={src}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <ImageOff className="size-6 text-gray-400" />
      )}
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  const archived = status === "Archived";
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-[gothamMedium] ${
        archived ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      }`}
    >
      {archived ? "Archived" : "Available"}
    </span>
  );
}

function InfoLine({
  label,
  value,
  clamp = false,
}: {
  label: string;
  value?: string;
  clamp?: boolean;
}) {
  return (
    <Text
      className={`text-sm break-words text-gray-700 ${clamp ? "line-clamp-2" : ""}`}
      title={value || NOT_AVAILABLE}
    >
      <span className="font-[gothamMedium] text-[#003067]">{label}: </span>
      {value || NOT_AVAILABLE}
    </Text>
  );
}

function AuditBlock({
  label,
  on,
  by,
}: {
  label: string;
  on: string;
  by?: string;
}) {
  return (
    <div className="space-y-0.5">
      <Text className="text-xs font-[gothamMedium] tracking-wide text-[#003067] uppercase">
        {label}
      </Text>
      <Text className="text-sm text-gray-700">{on}</Text>
      <Text className="truncate text-xs text-gray-500" title={by}>
        by {by || NOT_AVAILABLE}
      </Text>
    </div>
  );
}

function CollectionDetails({
  collection,
  formatDate,
}: {
  collection: TableCollection;
  formatDate: (value: number | null) => string;
}) {
  const subtitle = [
    collection.SecondTitle,
    collection.Edition && `${collection.Edition}`,
    collection.Volume && `Vol. ${collection.Volume}`,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="flex gap-6">
      <CoverImage
        src={collection.CollectionImage}
        title={collection.CollectionTitle}
      />

      <div className="flex min-w-0 flex-1 gap-6">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Text
              className="font-[gothamMedium] text-base text-[#011b38] sm:text-lg"
              title={collection.CollectionTitle}
            >
              {collection.CollectionTitle}
            </Text>
            <StatusPill status={collection.Status} />
          </div>

          {subtitle && (
            <Text className="text-sm text-gray-500 italic">{subtitle}</Text>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-1">
            <InfoLine label="Author" value={collection.MainAuthor} />
            <InfoLine label="Class Code" value={collection.ClassCode} />
            <InfoLine label="Material Type" value={collection.MaterialType} />
            <InfoLine label="Call Number" value={collection.CallNumber} />
            <InfoLine label="ISBN-10" value={collection.ISBN10} />
            <InfoLine label="ISBN-13" value={collection.ISBN13} />
          </div>

          <InfoLine label="Summary" value={collection.Description} clamp />
        </div>

        <div className="flex w-56 shrink-0 flex-col justify-center gap-3 border-l pl-6">
          <AuditBlock
            label="Created On"
            on={formatDate(collection.CreatedOn)}
            by={collection.CreatedBy}
          />
          <AuditBlock
            label="Modified On"
            on={formatDate(collection.ModifiedOn)}
            by={collection.LastModifiedBy}
          />
        </div>
      </div>
    </div>
  );
}

export default function CollectionsTable({
  collections,
  loading,
  selectedIds,
  onToggleAll,
  onToggleOne,
  canEdit,
  canArchive,
  onView,
  onEdit,
  onArchiveToggle,
  currentPage,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onGoToPage,
  onNextPage,
  onPrevPage,
  formatDate,
}: CollectionsTableProps) {
  if (loading) {
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-[#128CF1]" />
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="p-6 text-center text-gray-500">
          No collections found. Try adjusting your filters or search.
        </div>
      </div>
    );
  }

  const allChecked = collections.every((c) => selectedIds.has(c.id));

  const actions = (collection: TableCollection) => {
    const archived = collection.Status === "Archived";
    const shared = "w-full text-xs";

    return (
      <div className="flex w-[134px] flex-col items-stretch gap-2">
        <Button
          onClick={() => onView(collection.id)}
          variant="secondary"
          size="sm"
          className={`${shared} hover:bg-[#0F76CC]`}
        >
          <Eye className="size-3.5" />
          View Details
        </Button>
        {canEdit && (
          <Button
            onClick={() => onEdit(collection.id)}
            variant="outline"
            size="sm"
            className={`${shared} border-green-700/70 text-green-700 hover:border-green-600 hover:bg-green-200/10 hover:text-green-700`}
          >
            <Pencil className="size-3.5" />
            Edit Collection
          </Button>
        )}
        {canArchive && (
          <Button
            onClick={() => onArchiveToggle(collection)}
            variant="outline"
            size="sm"
            className={`${shared} ${
              archived
                ? "border-yellow-600/70 text-yellow-700 hover:border-yellow-600 hover:bg-yellow-200/10 hover:text-yellow-700"
                : "border-red-600/50 text-red-600 hover:border-red-600 hover:bg-red-200/10 hover:text-red-600"
            }`}
          >
            {archived ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
            {archived ? "Unarchive" : "Archive"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[75px] text-center [&:has([role=checkbox])]:pr-5">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={onToggleAll}
                  aria-label="Select all collections"
                />
              </TableHead>
              <TableHead>Collection Information</TableHead>
              <TableHead className="w-[200px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {collections.map((collection) => (
              <TableRow
                key={collection.id}
                className="transition-colors duration-200 even:bg-blue-50/60 hover:bg-gray-100"
              >
                <TableCell className="text-center align-middle [&:has([role=checkbox])]:pr-5">
                  <Checkbox
                    checked={selectedIds.has(collection.id)}
                    onCheckedChange={() => onToggleOne(collection.id)}
                    aria-label={`Select ${collection.CollectionTitle}`}
                  />
                </TableCell>
                <TableCell className="min-w-[980px] py-5 align-top whitespace-normal">
                  <CollectionDetails
                    collection={collection}
                    formatDate={formatDate}
                  />
                </TableCell>
                <TableCell className="align-middle">
                  <div className="flex justify-center">
                    {actions(collection)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-center">
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          onGoToPage={onGoToPage}
          onPrevPage={onPrevPage}
          onNextPage={onNextPage}
        />
      </div>
    </>
  );
}
