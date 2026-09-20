import { useNavigate } from "react-router-dom";
import { Text } from "@/components/ui/Text";
import { useHomeSearch } from "@/features/opac/home/api/opac-home-logic";
import { useEffect, useRef } from "react";
import type { BookResult } from "@/features/opac/home/types/opac-home-types";
import { HomeTitle } from "@/features/opac/home/components/HomeTitle";
import { HomeQuote } from "@/features/opac/home/components/HomeQuote";
import { HomeSearchDropdown } from "@/features/opac/home/components/HomeSearchDropdown";
import { Seo } from "@/lib/seo/Seo";
import { graph, libraryNode, websiteNode } from "@/lib/seo/structured-data";

function Page() {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    clearSearch,
    loadMore,
    resultsContainerRef,
  } = useHomeSearch();

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const handleSearch = () => {
    if (results.length === 1) {
      navigate(`/opac/collections/${results[0].id}`);
    } else if (results.length > 1) {
      navigate(`/opac/collections?q=${encodeURIComponent(query)}`);
    }
  };

  const handleSelect = (book: BookResult) => {
    navigate(`/opac/collections/${book.id}`);
  };

  return (
    <div className="py-10 lg:py-16.5 w-full flex flex-1 flex-col items-center justify-center px-8 sm:px-10 md:px-20 relative">
      <Seo
        description="Search the Pasig Knowledge Center catalogue — books, references and periodicals held by Pasig City's public library. Free to browse, free to borrow."
        canonical="/opac/home"
        structuredData={graph(libraryNode(), websiteNode())}
      />
      <div className="w-full max-w-5xl flex flex-col items-center justify-center text-center pb-10 lg:pb-14 space-y-6 lg:space-y-8 text-white font-[GothamLight]">
        <HomeTitle />
        <hr className="border-white w-full" />
        <HomeQuote />
        <div className="w-full space-y-3 justify-center items-center px-5 md:px-20 lg:px-30 xl:px-40">
          <HomeSearchDropdown
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            onClear={clearSearch}
            results={results}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onSelect={handleSelect}
            observerTarget={observerTarget}
            resultsContainerRef={resultsContainerRef}
          />
          <Text className="text-xs md:text-sm text-gray-300">
            Can't find what you're looking for? Try broader terms.
          </Text>
        </div>
      </div>
    </div>
  );
}

export default Page;
