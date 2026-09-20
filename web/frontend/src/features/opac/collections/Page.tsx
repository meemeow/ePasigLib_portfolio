import { useEffect, useState } from "react";
import Modal from "@/components/ui/ValidationModal";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/use-auth";
import {
	cartStatusOf,
	EMPTY_QUOTA,
	fetchSuggestionQuota,
	type SuggestionQuota,
} from "@/features/opac/collections/api/collections";
import { CART_STATUS_MESSAGE } from "@/features/opac/collections/components/cart-utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCollectionsBrowser } from "@/features/opac/collections/api/collections-logic";
import {
	CollectionDetailPanel,
	CollectionDetailPlaceholder,
} from "@/features/opac/collections/components/CollectionDetailPanel";
import { CollectionsFacetBar } from "@/features/opac/collections/components/CollectionsFacetBar";
import { CollectionsHero } from "@/features/opac/collections/components/CollectionsHero";
import { CollectionsResults } from "@/features/opac/collections/components/CollectionsResults";
import { CollectionsSidebar } from "@/features/opac/collections/components/CollectionsSidebar";
import { CollectionsToolbar } from "@/features/opac/collections/components/CollectionsToolbar";
import { CollectionSheet } from "@/features/opac/collections/components/CollectionSheet";
import { CartFab } from "@/features/opac/collections/components/CartFab";
import CartOverlay from "@/features/opac/collections/components/CartOverlay";
import { useCartOverlay } from "@/features/opac/collections/components/use-cart-return";
import RequestCollectionModal from "@/features/opac/collections/components/RequestCollectionModal";
import { useCart } from "@/features/opac/collections/components/use-cart";
import type { CollectionSummary } from "@/features/opac/collections/types/collections-types";
import { Seo } from "@/lib/seo/Seo";
import { breadcrumbNode, graph, websiteNode } from "@/lib/seo/structured-data";
import { asset } from "@/lib/asset";

