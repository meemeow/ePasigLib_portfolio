import { useCallback, useMemo, useState } from "react";

export interface PagedList<T> {
  items: T[];
  total: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setItemsPerPage: (value: number) => void;
}

export function usePagedList<T>(
  all: T[],
  initialItemsPerPage: number = 10,
): PagedList<T> {
  const [requestedPage, setRequestedPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);

  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, itemsPerPage)));

  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);

  const items = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return all.slice(start, start + itemsPerPage);
  }, [all, currentPage, itemsPerPage]);

  const goToPage = useCallback(
    (page: number) => setRequestedPage(Math.max(1, page)),
    [],
  );

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) setRequestedPage(currentPage + 1);
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) setRequestedPage(currentPage - 1);
  }, [currentPage]);

  const setItemsPerPage = useCallback((value: number) => {
    setItemsPerPageState(Math.max(1, value));
    setRequestedPage(1);
  }, []);

  return {
    items,
    total,
    currentPage,
    totalPages,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    setItemsPerPage,
  };
}
