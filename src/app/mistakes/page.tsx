"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookX, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mistakesApi, type MistakeDto } from "@/lib/api";
import { BookmarkButton } from "@/components/bookmark-button";
import { getSession } from "@/lib/auth";

export default function MistakesPage() {
  const router = useRouter();
  const [mistakes, setMistakes] = useState<MistakeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    mistakesApi
      .list()
      .then(setMistakes)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function resolve(id: string) {
    setResolving(id);
    setError(null);
    try {
      await mistakesApi.resolve(id);
      setMistakes((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resolve");
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Mistake diary</span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <BookX className="h-6 w-6 text-[var(--brand)]" /> Review your mistakes
        </h1>
        <p className="mt-1 text-slate-600">
          Questions you got wrong are saved here so you can revisit and master them.
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href="/weakness-quiz">Start weakness practice quiz</Link>
          </Button>
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : mistakes.length === 0 ? (
          <p className="mt-6 text-slate-500">No mistakes to review — great work!</p>
        ) : (
          <div className="mt-6 space-y-4">
            {mistakes.map((m) => (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-800">{m.quizTitle}</CardTitle>
                  <p className="text-xs text-slate-500">
                    Wrong {m.timesWrong} time{m.timesWrong !== 1 ? "s" : ""} · Last seen{" "}
                    {new Date(m.lastSeenAt).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-medium text-slate-900">{m.stem}</p>
                  <ul className="space-y-1 text-sm">
                    {m.options.map((opt, i) => {
                      const key = String(i);
                      const isCorrect = key === m.correctKey;
                      const wasSelected = key === m.lastSelectedKey;
                      return (
                        <li
                          key={i}
                          className={`rounded px-2 py-1 ${
                            isCorrect
                              ? "bg-emerald-50 text-emerald-800"
                              : wasSelected
                                ? "bg-red-50 text-red-800"
                                : "text-slate-600"
                          }`}
                        >
                          {opt}
                          {isCorrect && " ✓"}
                          {wasSelected && !isCorrect && " (your answer)"}
                        </li>
                      );
                    })}
                  </ul>
                  {m.explanation && (
                    <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                      {m.explanation}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <BookmarkButton
                      targetType="Question"
                      targetId={m.questionId}
                      title={m.stem.length > 120 ? `${m.stem.slice(0, 120)}…` : m.stem}
                      subtitle={m.quizTitle}
                      topicId={m.topicId}
                    />
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/quiz/${m.topicId}`}>Retake quiz</Link>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void resolve(m.id)}
                      disabled={resolving === m.id}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {resolving === m.id ? "Resolving…" : "Mark resolved"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

