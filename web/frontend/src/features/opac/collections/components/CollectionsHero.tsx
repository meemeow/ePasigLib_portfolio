import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { CollectionTabCards } from "@/features/opac/collections/components/CollectionsSidebar";
import type { CollectionTabId } from "@/features/opac/collections/types/collections-types";
import { asset } from "@/lib/asset";

interface CollectionsHeroProps {
	tabs: CollectionTabId[];
	active: string;
	onSelect: (value: string) => void;
	canSuggest: boolean;
	quotaExhausted: boolean;
	onSuggest: () => void;
	toolbar: ReactNode;
}

export function CollectionsHero({
	tabs,
	active,
	onSelect,
	canSuggest,
	quotaExhausted,
	onSuggest,
	toolbar,
}: CollectionsHeroProps) {
	const suggestReason = !canSuggest
		? "Sign in as a patron to suggest a book."
		: quotaExhausted
			? "You have used this week's suggestions — open to see which."
			: undefined;

	return (
		<div className="relative -mx-6 -mt-5 overflow-hidden border-t border-white/15 bg-[#002248] sm:-mx-8 sm:-mt-6 lg:hidden">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 flex select-none opacity-20"
			>
				<img
					src={asset("/assets/images/opac_about_vector3.png")}
					alt=""
					draggable={false}
					className="w-full shrink-0 object-contain object-bottom sm:w-1/2"
				/>
				<img
					src={asset("/assets/images/opac_about_vector3.png")}
					alt=""
					draggable={false}
					className="hidden w-1/2 shrink-0 object-contain object-bottom sm:block"
				/>
			</div>

			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#128CF1]/25 via-transparent to-transparent"
			/>

			<div className="relative flex flex-col gap-4 px-6 pb-5 pt-9 sm:px-8 sm:pb-6 sm:pt-9">
				<div className="text-center">
					<Text
						as="h2"
						className="text-2xl font-[gothamBlack] leading-tight text-white xs:text-2xl sm:text-3xl"
					>
						Discover. Learn. Grow.
					</Text>
					<Text className="mt-1.5 text-xs text-white/65 xs:text-sm">
						Explore our wide collection of books.
					</Text>
				</div>

				{toolbar}

				<CollectionTabCards tabs={tabs} active={active} onSelect={onSelect} />

				<Button
					variant={null}
					size={null}
					onClick={onSuggest}
					disabled={!canSuggest}
					title={suggestReason}
					className="mx-auto gap-2 rounded-full border border-white/20 bg-white/[0.07] px-4 py-2 text-xs font-normal text-white/80 transition hover:bg-white/[0.14] hover:text-white hover:no-underline disabled:opacity-50 disabled:hover:bg-white/[0.07]"
				>
					<BookOpen className="size-3.5" />
					{canSuggest && quotaExhausted
						? "No suggestions left this week"
						: "Can't find it? Suggest a book"}
				</Button>
			</div>
		</div>
	);
}
