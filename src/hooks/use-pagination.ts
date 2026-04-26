import { useState, useMemo, useEffect } from "react";

interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { pageSize = 10 } = options;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // 1. Sincronizar la página de forma segura
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [items.length, totalPages, currentPage]); // Se ejecuta después del render

  const paginatedItems = useMemo(() => {
    // 2. Usar una referencia segura para el cálculo visual 
    // mientras el useEffect hace su trabajo
    const activePage = currentPage > totalPages ? 1 : currentPage;
    const start = (activePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize, totalPages]);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    totalItems: items.length,
    pageSize,
  };
}