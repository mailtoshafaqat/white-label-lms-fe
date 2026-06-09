"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { flashcardsApi, type FlashcardDeckDto } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function FlashcardsPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = use(params);
  const router = useRouter();
  const [deck, setDeck] = useState<FlashcardDeckDto | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    flashcardsApi
      .topicDeck(topicId)
      .then(setDeck)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [topicId, router]);

  const cards = deck?.cards ?? [];
  const card = cards[index];

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => Math.min(Math.max(i + delta, 0), cards.length - 1));
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href={`/topic/${topicId}`} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Flashcards</span>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {deck && card && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h1 className="text-lg font-bold text-slate-900">{deck.title}</h1>
              <span className="text-sm text-slate-500">
                {index + 1} / {cards.length}
              </span>
            </div>

            <button
              onClick={() => setFlipped((f) => !f)}
              className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:shadow-md"
            >
              <span className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                {flipped ? "Answer" : "Question"}
              </span>
              <span className="text-xl font-medium text-slate-900">
                {flipped ? card.back : card.front}
              </span>
              <span className="mt-6 flex items-center gap-1 text-xs text-[var(--brand)]">
                <RotateCw className="h-3.5 w-3.5" /> Tap to flip
              </span>
            </button>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => go(-1)} disabled={index === 0}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              {index === cards.length - 1 ? (
                <Button asChild>
                  <Link href={`/topic/${topicId}`}>Finish</Link>
                </Button>
              ) : (
                <Button onClick={() => go(1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {deck && cards.length === 0 && (
          <p className="text-slate-500">No flashcards for this topic yet.</p>
        )}
      </main>
    </div>
  );
}
