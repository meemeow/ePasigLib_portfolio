import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
	Book,
	BookOpen,
	ChevronLeft,
	ChevronRight,
	Flag,
	GraduationCap,
	Landmark,
	LayoutGrid,
	Library,
	Smile,
	Star,
	type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import {
	ALL_COLLECTIONS,
	FEATURED,
} from "@/features/opac/collections/api/collections-logic";
import type { CollectionTabId } from "@/features/opac/collections/types/collections-types";

const ICON_RULES: Array<[RegExp, LucideIcon]> = [
	[/juvenile|child|kid|young/i, Smile],
	[/reference/i, BookOpen],
	[/filipiniana|filipino/i, Flag],
	[/pasig|local|heritage/i, Landmark],
	[/fiction|novel|literature/i, Book],
	[/text ?book|academic|curriculum/i, GraduationCap],
	[/general|main|circulating/i, Library],
];

function iconFor(tab: CollectionTabId): LucideIcon {
	if (tab.value === ALL_COLLECTIONS) return LayoutGrid;
	if (tab.value === FEATURED) return Star;
	for (const [pattern, Icon] of ICON_RULES) {
		if (pattern.test(tab.label)) return Icon;
	}
	return Book;
}

interface CollectionsSidebarProps {
	tabs: CollectionTabId[];
	active: string;
	onSelect: (value: string) => void;
	canSuggest: boolean;
	quotaExhausted: boolean;
	onSuggest: () => void;
	collapsed: boolean;
	onToggle: () => void;
}

function suggestHint(
	canSuggest: boolean,
	quotaExhausted: boolean,
): string | undefined {
	if (!canSuggest) return "Sign in as a patron to suggest a book.";
	if (quotaExhausted)
		return "You have used this week's suggestions — open to see which.";
	return undefined;
}