export default function OPACCollections() {
	const browser = useCollectionsBrowser();
	const {
		cart,
		saved,
		overview,
		addToCart,
		removeFromCart,
		saveBook,
		unsaveBook,
		loading: cartBusy,
	} = useCart();
	const { user, userType } = useAuth();

	const [cartModalOpen, setCartModalOpen] = useCartOverlay();
	const [showRequestModal, setShowRequestModal] = useState(false);
	const [quota, setQuota] = useState<SuggestionQuota>(EMPTY_QUOTA);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const isPatron = Boolean(user) && userType === "Patron";

	useEffect(() => {
		if (!isPatron) {
			setQuota(EMPTY_QUOTA);
			return;
		}
		fetchSuggestionQuota()
			.then(setQuota)
			.catch((err) => console.error("Failed to read suggestion quota:", err));
	}, [isPatron]);

	const toggleCart = async (book: CollectionSummary) => {
		if (!isPatron) return;
		const name = book.title || "Book";

		if (cart[book.id]) {
			await removeFromCart(book.id);
			setSuccess(`${name} removed from your cart.`);
			return;
		}

		const status = cartStatusOf(book);
		if (status !== "ok") {
			setError(CART_STATUS_MESSAGE[status]);
			return;
		}

		const result = await addToCart({
			id: book.id,
			CollectionTitle: book.title,
			MainAuthor: book.author,
			CollectionImage: book.cover,
		});
		if (result.success) setSuccess(`${name} added to your cart.`);
		else setError(result.error || "Failed to add to cart.");
	};

	const toggleBookmark = async (book: CollectionSummary) => {
		if (!isPatron) return;
		const name = book.title || "Book";

		if (saved[book.id]) {
			await unsaveBook(book.id);
			setSuccess(`${name} removed from your saved books.`);
			return;
		}

		const result = await saveBook({
			id: book.id,
			CollectionTitle: book.title,
			MainAuthor: book.author,
			CollectionImage: book.cover,
		});
		if (result.success) setSuccess(`${name} saved for later.`);
		else setError(result.error || "Failed to save book.");
	};

	const cartReason = isPatron
		? undefined
		: "Sign in as a patron to use the cart";
	const bookmarkReason = isPatron
		? undefined
		: "Sign in as a patron to save books";

	const railProps = {
		tabs: browser.tabs,
		active: browser.collection,
		onSelect: browser.goToCollection,
		canSuggest: isPatron,
		quotaExhausted: quota.remaining <= 0,
		onSuggest: () => setShowRequestModal(true),
	};

	const [railCollapsed, setRailCollapsed] = useState(false);

	const wide = useMediaQuery("(min-width: 1024px)");

	const searchTerm = browser.search.trim();

	const toolbar = (tone?: "onNavy") => (
		<CollectionsToolbar
			tone={tone}
			value={browser.searchInput}
			onChange={browser.setSearchInput}
			onClear={browser.clearSearch}
			searching={browser.searching}
			pendingFilters={browser.pendingFilters}
			onPendingFiltersChange={browser.setPendingFilters}
			filterOpen={browser.filterOpen}
			onFilterOpenChange={browser.openFilters}
			onApplyFilters={browser.applyFilters}
			onResetFilters={browser.resetFilters}
			activeFilterCount={browser.activeFilterCount}
			pendingSort={browser.pendingSort}
			onPendingSortChange={browser.setPendingSort}
			sortOpen={browser.sortOpen}
			onSortOpenChange={browser.openSort}
			onApplySort={browser.applySort}
			onResetSort={browser.resetSort}
			activeSortCount={browser.activeSortCount}
		/>
	);

	const renderPanel = (
		entrance: "side" | "fade",
		onClose: () => void = browser.clearPreview,
	) =>
		browser.preview ? (
			<CollectionDetailPanel
				key={browser.preview.id}
				entrance={entrance}
				book={browser.preview}
				inCart={Boolean(cart[browser.preview.id])}
				cartDisabled={cartBusy || !isPatron}
				cartReason={cartReason}
				onToggleCart={() => browser.preview && toggleCart(browser.preview)}
				bookmarked={Boolean(saved[browser.preview.id])}
				bookmarkDisabled={cartBusy || !isPatron}
				bookmarkReason={bookmarkReason}
				onToggleBookmark={() =>
					browser.preview && toggleBookmark(browser.preview)
				}
				onClose={onClose}
				closeable={Boolean(browser.pinnedId)}
				borrowRank={browser.borrowRank(browser.preview.id)}
			/>
		) : null;

	const panel = renderPanel("side");

	return (
		<div className="flex w-full flex-1 flex-col font-[gothamLight]">
			<Seo
				description="Browse and search every title held by the Pasig Knowledge Center — books, references and periodicals, with live availability for each copy."
				canonical="/opac/collections"
				noindex={Boolean(searchTerm)}
				structuredData={graph(
					websiteNode(),
					breadcrumbNode([
						{ name: "Home", path: "/opac/home" },
						{ name: "Catalogue", path: "/opac/collections" },
					]),
				)}
			/>

			<h1 className="sr-only">Pasig Knowledge Center library catalogue</h1>

			<div className="flex w-full flex-1 items-stretch">
				<div
					className={cn(
						"relative hidden shrink-0 flex-col border-t border-white/15 bg-[#002248] transition-[width] duration-200 ease-in-out lg:flex",
						railCollapsed
							? "lg:w-[76px]"
							: "lg:w-[236px] xl:w-[264px] 2xl:w-[284px] 3xl:w-[300px]",
					)}
				>
					<div className="flex-1">
						<div
							className={cn(
								"sticky top-20 py-5 xl:py-6",
								railCollapsed ? "px-2" : "px-3 xl:px-4 2xl:px-5",
							)}
						>
							<CollectionsSidebar
								{...railProps}
								collapsed={railCollapsed}
								onToggle={() => setRailCollapsed((current) => !current)}
							/>
						</div>
					</div>

					<div
						className={cn(
							"shrink-0 justify-center overflow-hidden",
							railCollapsed ? "hidden" : "flex",
						)}
					>
						<img
							src={asset("/assets/images/quick_access_vector.png")}
							alt=""
							aria-hidden
							draggable={false}
							className="pointer-events-none -mb-4 w-[142%] max-w-none select-none opacity-40"
						/>
					</div>
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-3 px-6 pb-6 pt-5 xs:gap-4 sm:px-8 sm:pb-8 sm:pt-6 lg:px-6 2xl:px-8 3xl:px-10 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[1400px]">
					<div className="lg:hidden">
						<CollectionsHero
							{...railProps}
							toolbar={wide ? null : toolbar("onNavy")}
						/>
					</div>

					{wide && toolbar()}

					<CollectionsResults
						loading={browser.loading}
						books={browser.pageBooks}
						view={browser.view}
						heading={browser.heading}
						controls={
							<CollectionsFacetBar
								filters={browser.filters}
								onFacetChange={browser.setFacet}
								facets={browser.facets}
								view={browser.view}
								onViewChange={browser.setView}
							/>
						}
						totalCount={browser.totalCount}
						startIndex={browser.startIndex}
						currentPage={browser.currentPage}
						totalPages={browser.totalPages}
						onPageChange={browser.setPage}
						perPage={browser.perPage}
						perPageOptions={browser.perPageOptions}
						onPerPageChange={browser.changePerPage}
						pinnedId={browser.pinnedId}
						onPin={browser.pin}
						onPreview={browser.hover}
						isNew={browser.isNew}
						isInCart={(id) => Boolean(cart[id])}
						cartDisabled={cartBusy || !isPatron}
						cartReason={cartReason}
						onToggleCart={toggleCart}
						isBookmarked={(id) => Boolean(saved[id])}
						bookmarkDisabled={cartBusy || !isPatron}
						bookmarkReason={bookmarkReason}
						onToggleBookmark={toggleBookmark}
						searchTerm={browser.search.trim()}
					/>
				</div>

				<div className="hidden shrink-0 border-l border-gray-200 bg-white xl:block xl:w-[19rem] 2xl:w-[20rem] 3xl:w-[21rem]">
					<div className="sticky top-20 flex max-h-[calc(100vh-5rem)] flex-col overflow-y-auto px-5 py-6 2xl:px-6">
						{panel || <CollectionDetailPlaceholder />}
					</div>
				</div>
			</div>

			{browser.preview && browser.pinnedId && (
				<div className="xl:hidden">
					<CollectionSheet onClose={browser.clearPreview}>
						{(requestClose) => renderPanel("fade", requestClose)}
					</CollectionSheet>
				</div>
			)}

			{isPatron && (
				<CartFab
					counts={{
						saved: Object.keys(saved).length,
						cart: Object.keys(cart).length,
						books:
							overview.holds.length +
							overview.requests.length +
							overview.loans.length,
					}}
					onOpen={() => setCartModalOpen(true)}
				/>
			)}

			<CartOverlay open={cartModalOpen} onClose={() => setCartModalOpen(false)} />
			<RequestCollectionModal
				isOpen={showRequestModal}
				onClose={() => setShowRequestModal(false)}
				onRequestSubmitted={setQuota}
			/>
			{error && (
				<Modal message={error} onClose={() => setError(null)} type="error" />
			)}
			{success && (
				<Modal message={success} onClose={() => setSuccess(null)} type="success" />
			)}
		</div>
	);
}
