import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Search, X, Loader2, ChevronRight } from "lucide-react";
import type { BookResult } from "@/features/opac/home/types/opac-home-types";

interface HomeSearchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  results: BookResult[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onSelect: (book: BookResult) => void;
  observerTarget: React.RefObject<HTMLDivElement | null>;
  resultsContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function HomeSearchDropdown({
  value,
  onChange,
  onSearch,
  onClear,
  results,
  isLoading,
  isLoadingMore,
  hasMore,
  onSelect,
  observerTarget,
  resultsContainerRef,
}: HomeSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasInput = value.trim().length > 0;
    const hasResults = results.length > 0;
    setIsOpen((hasInput || hasResults || isLoading) && isFocused);
  }, [value, results, isLoading, isFocused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (book: BookResult) => {
    onChange(book.CollectionTitle);
    setIsOpen(false);
    setIsFocused(false);
    onSelect(book);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
      setIsOpen(false);
      setIsFocused(false);
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (results.length > 0 || value.trim().length > 0) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    onClear();
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="w-full mx-auto relative">
      <div
        className={`
          flex items-center bg-white/95 backdrop-blur-sm rounded-full shadow-lg transition-all duration-200 w-full
          ${isFocused ? "ring-2 ring-gray-500 ring-offset-1 ring-offset-transparent" : ""}
        `}
      >
        <div className="flex-shrink-0 ml-3 md:ml-5 mr-1 md:mr-3 text-gray-400">
          <Search className="w-5 h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search for books, authors, or subjects..."
          className="flex-1 min-w-0 bg-transparent border-none text-gray-800 placeholder:text-gray-400 text-xs md:text-sm xl:text-base py-2 px-1 focus:ring-0 focus:outline-none"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={() => {
            setTimeout(() => {
              if (!wrapperRef.current?.contains(document.activeElement)) {
                setIsFocused(false);
              }
            }, 150);
          }}
        />

        {value && (
          <Button
            type="button"
            variant={null}
            size={null}
            className="flex-shrink-0 mr-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="size-5" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div
          ref={resultsContainerRef}
          className="absolute left-0 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 transition-all duration-200 top-full mt-2"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
              <Text className="mt-3 text-sm text-gray-500">Searching...</Text>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {results.length} result{results.length > 1 ? "s" : ""} found
                </Text>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {results.map((book, index) => (
                  <div
                    key={book.id}
                    className={`
                    flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0
                    ${index === 0 ? "pt-3.5" : ""}
                  `}
                  >
                    <div className="flex-shrink-0 w-12 h-16 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={
                          book.CollectionImage ||
                          "/assets/images/PasigLibrary_Logo.png"
                        }
                        alt={`${book.CollectionTitle} Cover`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            "/assets/images/PasigLibrary_Logo.png";
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <Text className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1">
                        {book.CollectionTitle}
                      </Text>

                      {book.MainAuthor && (
                        <Text className="text-xs text-gray-600 mt-0.5">
                          by {book.MainAuthor}
                        </Text>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {book.CallNumber && (
                          <Text className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full">
                            {book.CallNumber}
                          </Text>
                        )}
                        {book.Publisher && (
                          <Text className="text-[10px] text-gray-500 truncate max-w-[120px]">
                            {book.Publisher}
                          </Text>
                        )}
                        {book.CopyrightYear && (
                          <Text className="text-[10px] text-gray-500">
                            {book.CopyrightYear}
                          </Text>
                        )}
                      </div>

                      {Array.isArray(book.Subjects) &&
                        book.Subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {book.Subjects.slice(0, 2).map(
                              (s: string, i: number) => (
                                <Text
                                  key={i}
                                  className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] rounded-full"
                                >
                                  {s}
                                </Text>
                              ),
                            )}
                            {book.Subjects.length > 2 && (
                              <Text className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-[9px] rounded-full">
                                +{book.Subjects.length - 2}
                              </Text>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="flex-shrink-0 flex items-center self-center h-full">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-[GothamMedium] rounded-md transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(book);
                        }}
                      >
                        View Details
                        <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                {isLoadingMore && (
                  <div className="flex items-center justify-center py-4 bg-gray-50">
                    <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
                    <Text className="ml-2 text-sm text-gray-500">
                      Loading more...
                    </Text>
                  </div>
                )}

                {hasMore && !isLoadingMore && (
                  <div ref={observerTarget} className="h-1" />
                )}

                {!hasMore && results.length > 0 && (
                  <Text className="text-center py-3 text-xs text-gray-400 border-t border-gray-100">
                    — End of results —
                  </Text>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <Text className="text-gray-600 font-medium">
                No results found
              </Text>
              <Text className="text-sm text-gray-400 mt-1">
                Try adjusting your search terms
              </Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
