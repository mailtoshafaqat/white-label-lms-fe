"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mockExamsApi,
  type MockExamAttemptResultDto,
  type MockExamQuestionDto,
  type MockExamSummaryDto,
} from "@/lib/api";
import { getSession } from "@/lib/auth";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MockExamAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [exam, setExam] = useState<MockExamSummaryDto | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiresAtUtc, setExpiresAtUtc] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MockExamQuestionDto[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MockExamAttemptResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingResult, setRefreshingResult] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    mockExamsApi
      .get(id)
      .then((data) => {
        setExam(data);
        if (data.activeAttempt) {
          setAttemptId(data.activeAttempt.attemptId);
          setExpiresAtUtc(data.activeAttempt.expiresAtUtc);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!expiresAtUtc) {
      setSecondsLeft(null);
      return;
    }
    function tick() {
      const left = Math.max(0, Math.floor((new Date(expiresAtUtc!).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAtUtc]);

  const refreshResult = useCallback(async () => {
    setRefreshingResult(true);
    setError(null);
    try {
      setResult(await mockExamsApi.attemptResult(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh results");
    } finally {
      setRefreshingResult(false);
    }
  }, [id]);

  const submit = useCallback(async () => {
    if (!attemptId || questions.length === 0) return;
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        selectedKey: answers[q.id] ?? "",
      }));
      setResult(await mockExamsApi.submit(id, payload, attemptId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [id, attemptId, questions, answers]);

  useEffect(() => {
    if (secondsLeft === 0 && !result && !submitting && questions.length > 0) {
      void submit();
    }
  }, [secondsLeft, result, submitting, questions.length, submit]);

  async function startTest() {
    setStarting(true);
    setError(null);
    try {
      const started = await mockExamsApi.startAttempt(id);
      setAttemptId(started.attemptId);
      setExpiresAtUtc(started.expiresAtUtc);
      setQuestions(started.questions);
      setAnswers({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start exam");
    } finally {
      setStarting(false);
    }
  }

  const inProgress = questions.length > 0 && !result;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/mock-exams" className="text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-slate-900">{exam?.title ?? "Mock exam"}</span>
        </div>
        {inProgress && secondsLeft !== null && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            <Clock className="h-4 w-4" />
            {formatCountdown(secondsLeft)}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {result ? (
          <div>
            {result.resultsVisible ? (
              <>
                <Card className="mb-6">
                  <CardContent className="pt-6 text-center">
                    <p className="text-4xl font-bold text-[var(--brand)]">
                      {result.score}/{result.total}
                    </p>
                  </CardContent>
                </Card>
                {result.questions.map((q, idx) => (
                  <Card key={q.questionId} className="mb-3">
                    <CardHeader>
                      <CardTitle className="flex gap-2 text-sm">
                        {q.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        {idx + 1}. {q.stem}
                      </CardTitle>
                    </CardHeader>
                    {result.showExplanations && q.explanation && (
                      <CardContent>
                        <p className="text-xs text-slate-600">{q.explanation}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </>
            ) : (
              <Card className="mb-6">
                <CardContent className="space-y-4 pt-6 text-center">
                  <p className="text-lg font-medium text-slate-800">Exam submitted</p>
                  <p className="text-sm text-slate-600">{result.resultsMessage}</p>
                  {result.resultsAvailableAtUtc && (
                    <p className="text-xs text-slate-500">
                      Expected after {new Date(result.resultsAvailableAtUtc).toLocaleString()}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => void refreshResult()}
                    disabled={refreshingResult}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshingResult ? "animate-spin" : ""}`} />
                    {refreshingResult ? "Checking…" : "Check for results"}
                  </Button>
                </CardContent>
              </Card>
            )}
            <Button asChild className="mt-4">
              <Link href="/mock-exams">Back to mock exams</Link>
            </Button>
          </div>
        ) : inProgress ? (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {idx + 1}. {q.stem}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {q.options.map((opt, i) => (
                    <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === String(i)}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: String(i) }))}
                      />
                      {opt}
                    </label>
                  ))}
                </CardContent>
              </Card>
            ))}
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit exam"}
            </Button>
          </div>
        ) : exam?.availabilityStatus === "Open" ? (
          <Card>
            <CardContent className="space-y-3 pt-6 text-center">
              <p className="text-slate-600">
                {exam.totalQuestions} questions · {exam.timeLimitMinutes} minutes
              </p>
              <Button onClick={() => void startTest()} disabled={starting}>
                {starting ? "Starting…" : exam.activeAttempt ? "Resume exam" : "Start exam"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-slate-600">
              This exam is not currently available ({exam?.availabilityStatus}).
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
