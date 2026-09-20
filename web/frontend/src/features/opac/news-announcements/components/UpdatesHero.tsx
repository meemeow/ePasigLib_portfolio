import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

interface UpdatesHeroProps {
  announcementCount: number;
  newsCount: number;
  onSearch: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function UpdatesHero({
  announcementCount,
  newsCount,
  onSearch,
  onRefresh,
  refreshing,
}: UpdatesHeroProps) {
  const count = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;

  return (
    <div className="relative overflow-hidden border-t border-white/15 bg-[#002248]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 flex select-none opacity-20"
      >
        <img
          src="/assets/images/opac_about_vector3.png"
          alt=""
          draggable={false}
          className="w-full shrink-0 object-contain object-bottom sm:w-1/2 lg:w-1/3"
        />
        <img
          src="/assets/images/opac_about_vector3.png"
          alt=""
          draggable={false}
          className="hidden w-1/2 shrink-0 object-contain object-bottom sm:block lg:w-1/3"
        />
        <img
          src="/assets/images/opac_about_vector3.png"
          alt=""
          draggable={false}
          className="hidden w-1/3 shrink-0 object-contain object-bottom lg:block"
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#128CF1]/25 via-transparent to-transparent"
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-5 py-14 text-center sm:px-8 sm:py-16">
        <div className="flex items-center gap-3">
          <Text
            as="h1"
            className="text-2xl font-[gothamBlack] leading-tight text-white sm:text-3xl"
          >
            Updates
          </Text>

          <Button
            variant={null}
            size={null}
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh updates"
            title="Refresh updates"
            className="rounded-full border border-white/20 bg-white/[0.07] p-2 text-white/70 transition hover:bg-white/[0.14] hover:text-white hover:no-underline disabled:opacity-60"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <Text className="max-w-xl text-xs text-white/65 sm:text-sm">
          Notices from the desk and stories from around the library.
        </Text>

        <Text className="text-[11px] text-white/45 sm:text-xs">
          {count(announcementCount, "announcement", "announcements")}
          <span className="px-1.5 text-white/25">•</span>
          {count(newsCount, "story", "stories")}
        </Text>

        <Button
          variant={null}
          size={null}
          onClick={onSearch}
          className="mt-1 gap-2 rounded-full border border-white/20 bg-white/[0.07] px-4 py-2 text-xs font-normal text-white/80 transition hover:bg-white/[0.14] hover:text-white hover:no-underline"
        >
          <Search className="size-3.5" />
          Search updates
        </Button>
      </div>
    </div>
  );
}

export default UpdatesHero;
