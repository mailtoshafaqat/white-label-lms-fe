"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  assessmentsApi,
  type QuizDto,
  type AttemptResultDto,
  type QuizQuestionDto,
} from "@/lib/api";
import { getSession } from "@/lib/auth";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function requiresScheduledAttempt(quiz: QuizDto): boolean {
  return (
    (quiz.timeLimitMinutes ?? 0) > 0 ||
    quiz.availableFromUtc !== null ||
    quiz.availableUntilUtc !== null
  );
}

export default function QuizPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = use(params);
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiresAtUtc, setExpiresAtUtc] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionDto[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AttemptResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshingResult, setRefreshingResult] = useState(false);

  const refreshResult = useCallback(async () => {
    if (!quiz) return;
    setRefreshingResult(true);
    setError(null);
    try {
      const data = await assessmentsApi.attemptResult(quiz.id);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh results");
    } finally {
      setRefreshingResult(false);
    }
  }, [quiz]);

  const loadQuiz = useCallback(async () => {
    const data = await assessmentsApi.topicQuiz(topicId);
    setQuiz(data);
    if (data.activeAttempt) {
      setAttemptId(data.activeAttempt.attemptId);
      setExpiresAtUtc(data.activeAttempt.expiresAtUtc);
      setQuestions(data.questions);
    } else if (!requiresScheduledAttempt(data)) {
      setQuestions(data.questions);
      setAttemptId(null);
      setExpiresAtUtc(null);
    } else {
      setQuestions([]);
      setAttemptId(null);
      setExpiresAtUtc(null);
    }
  }, [topicId]);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    loadQuiz()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [topicId, router, loadQuiz]);

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
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtUtc]);

  const submit = useCallback(async () => {
    if (!quiz || questions.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        selectedKey: answers[q.id] ?? "",
      }));
      setResult(await assessmentsApi.submit(quiz.id, payload, attemptId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [quiz, questions, answers, attemptId]);

  useEffect(() => {
    if (secondsLeft === 0 && !result && !submitting && questions.length > 0) {
      void submit();
    }
  }, [secondsLeft, result, submitting, questions.length, submit]);

  async function startTest() {
    if (!quiz) return;
    setStarting(true);
    setError(null);
    try {
      const started = await assessmentsApi.startAttempt(quiz.id);
      setAttemptId(started.attemptId);
      setExpiresAtUtc(started.expiresAtUtc);
      setQuestions(started.questions);
      setAnswers({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start test");
    } finally {
      setStarting(false);
    }
  }

  function availabilityMessage(data: QuizDto): string {
    if (data.availabilityStatus === "NotYetOpen" && data.availableFromUtc) {
      return `This test opens on ${new Date(data.availableFromUtc).toLocaleString()}.`;
    }
    if (data.availabilityStatus === "Closed" && data.availableUntilUtc) {
      return `This test closed on ${new Date(data.availableUntilUtc).toLocaleString()}.`;
    }
    if (data.availabilityStatus === "NotYetOpen") return "This test is not open yet.";
    if (data.availabilityStatus === "Closed") return "This test is no longer available.";
    return "";
  }

  const inProgress = questions.length > 0 && !result;
  const scheduled = quiz ? requiresScheduledAttempt(quiz) : false;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Link href={`/topic/${topicId}`} className="text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-slate-900">{quiz?.title ?? "Practice test"}</span>
        </div>
        {inProgress && secondsLeft !== null && (
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
              secondsLeft <= 60 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatCountdown(secondsLeft)}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {result ? (
          <div>
            {result.resultsVisible ? (
              <>
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
                    {result.showExplanations && q.explanation && (
                      <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                        {q.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
              </>
            ) : (
              <Card className="mb-6">
                <CardContent className="space-y-4 pt-6 text-center">
                  <p className="text-lg font-medium text-slate-800">Answers submitted</p>
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

            <div className="mt-6 flex gap-3">
              {quiz?.availabilityStatus === "Open" && result.resultsVisible && (
                <Button
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    if (scheduled) {
                      setQuestions([]);
                      setAttemptId(null);
                      setExpiresAtUtc(null);
                    }
                  }}
                  variant="outline"
                >
                  {scheduled ? "Take again" : "Retry"}
                </Button>
              )}
              <Button asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        ) : (
          quiz && (
            <div>
              {(quiz.timeLimitMinutes || quiz.availableFromUtc || quiz.availableUntilUtc) && (
                <Card className="mb-4 border-slate-200 bg-slate-50/80">
                  <CardContent className="space-y-1 pt-4 text-sm text-slate-600">
                    {quiz.timeLimitMinutes ? (
                      <p>
                        <strong>Time limit:</strong> {quiz.timeLimitMinutes} minutes once you start
                      </p>
                    ) : null}
                    {quiz.availableFromUtc ? (
                      <p>
                        <strong>Opens:</strong> {new Date(quiz.availableFromUtc).toLocaleString()}
                      </p>
                    ) : null}
                    {quiz.availableUntilUtc ? (
                      <p>
                        <strong>Closes:</strong> {new Date(quiz.availableUntilUtc).toLocaleString()}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {quiz.availabilityStatus !== "Open" ? (
                <Card>
                  <CardContent className="pt-6 text-center text-slate-600">
                    {availabilityMessage(quiz)}
                  </CardContent>
                </Card>
              ) : scheduled && questions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-slate-600">
                      Click start when you are ready. The timer begins immediately.
                    </p>
                    <Button className="mt-4" onClick={() => void startTest()} disabled={starting}>
                      {starting ? "Starting…" : "Start test"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  <div className="space-y-4">
                    {questions.map((q, idx) => (
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
                  <Button
                    className="mt-6"
                    onClick={() => void submit()}
                    disabled={submitting || secondsLeft === 0}
                  >
                    {submitting ? "Submitting…" : "Submit answers"}
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}
