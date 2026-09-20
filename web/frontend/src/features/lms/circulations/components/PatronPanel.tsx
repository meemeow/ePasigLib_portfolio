import type { ReactNode } from "react";
import { Nfc, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Search } from "@/components/ui/Search";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { TableCell } from "@/components/ui/Table";
import LookupResults, {
  LookupResultRow,
  LookupSelectedRow,
} from "@/features/lms/circulations/components/LookupResults";
import type { Patron } from "@/features/lms/circulations/types/circulation-transaction-types";

export interface PatronLookupState {
  query: string;
  setQuery: (value: string) => void;
  results: Patron[];
  searching: boolean;
  error: string | null;
  selected: Patron | null;
  select: (patron: Patron | null) => void;
  clear: () => void;
}

export interface NfcState {
  supported: boolean;
  connected: boolean;
  connect: () => void | Promise<void>;
  error: string | null;
}

interface PatronPanelProps {
  lookup: PatronLookupState;
  nfc?: NfcState;
  notice?: ReactNode;
  disabled?: boolean;
}

const STATE_CLASSES: Record<string, string> = {
  verified: "bg-green-100 text-green-700",
  watchlisted: "bg-yellow-100 text-yellow-800",
  warning: "bg-orange-100 text-orange-800",
  suspended: "bg-red-100 text-red-700",
};

function patronName(patron: Patron): string {
  return (
    [patron.FirstName, patron.MiddleName, patron.LastName, patron.Suffix]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed patron"
  );
}

function patronCells(patron: Patron, trailing?: ReactNode) {
  return (
    <>
      <TableCell>
        <span
          className="block truncate font-[gothamMedium] text-[#003067]"
          title={patronName(patron)}
        >
          {patronName(patron)}
        </span>
        <span
          className="block truncate text-xs text-gray-500"
          title={[patron.Email, patron.City].filter(Boolean).join(" · ")}
        >
          {[patron.Email, patron.City].filter(Boolean).join(" · ") || " "}
        </span>
      </TableCell>
      <TableCell className="font-mono text-xs text-gray-600">
        {patron.PublicUID || patron.UID || "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={`border-transparent font-[gothamMedium] ${
              STATE_CLASSES[String(patron.State || "").toLowerCase()] ||
              "bg-gray-100 text-gray-700"
            }`}
          >
            {patron.State || "Unknown"}
          </Badge>
          {trailing}
        </div>
      </TableCell>
    </>
  );
}

export default function PatronPanel({
  lookup,
  nfc,
  notice,
  disabled,
}: PatronPanelProps) {
  const { selected } = lookup;

  return (
    <section className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1]">
            <UserRound className="size-4" />
          </span>
          <Text className="font-[gothamMedium] text-[#003067]">Patron</Text>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {nfc?.supported && !nfc.connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => nfc.connect()}
              className="text-xs"
            >
              <Nfc className="size-3.5" />
              <span className="min-[364px]:hidden">Connect</span>
              <span className="hidden min-[364px]:inline">Connect scanner</span>
            </Button>
          )}
          {nfc?.connected && (
            <Badge
              variant="outline"
              className="border-transparent bg-green-100 text-green-700"
            >
              <Nfc className="size-3" /> Scanner ready
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Search
          value={lookup.query}
          onChange={lookup.setQuery}
          placeholder="Scan a card, or search by name, email or UID"
          containerClassName="md:w-full"
          disabled={disabled || !!selected}
        />

        <LookupResults
          columns={["Patron", "Patron UID", "Standing"]}
          query={lookup.query}
          searching={lookup.searching}
          error={lookup.error}
          count={lookup.results.length}
          hint="Matching patrons appear here — search by name, patron UID or email, or tap a card on the scanner."
          noun="patron"
          selectedRow={
            selected ? (
              <LookupSelectedRow>
                {patronCells(
                  selected,
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Clear patron"
                    disabled={disabled}
                    onClick={() => lookup.select(null)}
                    className="size-7 shrink-0 text-gray-500"
                  >
                    <X className="size-4" />
                  </Button>,
                )}
              </LookupSelectedRow>
            ) : null
          }
        >
          {lookup.results.map((patron) => (
            <LookupResultRow
              key={patron.id}
              onSelect={() => lookup.select(patron)}
            >
              {patronCells(patron)}
            </LookupResultRow>
          ))}
        </LookupResults>

        {notice}
      </div>
    </section>
  );
}
