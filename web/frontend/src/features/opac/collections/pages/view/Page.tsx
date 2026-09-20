import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  Bookmark,
  Library,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import Modal from "@/components/ui/ValidationModal";
import { useAuth } from "@/lib/auth/use-auth";
import { clearCachedFetch } from "@/lib/fetching-data-cache";
import ViewCollectionMarc from "@/features/lms/collections/pages/view-collection/components/ViewCollectionMarc";
import type { CollectionData } from "@/features/lms/collections/pages/view-collection/types/collections-view-types";
import {
  fetchBookById,
  fetchBookRecord,
  fetchRelated,
} from "@/features/opac/collections/pages/view/api/collection-view";
import CartOverlay from "@/features/opac/collections/components/CartOverlay";
import {
  cartReturnState,
  useCartOverlay,
  type CartReturnState,
} from "@/features/opac/collections/components/use-cart-return";
import { CartFab } from "@/features/opac/collections/components/CartFab";
import { useCart } from "@/features/opac/collections/components/use-cart";
import CollectionViewDetails from "@/features/opac/collections/pages/view/components/CollectionViewDetails";
import CollectionViewPanel from "@/features/opac/collections/pages/view/components/CollectionViewPanel";
import CollectionViewRelated from "@/features/opac/collections/pages/view/components/CollectionViewRelated";
import CollectionViewSidebar, {
  type OpacViewTab,
} from "@/features/opac/collections/pages/view/components/CollectionViewSidebar";
import type {
  CollectionDetail,
  RelatedCollectionsResponse,
} from "@/features/opac/collections/types/collection-view-types";
import { Seo } from "@/lib/seo/Seo";
import {
  bookNode,
  breadcrumbNode,
  graph,
} from "@/lib/seo/structured-data";

type RelatedBook = RelatedCollectionsResponse["relatedByAuthor"][number];

