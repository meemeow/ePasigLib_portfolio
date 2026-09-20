import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Search } from "@/components/ui/Search";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import QuickSearchMore from "@/features/lms/home/components/QuickSearchMore";
import { useQuickPatronSearch } from "@/features/lms/home/api/quick-search-api";
import type { TablePatron } from "@/features/lms/patrons/pages/index/types/patrons-types";

interface QuickPatronSearchModalProps {
  open: boolean;
  onClose: () => void;
}

const STATE_CLASSES: Record<string, string> = {
  verified: "bg-green-100 text-green-700",
  watchlisted: "bg-yellow-100 text-yellow-800",
  warning: "bg-orange-100 text-orange-800",
  suspended: "bg-red-100 text-red-700",
};

function fullName(patron: TablePatron): string {
  return (
    [patron.FirstName, patron.MiddleName, patron.LastName, patron.Suffix]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed patron"
  );
}

export default function QuickPatronSearchModal({
  open,
  onClose,
}: QuickPatronSearchModalProps) {
  const navigate = useNavigate();
  const lookup = useQuickPatronSearch();
  const { reset } = lookup;

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const view = (patron: TablePatron) => {
    onClose();
    navigate(`/lms/patrons/view/${patron.id}`);
  };

  return (
    <ModalShell
      open={open}
      title="Patron search"
      description="Find a patron by name, email or UID."
      icon={<UserSearch className="size-5" />}
      size="lg"
      onClose={onClose}
      actions={
        <Button
          variant="cancel"
          onClick={onClose}
          className="w-auto md:w-[100px]"
        >
          Close
        </Button>
      }
    >
      <div className="space-y-3">
        <Search
          value={lookup.query}
          onChange={lookup.setQuery}
          placeholder="Search patrons..."
          className="w-full"
        />

        <div className="min-h-[220px]">
          {lookup.searching ? (
            <div className="animate-in fade-in-0 flex flex-col items-center justify-center gap-2 py-16 duration-200">
              <Loader2 className="size-6 animate-spin text-[#128CF1]" />
              <Text className="text-sm text-gray-500">Searching...</Text>
            </div>
          ) : lookup.error ? (
            <Text className="animate-in fade-in-0 text-sm text-red-600 duration-200">
              {lookup.error}
            </Text>
          ) : lookup.query.trim() === "" ? (
            <Text className="py-8 text-center text-sm text-gray-500">
              Start typing to search.
            </Text>
          ) : lookup.results.length === 0 ? (
            <Text className="animate-in fade-in-0 py-8 text-center text-sm text-gray-500 duration-200">
              No patron matches “{lookup.query.trim()}”.
            </Text>
          ) : (
            <>
              <ul className="animate-in fade-in-0 divide-y rounded-xl border duration-200">
                {lookup.results.map((patron) => (
                  <li
                    key={patron.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <Text className="truncate font-[gothamMedium] text-[#003067]">
                        {fullName(patron)}
                      </Text>
                      <Text className="truncate text-xs text-gray-500">
                        {patron.PublicUID || patron.UID}
                        {patron.Email ? ` · ${patron.Email}` : ""}
                      </Text>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`border-transparent font-[gothamMedium] ${
                            STATE_CLASSES[
                              String(patron.State || "").toLowerCase()
                            ] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {patron.State || "Unknown"}
                        </Badge>
                        {patron.Barangay && (
                          <Text className="text-xs text-gray-500">
                            {patron.Barangay}
                          </Text>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => view(patron)}
                      className="shrink-0 border-[#003067]/70 text-xs text-[#003067] hover:border-[#003067] hover:bg-[#EAF4FE] hover:text-[#003067]"
                    >
                      View full record
                    </Button>
                  </li>
                ))}
              </ul>
              <QuickSearchMore
                hasMore={lookup.hasMore}
                loadingMore={lookup.loadingMore}
                loaded={lookup.results.length}
                total={lookup.total}
                onLoadMore={lookup.loadMore}
              />
            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
