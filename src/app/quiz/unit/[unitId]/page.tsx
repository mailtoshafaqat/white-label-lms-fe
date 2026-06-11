"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { McqAttemptView } from "@/components/assessment/mcq-attempt-view";
import {
  assessmentsApi,
  type QuizDto,
  type AttemptResultDto,
  type QuizQuestionDto,
  type QuestionDifficulty,
} from "@/lib/api";
import { getSession } from "@/lib/auth";
import { requiresStartAttempt, toggleFlagged } from "@/lib/quiz-attempt";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type UnitQuizMode = "unit-test" | "pyq-test";

export default function UnitQuizPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = use(params);
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") === "pyq" ? "pyq-test" : "unit-test") as UnitQuizMode;
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiresAtUtc, setExpiresAtUtc] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionDto[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "">("");
  const [result, setResult] = useState<AttemptResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshingResult, setRefreshingResult] = useState(false);

  const loadQuiz = useCallback(async () => {
    try {
      const data = await assessmentsApi.unitQuiz(unitId, mode, difficulty || undefined);
      setQuiz(data);
      if (data.activeAttempt) {
        setAttemptId(data.activeAttempt.attemptId);
        setExpiresAtUtc(data.activeAttempt.expiresAtUtc);
        setQuestions(data.questions);
        setFlagged(new Set(data.flaggedQuestionIds));
      } else {
        setQuestions([]);
        setAttemptId(null);
        setExpiresAtUtc(null);
        setFlagged(new Set());
      }
    } catch (e) {
      if (mode === "pyq-test" && e instanceof Error && e.message.includes("404")) {
        setError("PYQ test is not configured for this unit yet. Ask your teacher to enable it in Admin.");
      } else if (mode === "unit-test" && e instanceof Error && e.message.includes("404")) {
        setError("Unit test is not configured for this unit yet. Ask your teacher to enable it in Admin.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
      setQuiz(null);
    }
  }, [unitId, mode, difficulty]);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setResult(null);
    loadQuiz().finally(() => setLoading(false));
  }, [unitId, mode, router, loadQuiz]);

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
    if (!quiz || questions.length === 0 || !attemptId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        selectedKey: answers[q.id] ?? "",
      }));
      setResult(
        await assessmentsApi.submit(quiz.id, payload, attemptId, Array.from(flagged))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [quiz, questions, answers, attemptId, flagged]);

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
      setFlagged(new Set(started.flaggedQuestionIds));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start test");
    } finally {
      setStarting(false);
    }
  }

  const refreshResult = useCallback(async () => {
    if (!quiz) return;
    setRefreshingResult(true);
    try {
      setResult(await assessmentsApi.attemptResult(quiz.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh results");
    } finally {
      setRefreshingResult(false);
    }
  }, [quiz]);

  const inProgress = questions.length > 0 && !result;
  const showDifficultyFilter =
    quiz && !quiz.difficultyFilter && quiz.availableDifficulties.length > 1 && !inProgress && !result;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-slate-900">
            {quiz?.title ?? (mode === "pyq-test" ? "PYQ Test" : "Unit Test")}
          </span>
        </div>
        {inProgress && secondsLeft !== null && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            <Clock className="h-4 w-4" />
            {formatCountdown(secondsLeft)}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex gap-2">
          <Button asChild variant={mode === "unit-test" ? "default" : "outline"} size="sm">
            <Link href={`/quiz/unit/${unitId}?mode=unit`}>Unit test</Link>
          </Button>
          <Button asChild variant={mode === "pyq-test" ? "default" : "outline"} size="sm">
            <Link href={`/quiz/unit/${unitId}?mode=pyq`}>PYQ test</Link>
          </Button>
        </div>

        {loading && <p className="text-slate-500">Loading…</p>}
        {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {showDifficultyFilter && (
          <Card className="mb-4 border-slate-200 bg-slate-50/80">
            <CardContent className="flex flex-wrap items-center gap-3 pt-4 text-sm">
              <span className="font-medium text-slate-700">Difficulty filter</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty | "")}
                className="rounded-md border border-slate-200 px-2 py-1"
              >
                <option value="">All difficulties</option>
                {quiz.availableDifficulties.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

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
                  </Card>
                ))}
              </>
            ) : (
              <Card className="mb-6">
                <CardContent className="space-y-4 pt-6 text-center">
                  <p className="text-lg font-medium">Submitted</p>
                  <p className="text-sm text-slate-600">{result.resultsMessage}</p>
                  <Button variant="outline" onClick={() => void refreshResult()} disabled={refreshingResult}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshingResult ? "animate-spin" : ""}`} />
                    Check for results
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : quiz ? (
          quiz.availabilityStatus !== "Open" ? (
            <Card>
              <CardContent className="pt-6 text-center text-slate-600">
                This test is not open ({quiz.availabilityStatus}).
              </CardContent>
            </Card>
          ) : inProgress ? (
            <McqAttemptView
              questions={questions}
              answers={answers}
              onAnswer={(questionId, key) =>
                setAnswers((a) => ({ ...a, [questionId]: key }))
              }
              flagged={flagged}
              onToggleFlag={(questionId) =>
                setFlagged((prev) => toggleFlagged(prev, questionId))
              }
              onSubmit={() => void submit()}
              submitting={submitting}
              submitLabel="Submit test"
              disabled={secondsLeft === 0}
            />
          ) : (
            <Card>
              <CardContent className="space-y-3 pt-6 text-center">
                <p className="text-slate-600">
                  {quiz.difficultyFilter
                    ? `${quiz.difficultyFilter} questions only`
                    : "All topic MCQs in this unit"}
                  {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ""}
                </p>
                <Button onClick={() => void startTest()} disabled={starting}>
                  {starting ? "Starting…" : quiz.activeAttempt ? "Resume test" : "Start test"}
                </Button>
              </CardContent>
            </Card>
          )
        ) : null}
      </main>
    </div>
  );
}
