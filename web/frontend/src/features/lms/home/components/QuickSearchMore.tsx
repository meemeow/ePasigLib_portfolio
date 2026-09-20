import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Text } from "@/components/ui/Text";

interface QuickSearchMoreProps {
  hasMore: boolean;
  loadingMore: boolean;
  loaded: number;
  total: number;
  onLoadMore: () => void;
}

export default function QuickSearchMore({
  hasMore,
  loadingMore,
  loaded,
  total,
  onLoadMore,
}: QuickSearchMoreProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div className="pt-3">
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}

      {loadingMore ? (
        <div className="flex items-center justify-center gap-2 py-2 text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          <Text className="text-xs">Loading more...</Text>
        </div>
      ) : (
        total > loaded && (
          <Text className="py-2 text-center text-xs text-gray-500">
            Showing {loaded} of {total}
          </Text>
        )
      )}
    </div>
  );
}
