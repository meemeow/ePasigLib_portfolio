import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
import type { StaffRoles } from "@/lib/auth/auth-types";
import type { QuickAccessItem } from "@/features/lms/home/types/home-types";
import { asset } from "@/lib/asset";

interface QuickAccessRailProps {
  items: QuickAccessItem[];
  staffRoles: StaffRoles | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RailTileProps {
  item: QuickAccessItem;
  allowed: boolean;
  collapsed: boolean;
  tone: "rail" | "menu";
  onActivate: (item: QuickAccessItem) => void;
}

function RailTile({
  item,
  allowed,
  collapsed,
  tone,
  onActivate,
}: RailTileProps) {
  const barred = `You do not have the “${item.role}” permission.`;

  if (tone === "menu") {
    const row = (
      <Button
        type="button"
        variant="ghost"
        disabled={!allowed}
        onClick={() => onActivate(item)}
        className={`flex h-auto w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-[inherit] font-normal transition-colors focus-visible:ring-2 focus-visible:ring-[#128CF1]/40 ${
          allowed
            ? "hover:bg-[#EAF4FE]"
            : "cursor-not-allowed opacity-40 disabled:opacity-40"
        }`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FE] text-[#128CF1]">
          {item.icon}
        </span>
        <span className="whitespace-nowrap text-sm font-[gothamMedium] text-[#011b38]">
          {item.label}
        </span>
        <ChevronRight className="ml-auto size-4 shrink-0 text-gray-400" />
      </Button>
    );

    if (allowed) return row;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block w-full">{row}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{barred}</TooltipContent>
      </Tooltip>
    );
  }

  const collapsedTile = collapsed
    ? " lg:w-auto lg:self-center lg:border-transparent lg:bg-transparent lg:p-0 lg:hover:border-transparent lg:hover:bg-transparent"
    : "";

  const button = (
    <Button
      type="button"
      variant="ghost"
      disabled={!allowed}
      onClick={() => onActivate(item)}
      className={`group flex h-auto w-full items-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.07] px-5 py-3.5 text-left font-normal transition-colors focus-visible:ring-2 focus-visible:ring-white/40${collapsedTile} ${
        allowed
          ? "hover:border-white/20 hover:bg-white/15"
          : "cursor-not-allowed opacity-40 disabled:opacity-40"
      }`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-md border border-white/15 text-white transition-colors${
          collapsed ? " lg:size-10 lg:[&_svg]:size-6" : ""
        }${
          collapsed && allowed
            ? " lg:group-hover:border-white/40 lg:group-hover:bg-white/15"
            : ""
        }`}
      >
        {item.icon}
      </span>
      <span
        className={`whitespace-nowrap text-sm font-[gothamMedium] text-white ${
          collapsed ? "lg:hidden" : ""
        }`}
      >
        {item.label}
      </span>
      <ChevronRight
        className={`ml-auto size-4 shrink-0 text-white/40 ${
          collapsed ? "lg:hidden" : ""
        }`}
      />
    </Button>
  );

  if (allowed && !collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`block w-full${
            collapsed ? " lg:w-auto lg:self-center" : ""
          }`}
        >
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">
        {allowed ? item.label : barred}
      </TooltipContent>
    </Tooltip>
  );
}

export default function QuickAccessRail({
  items,
  staffRoles,
  open,
  onOpenChange,
}: QuickAccessRailProps) {
  const navigate = useNavigate();

  const collapsed = !open;
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

  const activate = (item: QuickAccessItem) => {
    setMenuOpen(false);
    if (item.onSelect) item.onSelect();
    else if (item.to) navigate(item.to);
  };

  const allowedFor = (item: QuickAccessItem) =>
    !item.role || Boolean(staffRoles?.[item.role]);

  const controlClass =
    "ml-auto size-8 shrink-0 sm:size-9 lg:size-10 items-center justify-center rounded-md border border-white/15 text-white outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40";

  const toggleButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => onOpenChange(!open)}
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Expand Dashboard" : "Collapse Dashboard"}
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
        collapsed ? "lg:w-[76px]" : "lg:w-[260px] xl:w-[300px]"
      }`}
    >
      <img
        src={asset("/assets/images/quick_access_vector.png")}
        alt=""
        aria-hidden
        draggable={false}
        className={`pointer-events-none absolute -bottom-4 left-1/2 z-0 w-[142%] max-w-none -translate-x-1/2 select-none opacity-40 ${
          collapsed ? "hidden" : "hidden lg:block"
        }`}
      />

      <TooltipProvider delayDuration={150}>
        <div
          className={`relative z-10 flex items-center gap-2 overflow-hidden pb-3 pt-4 sm:py-4 ${
            collapsed ? "px-4 sm:px-5 lg:justify-center lg:px-0" : "px-4 sm:px-5"
          }`}
        >
          <span
            className={`whitespace-nowrap text-lg font-[gothamBlack] sm:text-xl lg:text-2xl uppercase tracking-[-0.005em] text-white ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            Dashboard
          </span>

          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open dashboard actions"
                className={`inline-flex lg:hidden ${controlClass}`}
              >
                <ChevronDown className="size-5 sm:size-6 lg:size-7" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[min(20rem,calc(100vw-2rem))] border-blue-100 bg-white p-1 shadow-lg"
            >
              <div className="flex flex-col divide-y divide-blue-100">
                {items.map((item) => (
                  <RailTile
                    key={item.id}
                    item={item}
                    allowed={allowedFor(item)}
                    collapsed={false}
                    tone="menu"
                    onActivate={activate}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{toggleButton}</TooltipTrigger>
              <TooltipContent side="right">Expand Dashboard</TooltipContent>
            </Tooltip>
          ) : (
            toggleButton
          )}
        </div>

        <nav
          className={`relative z-10 hidden flex-col gap-2 pb-4 lg:flex ${
            collapsed ? "px-4 lg:px-3" : "px-4"
          }`}
        >
          {!collapsed && (
            <span className="px-1 text-[10px] font-[gothamMedium] uppercase tracking-widest text-white/45">
              Quick Actions
            </span>
          )}

          {items.map((item) => (
            <RailTile
              key={item.id}
              item={item}
              allowed={allowedFor(item)}
              collapsed={collapsed}
              tone="rail"
              onActivate={activate}
            />
          ))}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
