"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, type QuestionSearchHitDto } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";
import { rangeLabel } from "@/lib/paged-list";

export default function QuestionBankPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [hits, setHits] = useState<QuestionSearchHitDto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    if (submitted.trim().length < 2) {
      setHits([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    adminApi
      .searchQuestions(submitted, page, pageSize)
      .then((r) => {
        setHits(r.data);
        setTotal(r.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Search failed"))
      .finally(() => setLoading(false));
  }, [submitted, page, pageSize]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSubmitted(query.trim());
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Question bank search</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search MCQ question text across all topics in your institute.
        </p>

        <form onSubmit={runSearch} className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search question stem (min. 2 characters)…"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm"
          />
        </form>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <Card className="mt-6 border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {submitted.length >= 2 ? rangeLabel(page, pageSize, total) : "Enter a search term"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">Searching…</p>
            ) : hits.length === 0 ? (
              <p className="text-sm text-slate-500">
                {submitted.length >= 2 ? "No questions match your search." : "No results yet."}
              </p>
            ) : (
              <ul className="space-y-3">
                {hits.map((hit) => (
                  <li key={hit.id} className="rounded-lg border border-slate-100 bg-white p-4">
                    <p className="text-sm text-slate-800">{hit.stem}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {[hit.bundleTitle, hit.subjectTitle, hit.topicTitle].filter(Boolean).join(" · ")}
                    </p>
                    {hit.topicId && (
                      <Link
                        href={`/admin/topics/${hit.topicId}`}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
                      >
                        Open topic <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {total > pageSize && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page * pageSize >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