export default function CollectionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const returnToOrigin = (): void => {
    const cartFrom = cartReturnState(location.state)?.cartFrom;
    if (cartFrom) {
      navigate(cartFrom, { state: { openCart: true } satisfies CartReturnState });
      return;
    }
    navigate("/opac/collections");
  };
  const { user, userType } = useAuth();
  const { cart, saved, overview, addToCart, removeFromCart, saveBook, unsaveBook } =
    useCart();

  const [activeTab, setActiveTab] = useState<OpacViewTab>("details");
  const [book, setBook] = useState<CollectionDetail | null>(null);
  const [record, setRecord] = useState<CollectionData | null>(null);
  const [related, setRelated] = useState<{
    byAuthor: RelatedBook[];
    byPublisher: RelatedBook[];
  }>({ byAuthor: [], byPublisher: [] });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marcBlock, setMarcBlock] = useState("0xx");
  const [cartModalOpen, setCartModalOpen] = useCartOverlay();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPatron = Boolean(user) && userType === "Patron";
  const inCart = Boolean(book && cart[book.id]);
  const bookmarked = Boolean(book && saved[book.id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [detail, raw] = await Promise.all([
          fetchBookById(id),
          fetchBookRecord(id),
        ]);
        if (cancelled) return;
        setBook(detail);
        setRecord(raw);

        if (detail) {
          const rel = await fetchRelated(
            detail.author || "",
            detail.publisher || "",
            detail.id,
          );
          if (cancelled) return;
          setRelated({
            byAuthor: rel?.relatedByAuthor || [],
            byPublisher: rel?.relatedByPublisher || [],
          });
        }
      } catch (err) {
        console.error("Failed to load book:", err);
        if (!cancelled) setBook(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const refresh = async () => {
    if (!id || refreshing) return;
    setRefreshing(true);
    try {
      clearCachedFetch("fetchBookById");
      const [detail, raw] = await Promise.all([
        fetchBookById(id),
        fetchBookRecord(id),
      ]);
      setBook(detail);
      setRecord(raw);
    } catch (err) {
      console.error("Failed to refresh book:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const availability = (() => {
    const lendable = (book?.locations || []).filter((c) => !c.forLibraryUse);
    return {
      total: lendable.length,
      available: lendable.filter((c) => c.available).length,
      incoming: lendable.filter((c) => {
        const state = c.state.toLowerCase();
        return state === "pending" || state === "reserved";
      }).length,
      libraryUseOnly:
        lendable.length === 0 && (book?.locations.length || 0) > 0,
    };
  })();

  const toggleCart = async () => {
    if (!book || !isPatron) return;
    const name = book.title || "Book";

    if (inCart) {
      await removeFromCart(book.id);
      setSuccess(`${name} removed from your cart.`);
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

  const toggleBookmark = async () => {
    if (!book || !isPatron) return;
    const name = book.title || "Book";

    if (bookmarked) {
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

  const actions = (
    <>
      <Button
        variant="outline"
        onClick={refresh}
        disabled={refreshing}
        aria-label="Refresh"
        title="Refresh"
        className="h-9 w-9 p-0 sm:h-9 sm:w-auto sm:px-3"
      >
        <RefreshCcw
          className={`size-3.5 ${refreshing ? "animate-spin [animation-direction:reverse]" : ""}`}
        />
        <span className="hidden sm:inline">Refresh</span>
      </Button>

      <Button
        variant="outline"
        onClick={toggleBookmark}
        disabled={!isPatron}
        title={isPatron ? undefined : "Sign in as a patron to save books"}
        className={
          bookmarked ? "border-[#128CF1] bg-[#128CF1]/10 text-[#0e6bb8]" : ""
        }
      >
        <Bookmark className="size-4" fill={bookmarked ? "currentColor" : "none"} />
        {bookmarked ? "Saved" : "Save"}
      </Button>

      <Button
        variant="secondary"
        onClick={toggleCart}
        disabled={!isPatron}
        title={isPatron ? undefined : "Sign in as a patron to use the cart"}
        className="bg-[#128CF1] text-white hover:bg-[#0e6bb8] hover:no-underline"
      >
        <ShoppingCart className="size-4" />
        {inCart ? "In your cart" : "Add to cart"}
      </Button>
    </>
  );

  const shell = (children: React.ReactNode) => (
    <div className="overflow-auto px-8 py-2 pb-6 sm:pb-10 xl:p-10 font-[gothamLight]">
      <div className="mx-auto flex w-full flex-col gap-0 xl:gap-8 xl:flex-row">
        <CollectionViewSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onReturn={returnToOrigin}
          actions={book ? actions : undefined}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );

  if (loading && !book) {
    return shell(
      <div>
        <Skeleton className="h-[70vh] w-full rounded-xl" />
      </div>,
    );
  }

  if (!book) {
    return shell(
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        {/* A record that will not load must not stay in the index under the
            title it used to have. */}
        <Seo title="Book not found" noindex />
        <Text className="text-gray-500">This book could not be loaded.</Text>
        <Button variant="outline" onClick={returnToOrigin}>
          ← Return
        </Button>
      </div>,
    );
  }

  const relatedCount = related.byAuthor.length + related.byPublisher.length;

  /**
   * The catalogue record is the whole reason this page can rank, so the
   * description is built from the real bibliographic fields rather than a
   * generic blurb: a searcher looking for "<title> <author> Pasig" should see
   * their own words back.
   */
  const seoDescription =
    book.description ||
    [
      book.title,
      book.author && `by ${book.author}`,
      book.publisher,
      book.publicationYear,
    ]
      .filter(Boolean)
      .join(", ") +
      " — available at the Pasig Knowledge Center.";

  const seoTitle = book.author ? `${book.title} — ${book.author}` : book.title;

  return (
    <>
      <Seo
        title={seoTitle}
        description={seoDescription}
        canonical={`/opac/collections/${book.id}`}
        image={book.cover || undefined}
        type="book"
        structuredData={graph(
          bookNode({
            id: book.id,
            title: book.title,
            author: book.author,
            description: book.description,
            cover: book.cover,
            publisher: book.publisher,
            publicationYear: book.publicationYear,
            isbn10: book.isbn10,
            isbn13: book.isbn13,
            edition: book.edition,
            pageCount: book.pageCount,
            materialType: book.materialType,
            subjects: book.subjects,
            available: availability.available > 0,
            lendableCopies: availability.total,
          }),
          breadcrumbNode([
            { name: "Home", path: "/opac/home" },
            { name: "Catalogue", path: "/opac/collections" },
            { name: book.title, path: `/opac/collections/${book.id}` },
          ]),
        )}
      />
      {shell(
        <>
          <div className="hidden w-full flex-col py-3 md:w-auto xl:flex">
            <div className="flex-1" />
            <div className="flex items-end justify-end gap-2 align-bottom">
              {actions}
            </div>
          </div>

          <div>
            {activeTab === "details" && (
              <CollectionViewPanel
                icon={BookOpen}
                title="Book Details"
                caption="Everything the catalogue records about this title."
                aside={
                  book.callNumber ? (
                    <Text className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                      {book.callNumber}
                    </Text>
                  ) : undefined
                }
              >
                <CollectionViewDetails book={book} availability={availability} />
              </CollectionViewPanel>
            )}

            {activeTab === "related" && (
              <CollectionViewPanel
                icon={Library}
                title="Related Books"
                caption="Other titles by the same author, and from the same publisher."
                aside={
                  <Text className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                    {relatedCount} {relatedCount === 1 ? "title" : "titles"}
                  </Text>
                }
              >
                <CollectionViewRelated
                  byAuthor={related.byAuthor}
                  byPublisher={related.byPublisher}
                  author={book.author}
                  publisher={book.publisher}
                />
              </CollectionViewPanel>
            )}

            {activeTab === "marc" && record && (
              <ViewCollectionMarc
                collection={record}
                activeBlock={marcBlock}
                onBlockChange={setMarcBlock}
              />
            )}
          </div>
        </>,
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
      {error && <Modal message={error} onClose={() => setError(null)} type="error" />}
      {success && (
        <Modal message={success} onClose={() => setSuccess(null)} type="success" />
      )}
    </>
  );
}