export function CollectionsSidebar({
	tabs,
	active,
	onSelect,
	canSuggest,
	quotaExhausted,
	onSuggest,
	collapsed,
	onToggle,
}: CollectionsSidebarProps) {
	const navRef = useRef<HTMLElement | null>(null);
	const rowRefs = useRef(new Map<string, HTMLButtonElement>());

	const [marker, setMarker] = useState<{ top: number; height: number } | null>(
		null,
	);
	const [slide, setSlide] = useState(false);

	useLayoutEffect(() => {
		const row = rowRefs.current.get(active);
		if (!row) {
			setMarker(null);
			return;
		}
		const measure = () =>
			setMarker({ top: row.offsetTop, height: row.offsetHeight });
		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(row);
		if (navRef.current) observer.observe(navRef.current);
		return () => observer.disconnect();
	}, [active, tabs]);

	useEffect(() => {
		if (!marker || slide) return;
		const frame = requestAnimationFrame(() => setSlide(true));
		return () => cancelAnimationFrame(frame);
	}, [marker, slide]);

	const markerStyle = marker
		? { transform: `translateY(${marker.top}px)`, height: marker.height }
		: undefined;
	const markerMotion = cn(
		slide &&
			"transition-[transform,height] duration-300 ease-out motion-reduce:transition-none",
	);

	const colorMotion =
		"transition-colors duration-300 ease-out motion-reduce:transition-none";

	const toggleButton = (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onClick={onToggle}
			aria-expanded={!collapsed}
			aria-label={collapsed ? "Expand collections" : "Collapse collections"}
			className="size-9 shrink-0 items-center justify-center rounded-md border border-white/15 text-white outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
		>
			{collapsed ? (
				<ChevronRight className="size-5" />
			) : (
				<ChevronLeft className="size-5" />
			)}
		</Button>
	);

	return (
		<TooltipProvider delayDuration={150}>
			<aside className="flex w-full flex-col">
				<div
					className={cn(
						"flex items-center gap-2 pb-4",
						collapsed ? "justify-center px-0" : "px-2",
					)}
				>
					<Text
						as="h2"
						className={cn(
							"ml-1 min-w-0 flex-1 whitespace-nowrap text-lg font-[gothamBlack] tracking-[-0.005em] text-white sm:text-xl lg:text-2xl",
							collapsed && "hidden",
						)}
					>
						COLLECTIONS
					</Text>

					{collapsed ? (
						<Tooltip>
							<TooltipTrigger asChild>{toggleButton}</TooltipTrigger>
							<TooltipContent side="right">Expand collections</TooltipContent>
						</Tooltip>
					) : (
						toggleButton
					)}
				</div>

				<nav
					ref={navRef}
					className="relative flex max-h-[55vh] flex-col overflow-y-auto pr-0.5"
				>
					{marker && (
						<>
							<span
								aria-hidden
								style={markerStyle}
								className={cn(
									"pointer-events-none absolute left-0 right-0.5 top-0 z-0 rounded-r-lg bg-white shadow-[0_2px_12px_rgba(0,0,0,0.28)]",
									markerMotion,
								)}
							/>
							<span
								aria-hidden
								style={markerStyle}
								className={cn(
									"pointer-events-none absolute left-0 top-0 z-20 w-1 bg-[#128CF1]",
									markerMotion,
								)}
							/>
						</>
					)}

					{tabs.map((tab, index) => {
						const isActive = tab.value === active;
						const Icon = iconFor(tab);

						const row = (
							<button
								key={tab.value}
								ref={(el) => {
									if (el) rowRefs.current.set(tab.value, el);
									else rowRefs.current.delete(tab.value);
								}}
								type="button"
								onClick={() => onSelect(tab.value)}
								aria-current={isActive ? "page" : undefined}
								className={cn(
									"group relative z-10 flex w-full items-center rounded-r-lg py-1.5 text-left text-sm",
									collapsed ? "justify-center px-1" : "gap-3 pl-4 pr-3",
									colorMotion,
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128CF1]/60",
									"before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:content-['']",
									index === 0 || isActive
										? "before:bg-transparent"
										: "before:bg-white/[0.07]",
									isActive
										?
											"font-[gothamMedium] text-[#002248]"
										: "text-white/75 hover:bg-white/[0.05] hover:text-white",
								)}
							>
								<span
									className={cn(
										"flex size-9 shrink-0 items-center justify-center rounded-full border",
										colorMotion,
										isActive
											? "border-transparent bg-[#128CF1] text-white"
											: "border-white/15 text-white/60 group-hover:border-white/30 group-hover:text-white/90",
									)}
								>
									<Icon
										className={cn(
											"h-[18px] w-[18px]",
											isActive && "fill-white/30",
										)}
										strokeWidth={1.75}
									/>
								</span>

								{!collapsed && (
									<>
										<span className="truncate">{tab.label}</span>

										<span
											className={cn(
												"ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums",
												colorMotion,
												isActive
													?
														"bg-[#DCEAF9] text-[#0F5FA8]"
													: "bg-white/[0.07] text-white/50 group-hover:text-white/75",
											)}
										>
											{tab.count}
										</span>
									</>
								)}
							</button>
						);

						if (!collapsed) return row;

						/* The count rides along in the tooltip because the badge is
						   the first thing the narrow rail has to drop. */
						return (
							<Tooltip key={tab.value}>
								<TooltipTrigger asChild>{row}</TooltipTrigger>
								<TooltipContent side="right">
									{tab.label} ({tab.count})
								</TooltipContent>
							</Tooltip>
						);
					})}
				</nav>

				{collapsed ? (
					<div className="mt-8 flex justify-center border-t border-white/[0.07] pt-6">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									onClick={onSuggest}
									disabled={!canSuggest}
									aria-label="Suggest a Book"
									className="size-11 rounded-full bg-[#128CF1] text-white hover:bg-[#0e6bb8]"
								>
									<BookOpen className="h-5 w-5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="right">
								{suggestHint(canSuggest, quotaExhausted) || "Suggest a Book"}
							</TooltipContent>
						</Tooltip>
					</div>
				) : (
					<div className="mt-8 border-t border-white/[0.07] pt-6 text-center">
						<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0F3A69]">
							<Library className="h-6 w-6 text-[#7FC4FF]" strokeWidth={1.75} />
						</div>
						<Text className="mt-4 text-sm font-[gothamMedium] leading-snug text-white">
							Can't find what you're looking for?
						</Text>
						<Text className="mt-2 text-xs leading-relaxed text-white/60">
							Suggest a book that you would like to see in our collection.
						</Text>
						<Button
							size="sm"
							onClick={onSuggest}
							disabled={!canSuggest}
							className="mt-4 w-full justify-center bg-[#128CF1] text-white hover:bg-[#0e6bb8] hover:no-underline"
							title={suggestHint(canSuggest, quotaExhausted)}
						>
							<BookOpen className="h-4 w-4" />
							Suggest a Book
						</Button>
						{canSuggest && quotaExhausted && (
							<Text className="mt-2 text-[11px] leading-snug text-white/60">
								No suggestions left this week — open to see what you asked for.
							</Text>
						)}
					</div>
				)}
			</aside>
		</TooltipProvider>
	);
}

