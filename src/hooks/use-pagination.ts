import { useState, useMemo } from "react";

interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { pageSize = 10 } = options;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  // Reset to page 1 if items change and current page is out of bounds
  const safePage = currentPage > totalPages ? 1 : currentPage;
  if (safePage !== currentPage) {
    setCurrentPage(safePage);
  }

  return {
    currentPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    totalItems: items.length,
    pageSize,
  };
}
