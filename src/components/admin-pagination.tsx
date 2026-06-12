"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  variant?: "light" | "dark";
};

function pageNumbers(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  variant = "light",
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const pages = pageNumbers(page, totalPages);
  const dark = variant === "dark";

  return (
    <nav
      className={
        dark
          ? "flex items-center justify-between gap-2 border-t border-white/10 bg-white/5 px-4 py-3"
          : "flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3"
      }
      aria-label="Pagination"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        className={
          dark
            ? "border-white/25 bg-slate-800/90 text-slate-100 hover:bg-slate-700 hover:text-white"
            : undefined
        }
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e-${i}`} className={`px-2 ${dark ? "text-slate-500" : "text-slate-400"}`}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[2rem] rounded-md px-2 py-1 text-sm font-medium ${
                p === page
                  ? dark
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-800 text-white"
                  : dark
                    ? "text-slate-300 hover:bg-white/10"
                    : "text-slate-600 hover:bg-slate-200"
              }`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        className={
          dark
            ? "border-white/25 bg-slate-800/90 text-slate-100 hover:bg-slate-700 hover:text-white"
            : undefined
        }
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
