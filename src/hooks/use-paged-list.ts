"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_PAGE_SIZE,
  type PagedListParams,
  type PagedResult,
  parsePagedListFromUrl,
  pagedListToUrlParams,
} from "@/lib/paged-list";

type UsePagedListOptions<T> = {
  fetch: (
    params: PagedListParams & Record<string, string | number | undefined>
  ) => Promise<PagedResult<T>>;
  initialPageSize?: number;
  debounceMs?: number;
  syncUrl?: boolean;
  extraParams?: Record<string, string | undefined>;
  enabled?: boolean;
};

export function usePagedList<T>({
  fetch,
  initialPageSize = DEFAULT_PAGE_SIZE,
  debounceMs = 300,
  syncUrl = false,
  extraParams = {},
  enabled = true,
}: UsePagedListOptions<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlState = useMemo(
    () =>
      syncUrl
        ? parsePagedListFromUrl(searchParams, { pageSize: initialPageSize })
        : { page: 1, pageSize: initialPageSize, search: "", sortBy: "", sortDir: "desc" as const },
    [syncUrl, searchParams, initialPageSize]
  );

  const [page, setPage] = useState(urlState.page);
  const [pageSize, setPageSize] = useState(urlState.pageSize);
  const [searchInput, setSearchInput] = useState(urlState.search);
  const [debouncedSearch, setDebouncedSearch] = useState(urlState.search);
  const [sortBy, setSortBy] = useState(urlState.sortBy);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(urlState.sortDir);

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;

  const extraKey = JSON.stringify(extraParams);

  useEffect(() => {
    if (!syncUrl) return;
    setPage(urlState.page);
    setPageSize(urlState.pageSize);
    setSearchInput(urlState.search);
    setDebouncedSearch(urlState.search);
    setSortBy(urlState.sortBy);
    setSortDir(urlState.sortDir);
  }, [syncUrl, urlState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [searchInput, debounceMs]);

  const prevSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch;
      setPage(1);
    }
  }, [debouncedSearch]);

  const prevExtraRef = useRef(extraKey);
  useEffect(() => {
    if (prevExtraRef.current !== extraKey) {
      prevExtraRef.current = extraKey;
      setPage(1);
    }
  }, [extraKey]);

  const syncToUrl = useCallback(
    (next: {
      page: number;
      pageSize: number;
      search: string;
      sortBy: string;
      sortDir: "asc" | "desc";
    }) => {
      if (!syncUrl) return;
      const params = new URLSearchParams(pagedListToUrlParams(next));
      for (const [key, value] of Object.entries(extraParams)) {
        if (value) params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [syncUrl, router, pathname, extraParams]
  );

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const extras = JSON.parse(extraKey) as Record<string, string | undefined>;
      const result = await fetchRef.current({
        page,
        pageSize,
        search: debouncedSearch.trim() || undefined,
        sortBy: sortBy || undefined,
        sortDir,
        ...extras,
      });
      setData(result.data);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [enabled, page, pageSize, debouncedSearch, sortBy, sortDir, extraKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    syncToUrl({ page, pageSize, search: debouncedSearch, sortBy, sortDir });
  }, [page, pageSize, debouncedSearch, sortBy, sortDir, syncToUrl]);

  return {
    data,
    total,
    page,
    pageSize,
    searchInput,
    debouncedSearch,
    sortBy,
    sortDir,
    loading,
    error,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    setSearchInput,
    setSortBy,
    setSortDir,
    reload: load,
  };
}
