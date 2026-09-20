import type { ReactNode } from "react";
import { BookMarked, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Search } from "@/components/ui/Search";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { TableCell } from "@/components/ui/Table";
import LookupResults, {
  LookupResultRow,
  LookupSelectedRow,
} from "@/features/lms/circulations/components/LookupResults";
import type {
  BookCopy,
  CollectionLite,
  CopyHit,
} from "@/features/lms/circulations/types/circulation-transaction-types";

export interface CopyLookupState {
  query: string;
  setQuery: (value: string) => void;
  results: CopyHit[];
  searching: boolean;
  error: string | null;
  book: CollectionLite | null;
  copy: BookCopy | null;
  select: (hit: CopyHit) => void;
  deselect: () => void;
  clear: () => void;
}

interface CopyPanelProps {
  lookup: CopyLookupState;
  notice?: ReactNode;
  disabled?: boolean;
}

const AVAILABILITY_CLASSES: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  borrowed: "bg-blue-100 text-blue-800",
  reserved: "bg-yellow-100 text-yellow-800",
  pending: "bg-amber-100 text-amber-800",
  archived: "bg-gray-100 text-gray-600",
};

function copyCells(book: CollectionLite, copy: BookCopy, trailing?: ReactNode) {
  return (
    <>
      <TableCell>
        <span
          className="block truncate font-[gothamMedium] text-[#003067]"
          title={book.CollectionTitle || "Untitled"}
        >
          {book.CollectionTitle || "Untitled"}
        </span>
        <span
          className="block truncate text-xs text-gray-500"
          title={book.MainAuthor || ""}
        >
          {book.MainAuthor || " "}
        </span>
      </TableCell>
      <TableCell className="font-mono text-xs text-gray-600">
        {copy.Accession}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={`border-transparent font-[gothamMedium] ${
              AVAILABILITY_CLASSES[
                String(copy.Availability || "").toLowerCase()
              ] || "bg-gray-100 text-gray-700"
            }`}
          >
            {copy.Availability || "Unknown"}
          </Badge>
          {trailing}
        </div>
      </TableCell>
    </>
  );
}

export default function CopyPanel({
  lookup,
  notice,
  disabled,
}: CopyPanelProps) {
  const { book, copy } = lookup;
  const selected = Boolean(book && copy);

  return (
    <section className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1]">
          <BookMarked className="size-4" />
        </span>
        <Text className="font-[gothamMedium] text-[#003067]">Copy</Text>
      </div>

      <div className="space-y-2">
        <Search
          value={lookup.query}
          onChange={lookup.setQuery}
          placeholder="Scan a barcode, or search by accession or title"
          containerClassName="md:w-full"
          disabled={disabled || selected}
        />

        <LookupResults
          columns={["Title", "Accession", "Availability"]}
          query={lookup.query}
          searching={lookup.searching}
          error={lookup.error}
          count={lookup.results.length}
          hint="Matching copies appear here — scan a barcode, or search by accession number or title."
          noun="copy"
          selectedRow={
            book && copy ? (
              <LookupSelectedRow>
                {copyCells(
                  book,
                  copy,
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Clear copy"
                    disabled={disabled}
                    onClick={lookup.deselect}
                    className="size-7 shrink-0 text-gray-500"
                  >
                    <X className="size-4" />
                  </Button>,
                )}
              </LookupSelectedRow>
            ) : null
          }
        >
          {lookup.results.map((hit) => (
            <LookupResultRow
              key={`${hit.book.id}_${hit.copy.Accession}`}
              onSelect={() => lookup.select(hit)}
            >
              {copyCells(hit.book, hit.copy)}
            </LookupResultRow>
          ))}
        </LookupResults>

        {notice}
      </div>
    </section>
  );
}
