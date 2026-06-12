"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bookmarksApi, type BookmarkDto } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function BookmarksPage() {
  const router = useRouter();
  const [items, setItems] = useState<BookmarkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    bookmarksApi
      .list()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function remove(id: string) {
    setRemoving(id);
    try {
      await bookmarksApi.remove(id);
      setItems((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove bookmark");
    } finally {
      setRemoving(null);
    }
  }

  function hrefFor(item: BookmarkDto): string {
    if (item.targetType === "Topic") return `/topic/${item.targetId}`;
    if (item.topicId) return `/topic/${item.topicId}`;
    return "/dashboard";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Bookmarks</span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Bookmark className="h-6 w-6 text-[var(--brand)]" /> Saved for revision
        </h1>
        <p className="mt-1 text-slate-600">Topics and questions you saved to revisit later.</p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-slate-500">No bookmarks yet. Save a topic while studying to see it here.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div>
                    <CardTitle className="text-base">
                      <Link href={hrefFor(item)} className="hover:text-[var(--brand)]">
                        {item.title}
                      </Link>
                    </CardTitle>
                    {item.subtitle && (
                      <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {item.targetType} · {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={removing === item.id}
                    onClick={() => void remove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild variant="outline" size="sm">
                    <Link href={hrefFor(item)}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
