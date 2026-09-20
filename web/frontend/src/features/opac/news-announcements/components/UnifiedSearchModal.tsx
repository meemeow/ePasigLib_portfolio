import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import {
  ChevronRight,
  Megaphone,
  Newspaper,
  Search as SearchIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Search } from "@/components/ui/Search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import { NewsCard } from "@/features/opac/news-announcements/components/NewsGrid";
import {
  ANNOUNCEMENT_KEYS,
  ANY,
  DAYS,
  FUSE_OPTIONS,
  fuzzyFilter,
  matchesDate,
  MONTHS,
  NEWS_KEYS,
  yearOptions,
} from "@/features/opac/news-announcements/api/updates-filters";
import type {
  AnnouncementItem,
  NewsItem,
  TimestampLike,
} from "@/features/opac/news-announcements/types/news-announcements-types";

type Formatter = (ts: TimestampLike | Date | undefined) => string;
type Tab = "announcements" | "news";

interface UnifiedSearchModalProps {
  open: boolean;
  onClose: () => void;
  announcements: AnnouncementItem[];
  news: NewsItem[];
  formatDate: Formatter;
  onOpenNews: (item: NewsItem) => void;
  onOpenAnnouncement: (item: AnnouncementItem) => void;
  unreadIds: string[];
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full text-sm sm:w-auto">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UnifiedSearchModal({
  open,
  onClose,
  announcements,
  news,
  formatDate,
  onOpenNews,
  onOpenAnnouncement,
  unreadIds,
}: UnifiedSearchModalProps) {
  const [tab, setTab] = useState<Tab>("announcements");
  const [term, setTerm] = useState("");
  const [month, setMonth] = useState(ANY);
  const [year, setYear] = useState(ANY);
  const [day, setDay] = useState(ANY);

  const fuseNews = useMemo(
    () => new Fuse(news, { ...FUSE_OPTIONS, keys: NEWS_KEYS }),
    [news],
  );
  const fuseAnn = useMemo(
    () => new Fuse(announcements, { ...FUSE_OPTIONS, keys: ANNOUNCEMENT_KEYS }),
    [announcements],
  );

  const years = useMemo(
    () => yearOptions(news, announcements),
    [news, announcements],
  );

  const filteredNews = useMemo(
    () =>
      fuzzyFilter(fuseNews, news, term).filter((item) =>
        matchesDate(item.createdOn, month, year, day),
      ),
    [term, fuseNews, news, month, year, day],
  );

  const filteredAnn = useMemo(
    () =>
      fuzzyFilter(fuseAnn, announcements, term).filter((item) =>
        matchesDate(item.createdOn, month, year, day),
      ),
    [term, fuseAnn, announcements, month, year, day],
  );

  const TABS: { key: Tab; label: string; icon: LucideIcon; count: number }[] = [
    {
      key: "announcements",
      label: "Announcements",
      icon: Megaphone,
      count: filteredAnn.length,
    },
    { key: "news", label: "News", icon: Newspaper, count: filteredNews.length },
  ];

  const results = tab === "news" ? filteredNews.length : filteredAnn.length;

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((entry) => entry.key === tab);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : event.key === "ArrowLeft"
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    setTab(TABS[next].key);
    document.getElementById(`updates-tab-${TABS[next].key}`)?.focus();
  };

  return (
    <ModalShell
      open={open}
      title="Search updates"
      description="Announcements and news, by word or by date."
      icon={<SearchIcon className="size-5" />}
      size="lg"
      onClose={onClose}
      footerLeft={
        <Text className="text-xs text-gray-500">
          {results} {results === 1 ? "result" : "results"}
        </Text>
      }
    >
      <div className="sticky -top-5 z-10 -mx-6 -mt-5 mb-4 bg-gray-50 px-6 pt-5 sm:-mx-8 sm:px-8">
        <div
          role="tablist"
          aria-label="Update sections"
          onKeyDown={onTabKeyDown}
          className="flex gap-1 overflow-x-auto border-b border-gray-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map(({ key, label, icon: Icon, count }) => {
            const active = tab === key;
            return (
              <Button
                key={key}
                type="button"
                role="tab"
                id={`updates-tab-${key}`}
                aria-selected={active}
                aria-controls={`updates-panel-${key}`}
                tabIndex={active ? 0 : -1}
                variant={null}
                size={null}
                onClick={() => setTab(key)}
                className={`-mb-px flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2.5 text-sm font-normal font-[gothamMedium] transition sm:px-4 ${
                  active
                    ? "border-gray-200 bg-white text-[#128CF1]"
                    : "border-transparent text-gray-500 hover:text-[#003067]"
                }`}
              >
                <Icon className="size-4" />
                {label}
                <Badge
                  variant={null}
                  className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-normal ${
                    active
                      ? "bg-[#EAF4FE] text-[#0F76CC]"
                      : "bg-gray-200/70 text-gray-600"
                  }`}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`updates-panel-${tab}`}
        aria-labelledby={`updates-tab-${tab}`}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Search
            value={term}
            onChange={setTerm}
            placeholder={tab === "news" ? "Search stories" : "Search announcements"}
            containerClassName="w-full sm:flex-1"
          />
          <div className="grid grid-cols-3 gap-2 sm:flex sm:w-auto">
            <FilterSelect value={month} onChange={setMonth} placeholder="Month" options={MONTHS} />
            <FilterSelect value={year} onChange={setYear} placeholder="Year" options={years} />
            <FilterSelect
              value={day}
              onChange={setDay}
              placeholder="Day"
              options={DAYS.map((d) => ({ value: d, label: d }))}
            />
          </div>
        </div>

        {results === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-5 py-10 text-center">
            <Text className="text-sm text-gray-500">
              Nothing matches that. Try fewer words, or clear the date.
            </Text>
          </div>
        ) : tab === "news" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredNews.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onOpen={onOpenNews}
                formatDate={formatDate}
                unseen={unreadIds.includes(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
            {filteredAnn.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenAnnouncement(item)}
                className={`flex w-full items-start px-4 py-3 text-left transition-colors ${
                  unreadIds.includes(item.id)
                    ? "bg-[#F2F8FF] hover:bg-[#E4F1FE]"
                    : "hover:bg-[#F6FAFF]"
                }`}
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1]"
                >
                  <Megaphone className="size-5" />
                </span>

                <span className="ml-3 min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Text
                      as="span"
                      className="font-[gothamMedium] text-sm text-[#011b38]"
                    >
                      {item.subject || "Untitled"}
                    </Text>
                    {unreadIds.includes(item.id) && (
                      <span className="rounded-full bg-[#EAF4FE] px-2 py-0.5 text-[10px] font-[gothamMedium] uppercase tracking-wide text-[#128CF1]">
                        New
                      </span>
                    )}
                  </span>

                  <Text as="span" className="mt-0.5 block text-xs text-gray-500">
                    {item.authorName || "Pasig City Library"}
                    <span className="px-1.5 text-gray-300">•</span>
                    {formatDate(item.createdOn)}
                  </Text>

                  <Text
                    as="span"
                    className="mt-1.5 line-clamp-2 text-sm text-gray-600"
                  >
                    {item.message}
                  </Text>
                </span>

                <ChevronRight className="ml-2 mt-2 size-4 shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

export default UnifiedSearchModal;