function useScrollProgress<T extends HTMLElement>(ref: React.RefObject<T | null>) {
	const [progress, setProgress] = useState<{
		width: number;
		offset: number;
	} | null>(null);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;

		const measure = () => {
			const { scrollWidth, clientWidth, scrollLeft } = node;
			if (scrollWidth - clientWidth < 2) {
				setProgress(null);
				return;
			}
			const width = (clientWidth / scrollWidth) * 100;
			setProgress({
				width,
				offset: (scrollLeft / (scrollWidth - clientWidth)) * (100 - width),
			});
		};

		measure();
		node.addEventListener("scroll", measure, { passive: true });
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => {
			node.removeEventListener("scroll", measure);
			observer.disconnect();
		};
	}, [ref]);

	return progress;
}

export function CollectionTabCards({
	tabs,
	active,
	onSelect,
}: Omit<
	CollectionsSidebarProps,
	"canSuggest" | "quotaExhausted" | "onSuggest" | "collapsed" | "onToggle"
>) {
	const rowRef = useRef<HTMLDivElement | null>(null);
	const progress = useScrollProgress(rowRef);
	const mounted = useRef(false);

	useEffect(() => {
		if (!mounted.current) {
			mounted.current = true;
			return;
		}
		const row = rowRef.current;
		const card = row?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
		card?.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
			inline: "nearest",
		});
	}, [active]);

	return (
		<div className="flex flex-col gap-2.5">
			<div
				ref={rowRef}
				className={cn(
					"-mx-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-1 pt-0.5 sm:-mx-8 sm:px-8",
					"scroll-px-6 sm:scroll-px-8",
					"[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
					"[mask-image:linear-gradient(to_right,transparent_0,#000_1.5rem,#000_calc(100%_-_1.5rem),transparent_100%)]",
					"sm:[mask-image:linear-gradient(to_right,transparent_0,#000_2rem,#000_calc(100%_-_2rem),transparent_100%)]",
				)}
			>
				{tabs.map((tab) => {
					const isActive = tab.value === active;
					const Icon = iconFor(tab);
					return (
						<button
							key={tab.value}
							data-tab={tab.value}
							type="button"
							onClick={() => onSelect(tab.value)}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"flex w-[5.5rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center xs:w-24",
								"transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out",
								"motion-reduce:transition-none",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
								isActive
									?
										"-translate-y-0.5 border-white bg-white text-[#002248] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)]"
									: "border-white/15 bg-white/[0.07] text-white/75 hover:border-white/30 hover:bg-white/[0.12] hover:text-white",
							)}
						>
							<Icon
								className={cn(
									"size-5 shrink-0",
									isActive ? "text-[#128CF1]" : "text-white/70",
								)}
								strokeWidth={1.75}
							/>
							<span className="line-clamp-2 text-[11px] leading-tight">
								{tab.label}
							</span>
							<span
								className={cn(
									"text-xs font-[gothamBlack] tabular-nums",
									isActive ? "text-[#0F5FA8]" : "text-white/55",
								)}
							>
								{tab.count.toLocaleString()}
							</span>
						</button>
					);
				})}
			</div>

			{progress && (
				<div
					aria-hidden
					className="mx-auto h-1 w-24 overflow-hidden rounded-full bg-white/15"
				>
					<div
						className="h-full rounded-full bg-white/70"
						style={{
							width: `${progress.width}%`,
							marginLeft: `${progress.offset}%`,
						}}
					/>
				</div>
			)}
		</div>
	);
}
