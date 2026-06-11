"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { AdminListToolbar } from "@/components/admin-list-toolbar";
import { AdminPagination } from "@/components/admin-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { usePagedList } from "@/hooks/use-paged-list";
import { doubtsApi } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

type StatusFilter = "open" | "resolved" | "all";

function parseStatusFilter(raw: string | null): StatusFilter {
  if (raw === "resolved" || raw === "all" || raw === "open") return raw;
  return "open";
}

function AdminDoubtsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(searchParams.get("status"))
  );

  const listExtras = useMemo(() => ({ status: filter }), [filter]);

  const fetchDoubts = useCallback(
    (params: Parameters<typeof doubtsApi.adminList>[0]) =>
      doubtsApi.adminList({ ...params, status: filter }),
    [filter]
  );

  const list = usePagedList({
    fetch: fetchDoubts,
    syncUrl: true,
    extraParams: listExtras,
  });

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/dashboard");
    }
  }, [router]);

  const emptyMessage =
    list.debouncedSearch.trim().length > 0
      ? "No doubts match your search."
      : `No ${filter === "all" ? "" : filter} doubts.`;

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-8 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <MessageCircleQuestion className="h-6 w-6 text-[var(--brand)]" />
          Student doubts
        </h1>
        <p className="mt-1 text-slate-600">
          Questions routed to you by subject assignment. Reply and mark resolved when answered.{" "}
          <Link href="/admin/doubt-templates" className="font-medium text-[var(--brand)] hover:underline">
            Manage canned replies
          </Link>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["open", "resolved", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                filter === s
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <AdminListToolbar
            search={list.searchInput}
            onSearchChange={list.setSearchInput}
            pageSize={list.pageSize}
            onPageSizeChange={list.setPageSize}
            page={list.page}
            total={list.total}
            searchPlaceholder="Search by title or student…"
          />
        </div>

        {list.error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{list.error}</p>
        )}

        {list.loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : list.data.length === 0 ? (
          <p className="mt-6 text-slate-500">{emptyMessage}</p>
        ) : (
          <div className="mt-6 space-y-3">
            {list.data.map((t) => (
              <Link key={t.id} href={`/admin/doubts/${t.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start justify-between gap-4 pt-5">
                    <div>
                      <p className="font-medium text-slate-900">{t.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {t.studentName ?? "Student"} · {t.subjectTitle} · {t.bundleTitle}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Updated {new Date(t.updatedAt ?? t.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        t.status === "Open"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <AdminPagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            onPageChange={list.setPage}
          />
        </div>
      </main>
    </div>
  );
}

export default function AdminDoubtsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-slate-500">Loading…</div>}>
      <AdminDoubtsContent />
    </Suspense>
  );
}
