"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Target, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { McqAttemptView } from "@/components/assessment/mcq-attempt-view";
import { weaknessQuizApi, type WeaknessQuizDto, type WeaknessQuizResultDto } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { hasMistakeDiary } from "@/lib/product-profile";
import { useAuthSession } from "@/lib/use-auth-session";

export default function WeaknessQuizPage() {
  const router = useRouter();
  const authSession = useAuthSession();
  const [quiz, setQuiz] = useState<WeaknessQuizDto | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<WeaknessQuizResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});
    try {
      setQuiz(await weaknessQuizApi.load(10));
    } catch (e) {
      setQuiz(null);
      setError(
        e instanceof Error
          ? e.message
          : "Could not load weakness quiz. Take topic quizzes first to build your mistake diary."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    if (authSession && !hasMistakeDiary(authSession.tenant)) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [router, authSession, load]);

  async function submit() {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = quiz.questions.map((q) => ({
        questionId: q.id,
        selectedKey: answers[q.id] ?? "",
      }));
      setResult(await weaknessQuizApi.submit(payload));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const sourceLabel =
    quiz?.source === "mistakes"
      ? "From your mistake diary"
      : quiz?.source === "weak-topics"
        ? "From your weak topics"
        : "From mistakes and weak topics";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Weakness practice</span>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Target className="h-6 w-6 text-[var(--brand)]" />
            Adaptive weakness quiz
          </h1>
          <p className="mt-1 text-slate-600">
            Questions weighted toward topics you struggle with. Correct answers clear items from your mistake diary.
          </p>
        </div>

        {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading && <p className="text-slate-500">Building your quiz…</p>}

        {!loading && !quiz && !result && (
          <div className="space-y-3">
            <p className="text-slate-600">
              Take daily practice tests first — wrong answers feed this quiz automatically.
            </p>
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        )}

        {quiz && !result && (
          <>
            <p className="mb-4 text-sm text-slate-500">{sourceLabel} · {quiz.questions.length} questions</p>
            <McqAttemptView
              questions={quiz.questions}
              answers={answers}
              onAnswer={(id, key) => setAnswers((prev) => ({ ...prev, [id]: key }))}
              flagged={new Set()}
              onToggleFlag={() => {}}
              onSubmit={() => void submit()}
              submitting={submitting}
              submitLabel="Submit weakness quiz"
            />
          </>
        )}

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Score: {result.score}/{result.total} (
                  {result.total ? Math.round((result.score / result.total) * 100) : 0}%)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                {result.resolvedMistakes > 0
                  ? `${result.resolvedMistakes} mistake${result.resolvedMistakes !== 1 ? "s" : ""} cleared from your diary.`
                  : "Keep practicing — revisit explanations below."}
              </CardContent>
            </Card>

            {result.questions.map((q) => (
              <Card key={q.questionId}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start gap-2 text-base font-medium">
                    {q.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    )}
                    {q.stem}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ul className="space-y-1">
                    {q.options.map((opt, i) => {
                      const key = String.fromCharCode(65 + i);
                      const isCorrect = key === q.correctKey;
                      const isSelected = key === q.selectedKey;
                      return (
                        <li
                          key={key}
                          className={`rounded px-2 py-1 ${
                            isCorrect
                              ? "bg-emerald-50 text-emerald-900"
                              : isSelected
                                ? "bg-red-50 text-red-900"
                                : "text-slate-700"
                          }`}
                        >
                          <span className="font-medium">{key}.</span> {opt}
                        </li>
                      );
                    })}
                  </ul>
                  {q.explanation && (
                    <p className="rounded-md bg-slate-100 p-3 text-slate-700">{q.explanation}</p>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void load()}>Practice again</Button>
              <Button asChild variant="outline">
                <Link href="/mistakes">Mistake diary</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
