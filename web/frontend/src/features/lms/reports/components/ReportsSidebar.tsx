import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookCopy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  LayoutDashboard,
  MessagesSquare,
  Repeat,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import {
  REPORT_GROUPS,
  REPORT_SECTIONS,
} from "@/features/lms/reports/api/report-sections";

const ICONS: Record<string, ReactNode> = {
  overview: <LayoutDashboard className="size-4" />,
  circulation: <Repeat className="size-4" />,
  collection: <BookCopy className="size-4" />,
  patrons: <Users className="size-4" />,
  "reference-desk": <MessagesSquare className="size-4" />,
  visits: <DoorOpen className="size-4" />,
};

interface NavItem {
  slug: string;
  label: string;
  icon: ReactNode;
}

interface RailTileProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  tone: "rail" | "menu";
  onActivate: (slug: string) => void;
}

function RailTile({
  item,
  active,
  collapsed,
  tone,
  onActivate,
}: RailTileProps) {
  if (tone === "menu") {
    return (
      <Button
        type="button"
        variant={null}
        size={null}
        onClick={() => onActivate(item.slug)}
        className={`flex h-auto w-full items-center gap-3 rounded-lg px-3 py-3 text-left font-[inherit] font-normal transition-colors focus-visible:ring-2 focus-visible:ring-[#128CF1]/40 ${
          active ? "bg-[#EAF4FE]" : "hover:bg-[#EAF4FE]"
        }`}
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            active ? "bg-[#128CF1] text-white" : "bg-[#EAF4FE] text-[#128CF1]"
          }`}
        >
          {item.icon}
        </span>
        <span className="min-w-0 flex-1 text-sm font-[gothamMedium] text-[#011b38]">
          {item.label}
        </span>
        <ChevronRight className="size-4 shrink-0 text-gray-400" />
      </Button>
    );
  }

  const collapsedTile = collapsed
    ? " lg:w-auto lg:self-center lg:overflow-visible lg:border-transparent lg:bg-transparent lg:p-0 lg:hover:border-transparent lg:hover:bg-transparent"
    : "";

  const button = (
    <Button
      type="button"
      variant={null}
      size={null}
      onClick={() => onActivate(item.slug)}
      className={`group relative flex h-auto w-full items-center gap-3 overflow-visible whitespace-normal rounded-lg border px-3 py-3.5 text-left font-normal transition-colors focus-visible:ring-2 focus-visible:ring-white/40${collapsedTile} ${
        active
          ? "border-[#128CF1] bg-[#128CF1] text-white"
          : "border-white/10 bg-white/[0.07] text-white hover:border-white/20 hover:bg-white/15"
      }`}
    >
      <span
        className={`relative flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors${
          collapsed ? " lg:size-10 lg:[&_svg]:size-6" : ""
        }${
          active
            ? " border-white/40 bg-white/15" +
              (collapsed ? " lg:border-[#128CF1] lg:bg-[#128CF1]" : "")
            : " border-white/15 group-hover:border-white/30" +
              (collapsed ? " lg:group-hover:bg-white/15" : "")
        }`}
      >
        {item.icon}
      </span>

      <span
        className={`min-w-0 flex-1 text-sm font-[gothamMedium] text-white ${
          collapsed ? "lg:hidden" : ""
        }`}
      >
        {item.label}
      </span>

      <ChevronRight
        className={`size-4 shrink-0 ${active ? "text-white/70" : "text-white/40"} ${
          collapsed ? "lg:hidden" : ""
        }`}
      />
    </Button>
  );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block w-full lg:w-auto lg:self-center">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

interface ReportsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function ReportsSidebar({
  collapsed,
  onToggle,
}: ReportsSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const activeSlug = pathname.split("/")[3] || "overview";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    if (wide.matches) {
      setMenuOpen(false);
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [menuOpen]);

  const groups = REPORT_GROUPS.map((title) => ({
    title,
    items: REPORT_SECTIONS.filter((entry) => entry.group === title).map(
      (entry): NavItem => ({
        slug: entry.slug,
        label: entry.label,
        icon: ICONS[entry.slug],
      }),
    ),
  })).filter((group) => group.items.length > 0);

  const activate = (slug: string) => {
    setMenuOpen(false);
    navigate(`/lms/reports/${slug}`);
  };

  const controlClass =
    "ml-auto size-8 shrink-0 sm:size-9 lg:size-10 items-center justify-center rounded-md border border-white/15 text-white outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40";

  const toggleButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Expand Reports" : "Collapse Reports"}
      className={`hidden lg:inline-flex ${controlClass} ${
        collapsed ? "lg:ml-0" : ""
      }`}
    >
      {collapsed ? (
        <ChevronRight className="size-6 sm:size-7" />
      ) : (
        <ChevronLeft className="size-6 sm:size-7" />
      )}
    </Button>
  );

  return (
    <aside
      className={`relative flex w-full shrink-0 flex-col overflow-hidden border-t border-white/15 bg-[#002248] transition-[width] duration-200 ease-in-out ${
        collapsed ? "lg:w-[76px]" : "lg:w-[300px]"
      }`}
    >
      <img
        src="/assets/images/quick_access_vector.png"
        alt=""
        aria-hidden
        draggable={false}
        className={`pointer-events-none absolute -bottom-4 left-1/2 z-0 w-[142%] max-w-none -translate-x-1/2 select-none opacity-40 ${
          collapsed ? "hidden" : "hidden lg:block"
        }`}
      />

      <TooltipProvider delayDuration={150}>
        <div
          className={`relative z-10 flex items-center gap-2 overflow-hidden px-6 pb-3 pt-4 sm:px-8 sm:py-4 ${
            collapsed ? "lg:justify-center lg:px-0" : "lg:px-5"
          }`}
        >
          <Text
            className={`whitespace-nowrap text-lg font-[gothamBlack] uppercase tracking-[-0.005em] text-white sm:text-xl lg:text-2xl ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            Reports
          </Text>

          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open report sections"
                className={`inline-flex lg:hidden ${controlClass}`}
              >
                <ChevronDown className="size-5 sm:size-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[min(20rem,calc(100vw-2rem))] border-blue-100 bg-white p-1 shadow-lg"
            >
              {groups.map((group, index) => (
                <div
                  key={group.title}
                  className={
                    index > 0 ? "mt-1 border-t border-blue-100 pt-1" : ""
                  }
                >
                  <span className="block px-4 py-1.5 text-[10px] font-[gothamMedium] uppercase tracking-widest text-gray-400">
                    {group.title}
                  </span>
                  <div className="flex flex-col divide-y divide-blue-100">
                    {group.items.map((item) => (
                      <RailTile
                        key={item.slug}
                        item={item}
                        active={activeSlug === item.slug}
                        collapsed={false}
                        tone="menu"
                        onActivate={activate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </PopoverContent>
          </Popover>

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{toggleButton}</TooltipTrigger>
              <TooltipContent side="right">Expand Reports</TooltipContent>
            </Tooltip>
          ) : (
            toggleButton
          )}
        </div>

        <nav
          className={`relative z-10 hidden flex-col gap-4 pb-4 lg:flex ${
            collapsed ? "px-4 lg:px-3" : "px-4"
          }`}
        >
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              {!collapsed && (
                <span className="px-1 text-[10px] font-[gothamMedium] uppercase tracking-widest text-white/45">
                  {group.title}
                </span>
              )}
              {group.items.map((item) => (
                <RailTile
                  key={item.slug}
                  item={item}
                  active={activeSlug === item.slug}
                  collapsed={collapsed}
                  tone="rail"
                  onActivate={activate}
                />
              ))}
            </div>
          ))}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
