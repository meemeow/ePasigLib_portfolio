import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { formatCount } from "@/features/lms/home/api/home-helpers";
import type { StatTile } from "@/features/lms/home/types/home-types";

const SCALE = {
  figure: {
    normal: "text-xl min-[401px]:text-2xl lg:text-3xl",
    squeezed:
      "text-xl min-[401px]:text-2xl min-[640px]:text-xl min-[1024px]:text-2xl min-[1280px]:text-3xl min-[1536px]:text-2xl min-[1801px]:text-3xl",
  },
  label: {
    normal: "text-[11px] min-[401px]:text-xs lg:text-sm",
    squeezed:
      "text-[11px] min-[401px]:text-xs min-[640px]:text-[11px] min-[1024px]:text-xs min-[1280px]:text-sm min-[1536px]:text-[11px] min-[1801px]:text-sm",
  },
  link: {
    normal: "text-[11px] min-[401px]:text-xs lg:text-sm",
    squeezed:
      "text-[11px] min-[401px]:text-xs min-[640px]:text-[11px] min-[1024px]:text-xs min-[1280px]:text-sm min-[1536px]:text-xs min-[1801px]:text-sm",
  },
  icon: {
    normal: "size-7 min-[401px]:size-8 lg:size-9",
    squeezed:
      "size-7 min-[401px]:size-8 min-[640px]:size-7 min-[1024px]:size-8 min-[1280px]:size-9 min-[1536px]:size-7 min-[1801px]:size-9",
  },
  tile: {
    normal: "sm:px-2 lg:px-5",
    squeezed:
      "min-[640px]:px-2 min-[1024px]:px-3 min-[1280px]:px-5 min-[1536px]:px-3 min-[1801px]:px-5",
  },
} as const;

interface StatCardsRowProps {
  tiles: StatTile[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  railOpen: boolean;
}

export default function StatCardsRow({
  tiles,
  loading,
  error,
  onRetry,
  railOpen,
}: StatCardsRowProps) {
  const scale = (part: keyof typeof SCALE) =>
    railOpen ? SCALE[part].squeezed : SCALE[part].normal;

  return (
    <section className="flex flex-1 flex-col rounded-2xl border border-blue-100 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5 xl:px-7">
      <div className="flex items-center justify-between gap-2">
        <Text className="text-base font-[gothamMedium] text-[#011b38] min-[401px]:text-lg">
          At a Glance
        </Text>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Text className="text-sm text-gray-600">
            Could not load today's figures.
          </Text>
          <Button
            variant="link"
            onClick={onRetry}
            className="h-auto p-0 font-normal"
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-3 mb-2 grid flex-1 2xl:mt-2 2xl:mb-1 grid-cols-1 content-center items-start gap-x-4 gap-y-4 divide-blue-100 sm:grid-cols-2 md:grid-cols-4 md:gap-x-2 md:gap-y-0 md:divide-x lg:gap-x-4">
          {tiles.map((tile) => {
            const value = formatCount(tile.value);
            return (
              <div
                key={tile.id}
                className={`flex flex-col justify-center px-2.5 md:first:pl-0 md:last:pr-0 ${scale("tile")}`}
              >
                <div className="flex items-center justify-between gap-2 sm:max-w-[15rem] md:max-w-none md:items-start">
                  <div className="min-w-0">
                    {loading && value === null ? (
                      <Skeleton className="h-9 w-24" />
                    ) : (
                      <Text
                        className={`font-[gothamBlack] leading-none text-[#011b38] ${scale("figure")}`}
                      >
                        {value ?? "—"}
                      </Text>
                    )}
                    <Text
                      className={`mt-1.5 font-[gothamMedium] leading-tight text-gray-500 lg:whitespace-nowrap ${scale("label")}`}
                    >
                      {tile.label}
                    </Text>
                  </div>
                  <span
                    className={`mr-1.5 flex shrink-0 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1] ${scale("icon")}`}
                  >
                    {tile.icon}
                  </span>
                </div>

                <Link
                  to={tile.to}
                  className={`mt-1 2xl:mt-2 inline-flex w-fit items-center gap-1 text-[#128CF1] lg:whitespace-nowrap hover:underline ${scale("link")}`}
                >
                  {tile.linkLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
