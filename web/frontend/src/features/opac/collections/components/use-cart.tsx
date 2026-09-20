import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth/use-auth";
import type {
  CartCollection,
  CartOverview,
  HoldRow,
  LoanRow,
  ReserveBatchItem,
} from "./cart-utils";
import { EMPTY_OVERVIEW, normalizeOverview } from "./cart-utils";
import { callCirculation as call } from "@/lib/api/callables";
import { messageFor } from "@/lib/api/callable-result";


interface Result {
  success: boolean;
  error?: string;
}

interface CartContextType {
  overview: CartOverview;
  cart: Record<string, CartCollection>;
  saved: Record<string, CartCollection>;
  loading: boolean;
  hydrated: boolean;

  refresh: (options?: { silent?: boolean }) => Promise<void>;
  addToCart: (book: CartCollection) => Promise<Result>;
  removeFromCart: (bookId: string) => Promise<void>;
  saveBook: (book: CartCollection) => Promise<Result>;
  unsaveBook: (bookId: string) => Promise<void>;
  reserveBooksBatch: (
    books: ReserveBatchItem[],
    purpose: string,
  ) => Promise<Result>;
  cancelReservation: (requestId: string) => Promise<Result>;
  renewLoan: (borrowKey: string, days?: number) => Promise<Result>;
  loadMoreHistory: () => Promise<void>;
  historyLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);


