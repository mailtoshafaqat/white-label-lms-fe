"use client";

import { Search } from "lucide-react";
import { PAGE_SIZE_OPTIONS, rangeLabel } from "@/lib/paged-list";

type AdminListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  page: number;
  total: number;
  searchPlaceholder?: string;
  children?: React.ReactNode;
};

export function AdminListToolbar({
  search,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  page,
  total,
  searchPlaceholder = "Search…",
  children,
}: AdminListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)]"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="whitespace-nowrap">Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="text-sm text-slate-500">{rangeLabel(page, pageSize, total)}</span>
      </div>
    </div>
  );
}
