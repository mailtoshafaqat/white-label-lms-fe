"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  assessmentsApi,
  type QuizDto,
  type AttemptResultDto,
} from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function QuizPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = use(params);
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AttemptResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    assessmentsApi
      .topicQuiz(topicId)
      .then(setQuiz)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [topicId, router]);

  async function submit() {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = quiz.questions.map((q) => ({
        questionId: q.id,
        selectedKey: answers[q.id] ?? "",
      }));
      setResult(await assessmentsApi.submit(quiz.id, payload));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href={`/topic/${topicId}`} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Daily Practice Test</span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {result ? (
          <div>
            <Card className="mb-6">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-slate-500">Your score</p>
                <p className="mt-1 text-4xl font-bold text-[var(--brand)]">
                  {result.score}/{result.total}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {result.questions.map((q, idx) => (
                <Card key={q.questionId}>
                  <CardHeader>
                    <CardTitle className="flex items-start gap-2 text-sm">
                      {q.isCorrect ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      )}
                      <span>
                        {idx + 1}. {q.stem}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {q.options.map((opt, i) => {
                      const key = i.toString();
                      const isCorrect = key === q.correctKey;
                      const isSelected = key === q.selectedKey;
                      return (
                        <div
                          key={i}
                          className={`rounded-md px-3 py-1.5 ${
                            isCorrect
                              ? "bg-green-50 text-green-800"
                              : isSelected
                              ? "bg-red-50 text-red-800"
                              : "text-slate-600"
                          }`}
                        >
                          {opt}
                          {isCorrect && " ✓"}
                          {isSelected && !isCorrect && " (your answer)"}
                        </div>
                      );
                    })}
                    {q.explanation && (
                      <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                        {q.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={() => { setResult(null); setAnswers({}); }} variant="outline">
                Retry
              </Button>
              <Button asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        ) : (
          quiz && (
            <div>
              <h1 className="mb-4 text-xl font-bold text-slate-900">{quiz.title}</h1>
              <div className="space-y-4">
                {quiz.questions.map((q, idx) => (
                  <Card key={q.id}>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        {idx + 1}. {q.stem}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {q.options.map((opt, i) => {
                        const key = i.toString();
                        return (
                          <label
                            key={i}
                            className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                              answers[q.id] === key
                                ? "border-[var(--brand)] bg-blue-50"
                                : "border-slate-200"
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={answers[q.id] === key}
                              onChange={() => setAnswers((a) => ({ ...a, [q.id]: key }))}
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button className="mt-6" onClick={submit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit answers"}
              </Button>
            </div>
          )
        )}
      </main>
    </div>
  );
}
