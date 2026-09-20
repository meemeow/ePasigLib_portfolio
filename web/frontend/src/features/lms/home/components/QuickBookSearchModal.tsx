import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Search } from "@/components/ui/Search";

import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import QuickSearchMore from "@/features/lms/home/components/QuickSearchMore";
import { useQuickCollectionSearch } from "@/features/lms/home/api/quick-search-api";
import type { TableCollection } from "@/features/lms/collections/pages/index/types/collections-types";

interface QuickBookSearchModalProps {
  open: boolean;
  onClose: () => void;
}

function copyCountOf(collection: TableCollection): number {
  const copies = Array.isArray(collection.Copies) ? collection.Copies : [];
  const other = Array.isArray(collection.OtherCopies)
    ? collection.OtherCopies
    : [];
  return copies.length + other.length;
}

export default function QuickBookSearchModal({
  open,
  onClose,
}: QuickBookSearchModalProps) {
  const navigate = useNavigate();
  const lookup = useQuickCollectionSearch();
  const { reset } = lookup;

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const view = (collection: TableCollection) => {
    onClose();
    navigate(`/lms/collections/view/${collection.id}`);
  };

  return (
    <ModalShell
      open={open}
      title="Book search"
      description="Find a title by name, author or ISBN."
      icon={<SearchIcon className="size-5" />}
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
          placeholder="Search the catalogue..."
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
              No title matches “{lookup.query.trim()}”.
            </Text>
          ) : (
            <>
              <ul className="animate-in fade-in-0 divide-y rounded-xl border duration-200">
                {lookup.results.map((collection) => {
                  const copies = copyCountOf(collection);
                  const archived = collection.Status === "Archived";
                  return (
                    <li
                      key={collection.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <Text className="break-words font-[gothamMedium] text-[#003067]">
                          {collection.CollectionTitle || "Untitled"}
                        </Text>
                        {collection.MainAuthor && (
                          <Text className="truncate text-xs text-gray-500">
                            {collection.MainAuthor}
                          </Text>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`border-transparent font-[gothamMedium] ${
                              archived
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {archived ? "Archived" : "Available"}
                          </Badge>
                          <Text className="text-xs text-gray-500">
                            {copies} {copies === 1 ? "copy" : "copies"}
                          </Text>
                          {(collection.ISBN13 || collection.ISBN10) && (
                            <Text className="font-mono text-xs text-gray-500">
                              {collection.ISBN13 || collection.ISBN10}
                            </Text>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => view(collection)}
                        className="shrink-0 border-[#003067]/70 text-xs text-[#003067] hover:border-[#003067] hover:bg-[#EAF4FE] hover:text-[#003067]"
                      >
                        View full record
                      </Button>
                    </li>
                  );
                })}
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
