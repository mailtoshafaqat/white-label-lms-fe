"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchApi, type ContentSearchHitDto } from "@/lib/api";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContentSearchHitDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      searchApi
        .content(q)
        .then((hits) => {
          setResults(hits);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search topics and subjects…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-4 py-3 text-sm text-slate-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No results for &ldquo;{query.trim()}&rdquo;</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((hit) => (
                <li key={`${hit.type}-${hit.id}`}>
                  <Link
                    href={hit.type === "Topic" && hit.topicId ? `/topic/${hit.topicId}` : "/dashboard"}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">{hit.title}</p>
                    <p className="text-xs text-slate-500">
                      {hit.type} · {hit.path}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