export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, userType } = useAuth();
  const [overview, setOverview] = useState<CartOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isPatron = Boolean(user) && userType === "Patron";
  const seqRef = useRef(0);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isPatron) {
        setOverview(EMPTY_OVERVIEW);
        setHydrated(true);
        return;
      }
      const seq = ++seqRef.current;
      if (!options?.silent) setLoading(true);
      try {
        const res = await call({ case: "cart_overview", historyLimit: 10 });
        if (seq !== seqRef.current) return;
        setOverview(normalizeOverview(res?.data));
      } catch (error) {
        console.error("Failed to load cart overview:", error);
      } finally {
        if (seq === seqRef.current) {
          setLoading(false);
          setHydrated(true);
        }
      }
    },
    [isPatron],
  );

  useEffect(() => {
    if (!isPatron) {
      setOverview(EMPTY_OVERVIEW);
      setHydrated(false);
      return;
    }
    void refresh();
  }, [isPatron, refresh]);

  const addToCart = useCallback(
    async (book: CartCollection): Promise<Result> => {
      if (!isPatron) {
        return { success: false, error: "Sign in as a patron to use the cart." };
      }
      setLoading(true);
      try {
        const res = await call({ case: "cart_add", book: { id: book.id } });
        const data = res?.data as { ok?: boolean; error?: string; book?: CartCollection };
        if (!data?.ok) {
          return { success: false, error: data?.error || "Failed to add to cart." };
        }
        setOverview((prev) => ({
          ...prev,
          cart: { ...prev.cart, [book.id]: data.book || book },
        }));
        return { success: true };
      } catch (error) {
        return { success: false, error: messageFor(error, "Failed to add to cart.") };
      } finally {
        setLoading(false);
      }
    },
    [isPatron],
  );

  const removeFromCart = useCallback(
    async (bookId: string) => {
      if (!isPatron) return;
      setLoading(true);
      try {
        const res = await call({ case: "cart_remove", bookId });
        if ((res?.data as { ok?: boolean })?.ok) {
          setOverview((prev) => {
            const cart = { ...prev.cart };
            delete cart[bookId];
            return { ...prev, cart };
          });
        }
      } catch (error) {
        console.error("Failed to remove from cart:", error);
      } finally {
        setLoading(false);
      }
    },
    [isPatron],
  );

  const saveBook = useCallback(
    async (book: CartCollection): Promise<Result> => {
      if (!isPatron) {
        return { success: false, error: "Sign in as a patron to save books." };
      }
      setLoading(true);
      try {
        const res = await call({ case: "saved_add", book: { id: book.id } });
        const data = res?.data as { ok?: boolean; error?: string; book?: CartCollection };
        if (!data?.ok) {
          return { success: false, error: data?.error || "Failed to save book." };
        }
        setOverview((prev) => ({
          ...prev,
          saved: { ...prev.saved, [book.id]: data.book || book },
        }));
        return { success: true };
      } catch (error) {
        return { success: false, error: messageFor(error, "Failed to save book.") };
      } finally {
        setLoading(false);
      }
    },
    [isPatron],
  );

  const unsaveBook = useCallback(
    async (bookId: string) => {
      if (!isPatron) return;
      setLoading(true);
      try {
        const res = await call({ case: "saved_remove", bookId });
        if ((res?.data as { ok?: boolean })?.ok) {
          setOverview((prev) => {
            const saved = { ...prev.saved };
            delete saved[bookId];
            return { ...prev, saved };
          });
        }
      } catch (error) {
        console.error("Failed to remove from saved:", error);
      } finally {
        setLoading(false);
      }
    },
    [isPatron],
  );

  const reserveBooksBatch = useCallback(
    async (books: ReserveBatchItem[], purpose: string): Promise<Result> => {
      if (!isPatron) {
        return { success: false, error: "Sign in as a patron to reserve." };
      }
      if (!purpose.trim()) {
        return { success: false, error: "Tell us what you need the book for." };
      }
      setLoading(true);
      try {
        const res = await call({
          case: "reservation_batch",
          books: books.map((item) => ({
            book: { id: item.book.id },
            quantity: item.quantity,
          })),
          purpose,
        });
        const data = res?.data as { ok?: boolean; error?: string };
        if (!data?.ok) {
          return { success: false, error: data?.error || "Reservation failed." };
        }
        await refresh({ silent: true });
        return { success: true };
      } catch (error) {
        return { success: false, error: messageFor(error, "Reservation failed.") };
      } finally {
        setLoading(false);
      }
    },
    [isPatron, refresh],
  );

  const cancelReservation = useCallback(
    async (requestId: string): Promise<Result> => {
      try {
        const res = await call({ case: "reservation_cancel", requestId });
        const data = res?.data as { ok?: boolean; error?: string };
        if (!data?.ok) {
          return {
            success: false,
            error: data?.error || "Failed to cancel reservation.",
          };
        }
        await refresh({ silent: true });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: messageFor(error, "Failed to cancel reservation."),
        };
      }
    },
    [refresh],
  );

  const renewLoan = useCallback(
    async (borrowKey: string, days?: number): Promise<Result> => {
      try {
        const res = await call({ case: "renewal_self", borrowKey, days });
        const data = res?.data as { ok?: boolean; error?: string };
        if (!data?.ok) {
          return { success: false, error: data?.error || "Renewal failed." };
        }
        await refresh({ silent: true });
        return { success: true };
      } catch (error) {
        return { success: false, error: messageFor(error, "Renewal failed.") };
      }
    },
    [refresh],
  );

  const loadMoreHistory = useCallback(async () => {
    if (!isPatron || historyLoading) return;
    const rows = overview.history.rows;
    const last = rows[rows.length - 1];
    if (!last || !overview.history.hasMore) return;

    setHistoryLoading(true);
    try {
      const res = await call({
        case: "cart_history",
        limit: 10,
        startAfterId: last.id,
      });
      const data = res?.data as {
        rows?: CartOverview["history"]["rows"];
        hasMore?: boolean;
      };
      setOverview((prev) => ({
        ...prev,
        history: {
          rows: [...prev.history.rows, ...(data?.rows || [])],
          hasMore: Boolean(data?.hasMore),
        },
      }));
    } catch (error) {
      console.error("Failed to load more history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [isPatron, historyLoading, overview.history]);

  const value = useMemo<CartContextType>(
    () => ({
      overview,
      cart: overview.cart,
      saved: overview.saved,
      loading,
      hydrated,
      refresh,
      addToCart,
      removeFromCart,
      saveBook,
      unsaveBook,
      reserveBooksBatch,
      cancelReservation,
      renewLoan,
      loadMoreHistory,
      historyLoading,
    }),
    [
      overview,
      loading,
      hydrated,
      refresh,
      addToCart,
      removeFromCart,
      saveBook,
      unsaveBook,
      reserveBooksBatch,
      cancelReservation,
      renewLoan,
      loadMoreHistory,
      historyLoading,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");

  const getBookReservableCopies = useCallback(async (bookId: string) => {
    try {
      const res = await call({ case: "book_reservable_copies", bookId });
      const data = res?.data as { count?: number; available?: number };
      return { count: Number(data?.count || 0), available: Number(data?.available || 0) };
    } catch {
      return { count: 0, available: 0 };
    }
  }, []);

  return { ...ctx, getBookReservableCopies };
}

export type { CartOverview, HoldRow, LoanRow };
