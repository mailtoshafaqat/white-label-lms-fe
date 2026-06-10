export type SortDirection = "asc" | "desc";

export type PagedListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
};

export type PagedResult<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
};

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function buildQueryString(
  params: PagedListParams & Record<string, string | number | undefined | null>
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export type ParsedPagedListState = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortDir: SortDirection;
};

export function parsePagedListFromUrl(
  searchParams: URLSearchParams,
  defaults?: Partial<ParsedPagedListState>
): ParsedPagedListState {
  const page = Math.max(1, Number(searchParams.get("page") ?? defaults?.page ?? 1) || 1);
  const rawSize = Number(searchParams.get("pageSize") ?? defaults?.pageSize ?? DEFAULT_PAGE_SIZE);
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? rawSize
    : DEFAULT_PAGE_SIZE;
  const sortDirRaw = searchParams.get("sortDir") ?? defaults?.sortDir ?? "desc";
  const sortDir: SortDirection = sortDirRaw === "asc" ? "asc" : "desc";

  return {
    page,
    pageSize,
    search: searchParams.get("search") ?? defaults?.search ?? "",
    sortBy: searchParams.get("sortBy") ?? defaults?.sortBy ?? "",
    sortDir,
  };
}

export function pagedListToUrlParams(state: ParsedPagedListState): Record<string, string> {
  const params: Record<string, string> = {
    page: String(state.page),
    pageSize: String(state.pageSize),
  };
  if (state.search.trim()) params.search = state.search.trim();
  if (state.sortBy) params.sortBy = state.sortBy;
  if (state.sortDir) params.sortDir = state.sortDir;
  return params;
}

export function rangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return "No results";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `Showing ${start}–${end} of ${total}`;
}
