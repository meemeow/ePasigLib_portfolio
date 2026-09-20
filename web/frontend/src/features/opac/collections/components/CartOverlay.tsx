import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BookOpen, CalendarCheck, CalendarClock, CheckCircle2, Clock, History, Library, Minus, Plus, RefreshCcw, RefreshCw, ShoppingCart, Bookmark, Trash2, X, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/use-auth";
import { useCart } from "./use-cart";
import type { CartReturnState } from "./use-cart-return";
import { Textarea } from "@/components/ui/Textarea";
import { CART_STATUS_LABEL, CART_STATUS_MESSAGE, MAX_PURPOSE_LENGTH, type LoanRow } from "./cart-utils";
import { AVAILABILITY_BADGE, Banner, BookLines, CARD, Cover, EmptyState, HISTORY_TITLES, ListSkeleton, Panel, ROUND_ACTION, RecordHeader, StatusNote, StatusPill, TABS, TypeBadge, formatDateLong, historyNote } from "./CartOverlayParts";


interface CartOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function CartOverlay({ open, onClose }: CartOverlayProps) {
  const {
    overview,
    cart,
    loading,
    hydrated,
    saved,
    refresh,
    addToCart,
    removeFromCart,
    unsaveBook,
    reserveBooksBatch,
    cancelReservation,
    renewLoan,
    getBookReservableCopies,
    loadMoreHistory,
    historyLoading,
  } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<string>("saved");
  const [purpose, setPurpose] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reservable, setReservable] = useState<
    Record<string, { count: number; available: number }>
  >({});

  const [refreshing, setRefreshing] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pendingUnsave, setPendingUnsave] = useState<
    (typeof savedItems)[number] | null
  >(null);

  const [confirmReserve, setConfirmReserve] = useState(false);

  const [pendingCancel, setPendingCancel] = useState<{
    requestId: string;
    busyKey: string;
    title: string;
    accession: string;
    approved: boolean;
  } | null>(null);

  const [pendingRenew, setPendingRenew] = useState<LoanRow | null>(null);

  const { policy, slotsLeft, counts, loans, holds, requests, history } =
    overview;
  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const savedItems = useMemo(() => Object.values(saved), [saved]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("saved");
    setError(null);
    setSuccess(null);
    requestedStock.current = new Set();
    setReservable({});
    void refresh();
  }, [open, refresh]);

  const requestedStock = useRef<Set<string>>(new Set());

  const [stockNonce, setStockNonce] = useState(0);

  useEffect(() => {
    if (!open) return;

    const missing = cartItems
      .map((book) => book.id)
      .filter((id) => !requestedStock.current.has(id));
    if (missing.length === 0) return;

    missing.forEach((id) => requestedStock.current.add(id));

    void (async () => {
      const entries = await Promise.all(
        missing.map(
          async (id) => [id, await getBookReservableCopies(id)] as const,
        ),
      );
      setReservable((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [open, cartItems, getBookReservableCopies, stockNonce]);

  const withBusy = async (key: string, run: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    setSuccess(null);
    try {
      await run();
    } finally {
      setBusy(null);
    }
  };

  const capFor = useCallback(
    (bookId: string, selections: Record<string, number>) => {
      const free = reservable[bookId]?.available ?? 0;
      const otherSelected = Object.entries(selections).reduce(
        (sum, [id, qty]) => (id === bookId ? sum : sum + qty),
        0,
      );
      return Math.min(free, Math.max(0, slotsLeft - otherSelected));
    },
    [reservable, slotsLeft],
  );

  const changeQuantity = (bookId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[bookId] || 0;
      const max = capFor(bookId, prev);
      return { ...prev, [bookId]: Math.min(Math.max(0, current + delta), max) };
    });
  };

  useEffect(() => {
    setQuantities((prev) => {
      const next: Record<string, number> = {};
      let budget = Math.max(0, slotsLeft);
      let changed = false;

      for (const book of cartItems) {
        const asked = prev[book.id] || 0;
        if (asked <= 0) continue;
        const stock = reservable[book.id]?.available;
        const capped =
          stock === undefined
            ? Math.min(asked, budget)
            : Math.min(asked, stock, budget);
        if (capped > 0) next[book.id] = capped;
        budget -= capped;
        if (capped !== asked) changed = true;
      }

      const before = Object.values(prev).filter((n) => n > 0).length;
      if (before !== Object.keys(next).length) changed = true;

      return changed ? next : prev;
    });
  }, [slotsLeft, reservable, cartItems]);

  const totalSelected = useMemo(
    () => Object.values(quantities).reduce((a, b) => a + b, 0),
    [quantities],
  );

  const reserveBlockedReason = useMemo(() => {
    if (!user) return "Sign in to reserve books.";
    if (profile?.City && profile.City !== "City of Pasig") {
      return "Only residents of the City of Pasig may reserve books.";
    }
    if (cartItems.length === 0) return "Your cart is empty.";
    if (slotsLeft === 0) {
      return `You already have ${counts.total} of ${overview.maxSlots} items borrowed, held or requested.`;
    }
    if (totalSelected === 0) return "Choose how many copies you want.";
    if (!purpose.trim()) return "Tell us what you need the book for.";
    return null;
  }, [
    user,
    profile?.City,
    cartItems.length,
    slotsLeft,
    counts.total,
    overview.maxSlots,
    totalSelected,
    purpose,
  ]);

  const handleReserve = () =>
    withBusy("reserve", async () => {
      const batch = cartItems
        .filter((book) => (quantities[book.id] || 0) > 0)
        .map((book) => ({ book, quantity: quantities[book.id] }));

      const result = await reserveBooksBatch(batch, purpose);
      setConfirmReserve(false);
      if (result.success) {
        setQuantities({});
        setPurpose("");
        requestedStock.current = new Set();
        setReservable({});
        setStockNonce((n) => n + 1);
        setSuccess(
          "Request submitted. A librarian will set a copy aside and let you know when it is ready.",
        );
        setActiveTab("active");
      } else {
        setError(result.error || "Reservation failed.");
        requestedStock.current = new Set();
        setReservable({});
        setStockNonce((n) => n + 1);
        void refresh({ silent: true });
      }
    });

  const handleCancel = (requestId: string, busyKey: string = requestId) =>
    withBusy(busyKey, async () => {
      const result = await cancelReservation(requestId);
      setPendingCancel(null);
      if (result.success) setSuccess("Reservation cancelled.");
      else setError(result.error || "Failed to cancel reservation.");
    });

  const handleRenew = (loan: LoanRow) =>
    withBusy(loan.BorrowID, async () => {
      const days = policy.RenewalPeriodDays;
      const result = await renewLoan(loan.BorrowID, days);
      setPendingRenew(null);
      if (result.success) {
        setSuccess(
          `"${loan.CollectionTitle}" renewed for ${days} day${days === 1 ? "" : "s"}.`,
        );
      } else {
        setError(result.error || "Renewal failed.");
      }
    });

  const tabCounts: Record<string, number> = {
    saved: savedItems.length,
    cart: cartItems.length,
    active: holds.length + requests.length + loans.length,
    renewal: loans.length,
    history: history.rows.length,
  };

  const switchTab = (key: string): void => {
    setActiveTab(key);
    setError(null);
    setSuccess(null);
  };

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const index = TABS.findIndex((entry) => entry.key === activeTab);
    if (index === -1) return;

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
    if (next === -1) return;

    event.preventDefault();
    switchTab(TABS[next].key);
    document.getElementById(`cart-tab-${TABS[next].key}`)?.focus();
  };

  const handleRefresh = async (): Promise<void> => {
    if (refreshing) return;
    setRefreshing(true);
    requestedStock.current = new Set();
    setReservable({});
    setStockNonce((n) => n + 1);
    try {
      await Promise.all([
        refresh({ silent: true }),
        new Promise((resolve) => setTimeout(resolve, 550)),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const openBook = (bookId: string): void => {
    onClose();
    const cartFrom = location.pathname + location.search;
    navigate(`/opac/collections/${bookId}`, {
      state: { cartFrom } satisfies CartReturnState,
    });
  };

  const browseCatalogue = (): void => {
    onClose();
    navigate("/opac/collections");
  };

  const tabButton = (key: string, label: string, Icon: LucideIcon) => {
    const active = activeTab === key;
    return (
      <Button
        key={key}
        type="button"
        role="tab"
        id={`cart-tab-${key}`}
        aria-selected={active}
        aria-controls={`cart-panel-${key}`}
        tabIndex={active ? 0 : -1}
        variant={null}
        size={null}
        onClick={() => switchTab(key)}
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
          className={`border-0 font-normal rounded-full px-2 py-0.5 text-[11px] ${
            active
              ? "bg-[#EAF4FE] text-[#0F76CC]"
              : "bg-gray-200/70 text-gray-600"
          }`}
        >
          {tabCounts[key]}
        </Badge>
      </Button>
    );
  };

  const footerActions = (
    <>
      <Button
        variant="cancel"
        onClick={onClose}
        className="w-auto md:w-[110px]"
      >
        Close
      </Button>

      {activeTab === "cart" && (
        <Button
          variant="secondary"
          onClick={() => setConfirmReserve(true)}
          disabled={busy === "reserve" || Boolean(reserveBlockedReason)}
          className="w-auto md:w-[190px]"
        >
          <CalendarCheck className="size-4" />
          {busy === "reserve"
            ? "Requesting..."
            : `Request${totalSelected > 0 ? ` (${totalSelected})` : ""}`}
        </Button>
      )}
    </>
  );

  const footerLeft =
    activeTab === "cart" ? (
      <Text className="text-xs text-gray-500">
        {reserveBlockedReason || (
          <>
            <span className="font-[gothamMedium] text-[#003067]">
              {totalSelected}
            </span>{" "}
            cop{totalSelected === 1 ? "y" : "ies"} will be set aside for you
            pending a librarian's approval
          </>
        )}
      </Text>
    ) : activeTab === "renewal" ? (
      <Text className="text-xs text-gray-500">
        {loans.length === 0
          ? "Nothing on loan."
          : `A renewal runs ${policy.RenewalPeriodDays} days. Each loan can be renewed ${
              policy.MaxRenewals === 1 ? "once" : `${policy.MaxRenewals} times`
            }.`}
      </Text>
    ) : null;

  return (
    <>
      <ModalShell
        open={open}
        title="My Cart"
        description="Request books, and follow what you have on hold, on loan and returned."
        icon={<ShoppingCart className="size-5" />}
        size="lg"
        onClose={onClose}
        bodyClassName="bg-gray-50"
        footerLeft={footerLeft}
        actions={footerActions}
      >
        <div className="sticky -top-5 z-10 -mx-6 -mt-5 mb-4 bg-gray-50 px-6 pt-5 sm:-mx-8 sm:px-8">
          <div
            role="tablist"
            aria-label="Cart sections"
            onKeyDown={onTabKeyDown}
            className="flex gap-1 overflow-x-auto border-b border-gray-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {TABS.map((entry) => tabButton(entry.key, entry.label, entry.icon))}

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
              aria-label={`Refresh ${
                TABS.find((entry) => entry.key === activeTab)?.label || ""
              }`}
              title="Refresh"
              className="mb-1.5 ml-auto h-7 w-7 shrink-0 self-center"
            >
              <RefreshCcw
                className={cn(
                  "size-3.5",
                  refreshing && "animate-spin [animation-direction:reverse]",
                )}
              />
            </Button>
          </div>
        </div>

        {(success || error) && (
          <div className="mb-4 space-y-2">
            {success && (
              <Banner tone="success" onDismiss={() => setSuccess(null)}>
                {success}
              </Banner>
            )}
            {error && (
              <Banner tone="error" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            )}
          </div>
        )}

        {activeTab === "cart" && (
          <Panel id="cart">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-3">
              <Text className="text-xs text-[#0F76CC] sm:text-sm">
                You can request{" "}
                <span className="font-[gothamMedium]">
                  {slotsLeft} more book{slotsLeft === 1 ? "" : "s"}
                </span>{" "}
                — {overview.maxSlots} on loan, held or requested at a time.
              </Text>
              <Badge
                variant={null}
                className="border-[#128CF1]/20 bg-white font-[gothamMedium] text-[#0F76CC]"
              >
                {cartItems.length}/{policy.MaxCartItems} in cart
              </Badge>
            </div>

            {!hydrated ? (
              <ListSkeleton withCover />
            ) : cartItems.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="size-6" />}
                title="Your cart is empty"
                hint="Add books from the catalogue and they will wait for you here."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={browseCatalogue}
                  >
                    Browse the catalogue
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {cartItems.map((book) => {
                  const stock = reservable[book.id];
                  const quantity = quantities[book.id] || 0;
                  const max = capFor(book.id, quantities);

                  return (
                    <li key={book.id} className={`${CARD} flex gap-3`}>
                      <button
                        type="button"
                        onClick={() => openBook(book.id)}
                        aria-label={`Open ${book.CollectionTitle}`}
                        className="shrink-0 cursor-pointer rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <Cover
                          src={book.CollectionImage}
                          alt=""
                          className="h-20 w-14"
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openBook(book.id)}
                          title={book.CollectionTitle}
                          className="block max-w-full cursor-pointer truncate text-left font-[gothamMedium] text-sm text-[#003067] outline-none hover:text-[#128CF1] hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {book.CollectionTitle}
                        </button>
                        <Text className="truncate text-xs text-gray-500">
                          {book.MainAuthor || "Unknown"}
                        </Text>

                        <Text
                          className={`mt-1 text-xs ${
                            (stock?.available ?? 1) === 0
                              ? "text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {stock === undefined
                            ? "Checking availability..."
                            : stock.count === 0
                              ? "This title cannot be borrowed"
                              : stock.available > 0
                                ? `${stock.available} of ${stock.count} cop${stock.count === 1 ? "y" : "ies"} free to reserve`
                                : `All ${stock.count} cop${stock.count === 1 ? "y is" : "ies are"} out — try again once one is returned`}
                        </Text>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
                            <Button
                              type="button"
                              variant={null}
                              size={null}
                              onClick={() => changeQuantity(book.id, -1)}
                              disabled={quantity <= 0}
                              aria-label={`One fewer copy of ${book.CollectionTitle}`}
                              className="size-8 rounded-l-lg text-gray-500 transition hover:bg-gray-50 hover:text-[#003067] disabled:opacity-40"
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <span
                              aria-live="polite"
                              className="w-8 text-center font-[gothamMedium] text-sm text-[#003067]"
                            >
                              {quantity}
                            </span>
                            <Button
                              type="button"
                              variant={null}
                              size={null}
                              onClick={() => changeQuantity(book.id, 1)}
                              disabled={quantity >= max}
                              aria-label={`One more copy of ${book.CollectionTitle}`}
                              className="size-8 rounded-r-lg text-gray-500 transition hover:bg-gray-50 hover:text-[#003067] disabled:opacity-40"
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await removeFromCart(book.id);
                              setSuccess(
                                `${book.CollectionTitle} removed from cart.`,
                              );
                            }}
                            disabled={loading}
                            className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {cartItems.length > 0 && (
              <section
                className={`${CARD} mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 sm:items-start`}
              >
                <div className="min-w-0">
                  <Text className="font-[gothamMedium] text-sm text-[#003067]">
                    What is it for?
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-500">
                    A copy is set aside the moment you ask, so nobody else can
                    take it while you wait. A librarian has{" "}
                    {policy.HoldRequestExpiryHours} hours to answer, and if
                    nobody does, the copy goes back on the shelf. Say yes and
                    you will get {policy.PickupWindowDays} open days to collect
                    — we will tell you the exact dates.
                  </Text>
                </div>

                <div className="min-w-0">
                  <Textarea
                    id="cart-purpose"
                    label="Purpose"
                    labelClassName="block font-[gothamMedium] text-sm text-[#003067]"
                    required
                    rows={3}
                    maxLength={MAX_PURPOSE_LENGTH}
                    value={purpose}
                    onChange={(event) => {
                      setPurpose(event.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. Research for a school report on Philippine history."
                  />
                </div>
              </section>
            )}
          </Panel>
        )}

        {activeTab === "saved" && (
          <Panel id="saved">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-3">
              <Text className="text-xs text-[#0F76CC] sm:text-sm">
                Books you want to come back to. Nothing is reserved until you
                add it to your cart.
              </Text>
              <Badge
                variant={null}
                className="border-[#128CF1]/20 bg-white font-[gothamMedium] text-[#0F76CC]"
              >
                {savedItems.length}/{policy.MaxSavedItems} saved
              </Badge>
            </div>

            {!hydrated ? (
              <ListSkeleton withCover />
            ) : savedItems.length === 0 ? (
              <EmptyState
                icon={<Bookmark className="size-6" />}
                title="Nothing saved yet"
                hint="Use the bookmark on a book cover to keep it here for later."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={browseCatalogue}
                  >
                    Browse the catalogue
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {savedItems.map((book) => {
                  const inCart = Boolean(cart[book.id]);
                  const cartFull = cartItems.length >= policy.MaxCartItems;
                  const refusal =
                    book.CartStatus && book.CartStatus !== "ok"
                      ? book.CartStatus
                      : null;
                  const blocked = refusal ? CART_STATUS_LABEL[refusal] : null;

                  return (
                    <li
                      key={book.id}
                      className={`${CARD} flex flex-wrap items-center gap-3`}
                    >
                      <button
                        type="button"
                        onClick={() => openBook(book.id)}
                        aria-label={`Open ${book.CollectionTitle}`}
                        className="shrink-0 cursor-pointer rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <Cover
                          src={book.CollectionImage}
                          alt=""
                          className="h-20 w-14"
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openBook(book.id)}
                          title={book.CollectionTitle}
                          className="block max-w-full cursor-pointer truncate text-left font-[gothamMedium] text-sm text-[#003067] outline-none hover:text-[#128CF1] hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {book.CollectionTitle}
                        </button>
                        <Text className="truncate text-xs text-gray-500">
                          {book.MainAuthor || "Unknown"}
                        </Text>

                        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          {book.ClassCode && (
                            <span className="shrink-0 rounded-md bg-[#EAF4FE] px-2 py-0.5 text-[11px] font-[gothamMedium] text-[#128CF1]">
                              {book.ClassCode}
                            </span>
                          )}
                          {[book.MaterialType, book.Year].filter(Boolean)
                            .length > 0 && (
                            <Text className="truncate text-xs text-gray-400">
                              {[book.MaterialType, book.Year]
                                .filter(Boolean)
                                .join("  ·  ")}
                            </Text>
                          )}
                        </div>

                        {book.CartStatus && (
                          <span
                            className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-[gothamMedium] ${
                              AVAILABILITY_BADGE[book.CartStatus].className
                            }`}
                          >
                            {AVAILABILITY_BADGE[book.CartStatus].label}
                          </span>
                        )}

                        {!blocked && (inCart || cartFull) && (
                          <Text className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-[#0F76CC]">
                            <CheckCircle2 className="size-3.5 shrink-0" />
                            {inCart
                              ? "In your cart"
                              : `Cart is full — ${policy.MaxCartItems} titles`}
                          </Text>
                        )}
                      </div>

                      <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                        <button
                          type="button"
                          title="View full details"
                          aria-label={`View ${book.CollectionTitle}`}
                          onClick={() => openBook(book.id)}
                          className={ROUND_ACTION}
                        >
                          <BookOpen className="size-4" />
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          title="Remove from saved"
                          aria-label={`Remove ${book.CollectionTitle} from saved`}
                          onClick={() => setPendingUnsave(book)}
                          className={ROUND_ACTION}
                        >
                          <Bookmark className="size-4" fill="currentColor" />
                        </button>

                        <button
                          type="button"
                          disabled={
                            loading || Boolean(blocked) || inCart || cartFull
                          }
                          title={
                            (refusal && CART_STATUS_MESSAGE[refusal]) ||
                            (inCart
                              ? "Already in your cart"
                              : cartFull
                                ? `Your cart is full (${policy.MaxCartItems} titles).`
                                : "Add to cart")
                          }
                          aria-label={`Add ${book.CollectionTitle} to cart`}
                          onClick={async () => {
                            const result = await addToCart(book);
                            if (result.success) {
                              setSuccess(
                                `${book.CollectionTitle} added to your cart.`,
                              );
                            } else {
                              setError(
                                result.error || "Failed to add to cart.",
                              );
                            }
                          }}
                          className={ROUND_ACTION}
                        >
                          <ShoppingCart className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}

        {activeTab === "active" && (
          <Panel id="active">
            {counts.total > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-3">
                <div className="min-w-0">
                  <Text className="font-[gothamMedium] text-sm text-[#003067]">
                    {counts.total} of {overview.maxSlots} books
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#0F76CC]">
                    {[
                      counts.loans > 0 && `${counts.loans} on loan`,
                      counts.holds > 0 && `${counts.holds} ready to collect`,
                      counts.pending > 0 &&
                        `${counts.pending} awaiting approval`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </div>

                <div className="flex items-center gap-1.5" aria-hidden>
                  {Array.from({ length: overview.maxSlots }, (_, index) => (
                    <span
                      key={index}
                      className={`size-2.5 rounded-full ${
                        index < counts.loans
                          ? "bg-[#003067]"
                          : index < counts.loans + counts.holds
                            ? "bg-[#128CF1]"
                            : index < counts.total
                              ? "bg-[#128CF1]/40"
                              : "border border-[#128CF1]/40 bg-white"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {!hydrated ? (
              <ListSkeleton withCover />
            ) : counts.total === 0 ? (
              <EmptyState
                icon={<Library className="size-6" />}
                title="Nothing on hold or on loan"
                hint={`Requests you make from the Cart tab, and books handed to you at the desk, both appear here — ${overview.maxSlots} at a time.`}
              />
            ) : (
              <ul className="space-y-3">
                {holds.map((hold) => (
                  <li key={hold.HoldID} className={`${CARD} flex gap-3`}>
                    <Cover
                      src={hold.CollectionImage}
                      alt=""
                      className="h-20 w-14 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5">
                            <TypeBadge type="held" />
                          </div>
                          <Text
                            className="truncate font-[gothamMedium] text-sm text-[#003067]"
                            title={hold.CollectionTitle}
                          >
                            {hold.CollectionTitle ||
                              `Accession ${hold.Accession}`}
                          </Text>
                        </div>
                        <StatusPill
                          status={hold.Collectable ? "Ready" : "Approved"}
                        />
                      </div>

                      <Text className="mt-1 text-xs text-gray-400">
                        Accession {hold.Accession}
                      </Text>

                      <Text className="mt-2 text-xs text-gray-600">
                        {hold.Collectable
                          ? "Waiting for you at the desk."
                          : `Ready to collect from ${formatDateLong(hold.PickupFrom)}.`}
                        {hold.ShelfExpiresOn
                          ? ` Last day to collect is ${formatDateLong(hold.ShelfExpiresOn)}.`
                          : ""}
                      </Text>

                      {hold.RequestId ? (
                        <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPendingCancel({
                                requestId: hold.RequestId,
                                busyKey: hold.HoldID,
                                title: hold.CollectionTitle,
                                accession: hold.Accession,
                                approved: true,
                              })
                            }
                            disabled={busy === hold.HoldID}
                            className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                          >
                            <X className="size-3.5" />
                            {busy === hold.HoldID
                              ? "Cancelling..."
                              : "Cancel reservation"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}

                {requests.map((request) => (
                  <li key={request.id} className={CARD}>
                    <RecordHeader
                      badge={<TypeBadge type="requested" />}
                      title="Reservation request"
                      meta={`Requested ${formatDateLong(request.RequestedOn)}`}
                      status={request.Status}
                    />

                    <BookLines books={request.Books} />

                    <StatusNote
                      text={
                        "A copy is already set aside for you. A librarian still has " +
                        "to approve it, and will tell you which days you can collect. " +
                        "If nobody decides in time, the copy goes back on the shelf."
                      }
                    />

                    <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPendingCancel({
                            requestId: request.id,
                            busyKey: request.id,
                            title: request.Books[0]?.CollectionTitle || "",
                            accession: request.Books[0]?.Accession || "",
                            approved: false,
                          })
                        }
                        disabled={busy === request.id}
                        className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="size-3.5" />
                        {busy === request.id
                          ? "Cancelling..."
                          : "Cancel request"}
                      </Button>
                    </div>
                  </li>
                ))}

                {loans.map((loan) => (
                  <li key={loan.BorrowID} className={`${CARD} flex gap-3`}>
                    <Cover
                      src={loan.CollectionImage}
                      alt=""
                      className="h-20 w-14 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5">
                            <TypeBadge type="borrowed" />
                          </div>
                          <Text
                            className="truncate font-[gothamMedium] text-sm text-[#003067]"
                            title={loan.CollectionTitle}
                          >
                            {loan.CollectionTitle}
                          </Text>
                        </div>
                        {loan.Status !== "Borrowed" && (
                          <StatusPill status={loan.Status} />
                        )}
                      </div>

                      <Text className="mt-1 text-xs text-gray-400">
                        Accession {loan.Accession}
                      </Text>

                      <Text
                        className={`mt-2 text-xs ${
                          loan.IsOverdue ? "text-red-700" : "text-gray-600"
                        }`}
                      >
                        {loan.IsOverdue
                          ? `Was due ${formatDateLong(loan.DueDate)}. Please return it as soon as you can.`
                          : `Due back ${formatDateLong(loan.DueDate)}.`}
                      </Text>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {activeTab === "renewal" && (
          <Panel id="renewal">
            {!hydrated ? (
              <ListSkeleton withCover />
            ) : loans.length === 0 ? (
              <EmptyState
                icon={<RefreshCw className="size-6" />}
                title="Nothing to renew"
                hint={`Books you have out appear here. You can extend each one yourself ${
                  policy.MaxRenewals === 1
                    ? "once"
                    : `${policy.MaxRenewals} times`
                }, by ${policy.RenewalPeriodDays} days, as the due date approaches.`}
              />
            ) : (
              <ul className="space-y-3">
                {loans.map((loan) => {
                  const eligible = loan.IneligibleReason === null;

                  return (
                    <li key={loan.BorrowID} className={CARD}>
                      <div className="flex gap-3">
                        <Cover
                          src={loan.CollectionImage}
                          alt=""
                          className={`h-20 w-14 shrink-0 ${eligible ? "" : "opacity-70"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <Text
                              className="min-w-0 flex-1 truncate font-[gothamMedium] text-sm text-[#003067]"
                              title={loan.CollectionTitle}
                            >
                              {loan.CollectionTitle}
                            </Text>
                            {loan.Status !== "Borrowed" && (
                              <StatusPill status={loan.Status} />
                            )}
                          </div>

                          <Text className="mt-1 text-xs text-gray-400">
                            Accession {loan.Accession}
                          </Text>

                          <Text className="mt-2 text-xs text-gray-600">
                            Due back {formatDateLong(loan.DueDate)} · renewed{" "}
                            {loan.RenewalCount} of {loan.MaxRenewals} times
                          </Text>

                          {loan.IneligibleReason && (
                            <Text className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                              <Clock className="size-3 shrink-0" />
                              {loan.IneligibleReason}
                            </Text>
                          )}
                        </div>
                      </div>

                      {eligible && (
                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
                          <Select
                            value={String(policy.RenewalPeriodDays)}
                            disabled
                          >
                            <SelectTrigger
                              size="sm"
                              className="w-[104px]"
                              aria-label={`Renews ${loan.CollectionTitle} for ${policy.RenewalPeriodDays} days`}
                              title="Renewals run the full period"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value={String(policy.RenewalPeriodDays)}
                              >
                                {policy.RenewalPeriodDays} days
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setPendingRenew(loan)}
                            disabled={busy === loan.BorrowID}
                          >
                            <RefreshCw className="size-3.5" />
                            {busy === loan.BorrowID ? "Renewing..." : "Renew"}
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}

        {activeTab === "history" && (
          <Panel id="history">
            {!hydrated ? (
              <ListSkeleton />
            ) : history.rows.length === 0 ? (
              <EmptyState
                icon={<History className="size-6" />}
                title="No history yet"
                hint="Every request, loan, renewal and return is listed here."
              />
            ) : (
              <>
                <ul className="space-y-3">
                  {history.rows.map((row) => (
                    <li key={row.id} className={CARD}>
                      <RecordHeader
                        title={HISTORY_TITLES[row.Type] || row.Type}
                        meta={formatDateLong(row.ProcessedOn)}
                        status={row.Status}
                      />
                      <BookLines
                        books={
                          row.Books.length > 0
                            ? row.Books
                            : [
                                {
                                  BookID: "",
                                  Accession: row.Accession,
                                  CollectionTitle: row.CollectionTitle,
                                },
                              ]
                        }
                      />
                      <StatusNote text={historyNote(row)} />
                    </li>
                  ))}
                </ul>

                {history.hasMore && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMoreHistory}
                      disabled={historyLoading}
                    >
                      {historyLoading ? "Loading..." : "Show older records"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Panel>
        )}
      </ModalShell>

      <ModalShell
        open={confirmReserve}
        title="Confirm your request"
        description="A copy of each title below is taken off the shelf as soon as you send this."
        size="sm"
        icon={<CalendarCheck className="size-5" />}
        onClose={
          busy === "reserve" ? undefined : () => setConfirmReserve(false)
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmReserve(false)}
              disabled={busy === "reserve"}
            >
              Go back
            </Button>
            <Button
              variant="secondary"
              onClick={handleReserve}
              disabled={busy === "reserve"}
            >
              <CalendarCheck className="size-4" />
              {busy === "reserve" ? "Requesting..." : "Send request"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ul className="divide-y rounded-xl border">
            {cartItems
              .filter((book) => (quantities[book.id] || 0) > 0)
              .map((book) => (
                <li
                  key={book.id}
                  className="flex items-start justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <Text className="truncate font-[gothamMedium] text-sm text-[#003067]">
                      {book.CollectionTitle}
                    </Text>
                    <Text className="truncate text-xs text-gray-500">
                      {book.MainAuthor}
                    </Text>
                  </div>
                  <Badge className="shrink-0 bg-[#EAF4FE] text-[#128CF1]">
                    {quantities[book.id]} cop
                    {quantities[book.id] === 1 ? "y" : "ies"}
                  </Badge>
                </li>
              ))}
          </ul>

          <div>
            <Text className="text-xs font-[gothamMedium] text-[#003067]">
              What it is for
            </Text>
            <Text className="mt-0.5 text-sm break-words whitespace-pre-wrap text-gray-600">
              {purpose.trim()}
            </Text>
          </div>

          <Text className="text-xs text-gray-500">
            That takes you to{" "}
            <span className="font-[gothamMedium] text-[#003067]">
              {counts.total + totalSelected} of {overview.maxSlots}
            </span>{" "}
            {counts.total + totalSelected === 1 ? "book" : "books"}, leaving you{" "}
            {Math.max(0, slotsLeft - totalSelected) || "no"} slot
            {Math.max(0, slotsLeft - totalSelected) === 1 ? "" : "s"} free. A
            librarian has {policy.HoldRequestExpiryHours} hours to answer, and
            you can cancel any request before you collect it.
          </Text>
        </div>
      </ModalShell>

      <ModalShell
        open={!!pendingCancel}
        title={
          pendingCancel?.approved
            ? "Give up this hold?"
            : "Cancel this request?"
        }
        description={
          pendingCancel?.approved
            ? "The copy waiting for you at the desk goes back on the shelf for someone else."
            : "The copy set aside for you goes back on the shelf, and the librarian will not see the request."
        }
        tone="warning"
        size="sm"
        icon={<CalendarClock className="size-5" />}
        onClose={
          busy === pendingCancel?.busyKey
            ? undefined
            : () => setPendingCancel(null)
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setPendingCancel(null)}
              disabled={busy === pendingCancel?.busyKey}
            >
              Keep it
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={busy === pendingCancel?.busyKey}
              onClick={() => {
                if (!pendingCancel) return;
                void handleCancel(
                  pendingCancel.requestId,
                  pendingCancel.busyKey,
                );
              }}
            >
              {busy === pendingCancel?.busyKey
                ? "Cancelling..."
                : pendingCancel?.approved
                  ? "Give it up"
                  : "Cancel request"}
            </Button>
          </>
        }
      >
        <Text className="text-sm text-gray-600">
          <span className="font-[gothamMedium] text-[#003067]">
            {pendingCancel?.title || "This title"}
          </span>
          {pendingCancel?.accession ? ` (${pendingCancel.accession})` : ""} will
          be released, and the slot it uses goes back to you. You can reserve it
          again later, but only while a copy is free.
        </Text>
      </ModalShell>

      <ModalShell
        open={!!pendingRenew}
        title={`Renew for ${policy.RenewalPeriodDays} days?`}
        description={
          policy.MaxRenewals === 1
            ? "Each loan can be renewed once, so this uses up this book's renewal."
            : `You can renew each loan ${policy.MaxRenewals} times.`
        }
        size="sm"
        icon={<RefreshCw className="size-5" />}
        onClose={
          busy === pendingRenew?.BorrowID
            ? undefined
            : () => setPendingRenew(null)
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setPendingRenew(null)}
              disabled={busy === pendingRenew?.BorrowID}
            >
              Not yet
            </Button>
            <Button
              className="bg-[#128CF1] text-white hover:bg-[#0F76CC]"
              disabled={busy === pendingRenew?.BorrowID}
              onClick={() => {
                if (!pendingRenew) return;
                void handleRenew(pendingRenew);
              }}
            >
              {busy === pendingRenew?.BorrowID
                ? "Renewing..."
                : `Renew ${policy.RenewalPeriodDays} days`}
            </Button>
          </>
        }
      >
        <Text className="text-sm text-gray-600">
          <span className="font-[gothamMedium] text-[#003067]">
            {pendingRenew?.CollectionTitle || "This title"}
          </span>
          {pendingRenew?.Accession ? ` (${pendingRenew.Accession})` : ""} is due
          back {pendingRenew ? formatDateLong(pendingRenew.DueDate) : ""}.
        </Text>

        {pendingRenew?.RenewsTo != null && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#128CF1]/20 bg-[#EAF4FE] px-4 py-3">
            <CalendarClock className="size-4 shrink-0 text-[#128CF1]" />
            <Text className="text-sm text-[#003067]">
              New due date{" "}
              <span className="font-[gothamMedium]">
                {formatDateLong(pendingRenew.RenewsTo)}
              </span>
            </Text>
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={!!pendingUnsave}
        title="Remove from saved"
        description="This only takes it off your saved list. The book stays in the catalogue and nothing is borrowed or cancelled."
        tone="warning"
        size="sm"
        icon={<Bookmark className="size-5" />}
        onClose={busy ? undefined : () => setPendingUnsave(null)}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setPendingUnsave(null)}
              disabled={!!busy}
            >
              Keep it
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={!!busy}
              onClick={() => {
                const book = pendingUnsave;
                if (!book) return;
                void withBusy(`unsave:${book.id}`, async () => {
                  await unsaveBook(book.id);
                  setPendingUnsave(null);
                  setSuccess(`${book.CollectionTitle} removed from saved.`);
                });
              }}
            >
              {busy ? "Removing..." : "Remove"}
            </Button>
          </>
        }
      >
        <Text className="text-sm text-gray-600">
          Remove{" "}
          <span className="font-[gothamMedium] text-[#003067]">
            {pendingUnsave?.CollectionTitle}
          </span>{" "}
          from your saved list?
        </Text>
      </ModalShell>
    </>
  );
}

export type { HoldRow, LoanRow, RequestRow } from "./cart-utils";
