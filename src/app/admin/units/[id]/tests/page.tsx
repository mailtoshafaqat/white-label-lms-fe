"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminApi,
  type AdminUnitQuizDto,
  type QuestionDifficulty,
  type ResultVisibilityMode,
} from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

type QuizTab = "unit-test" | "pyq-test";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  return new Date(value).toISOString();
}

function UnitQuizSettingsForm({
  unitId,
  quizType,
  title,
}: {
  unitId: string;
  quizType: QuizTab;
  title: string;
}) {
  const [quiz, setQuiz] = useState<AdminUnitQuizDto | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [resultVisibility, setResultVisibility] = useState<ResultVisibilityMode>("Immediate");
  const [showExplanations, setShowExplanations] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<QuestionDifficulty | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .unitQuiz(unitId, quizType)
      .then((data) => {
        setQuiz(data);
        setTimeLimitMinutes(data.timeLimitMinutes != null ? String(data.timeLimitMinutes) : "");
        setAvailableFrom(toDatetimeLocal(data.availableFromUtc));
        setAvailableUntil(toDatetimeLocal(data.availableUntilUtc));
        setResultVisibility(data.resultVisibility);
        setShowExplanations(data.showExplanations);
        setDifficultyFilter(data.difficultyFilter ?? "");
      })
      .catch(() => {
        setQuiz(null);
      })
      .finally(() => setLoading(false));
  }, [unitId, quizType]);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const parsedLimit = timeLimitMinutes.trim() ? Number(timeLimitMinutes) : null;
      const updated = await adminApi.updateUnitQuizSettings(unitId, quizType, {
        timeLimitMinutes: parsedLimit,
        availableFromUtc: fromDatetimeLocal(availableFrom),
        availableUntilUtc: fromDatetimeLocal(availableUntil),
        resultVisibility,
        showExplanations,
        difficultyFilter: difficultyFilter || null,
      });
      setQuiz(updated);
      setMessage("Settings saved. Students can start this test from the unit tests page.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          {quizType === "pyq-test"
            ? "Assembles past-year (PYQ) MCQs from all topics in this unit."
            : "Assembles all topic MCQs in this unit into one test."}{" "}
          {quiz ? (
            <strong>{quiz.assembledQuestionCount} questions</strong>
          ) : (
            <span>Save settings to enable — question count appears after topics have MCQs.</span>
          )}
        </p>
        {quiz && (
          <p className="text-xs text-slate-500">
            Student URL:{" "}
            <Link
              href={`/quiz/unit/${unitId}?mode=${quizType === "pyq-test" ? "pyq" : "unit"}`}
              className="text-[var(--brand)] hover:underline"
            >
              /quiz/unit/{unitId}?mode={quizType === "pyq-test" ? "pyq" : "unit"}
            </Link>
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Time limit (min)</label>
            <input
              type="number"
              min={1}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Opens</label>
            <input
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Closes</label>
            <input
              type="datetime-local"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Difficulty filter</label>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as QuestionDifficulty | "")}
              className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="">All difficulties</option>
              <option value="Easy">Easy only</option>
              <option value="Medium">Medium only</option>
              <option value="Hard">Hard only</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Result visibility</label>
            <select
              value={resultVisibility}
              onChange={(e) => setResultVisibility(e.target.value as ResultVisibilityMode)}
              className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="Immediate">Immediate</option>
              <option value="AfterClose">After close</option>
              <option value="ManualPublish">Manual publish</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showExplanations}
            onChange={(e) => setShowExplanations(e.target.checked)}
          />
          Show explanations when results are visible
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <Button size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : quiz ? "Save settings" : "Enable test"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminUnitTestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: unitId } = use(params);
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) return router.replace("/login");
    if (!isAdmin(session)) return router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/admin" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Unit tests</span>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <UnitQuizSettingsForm unitId={unitId} quizType="unit-test" title="Unit test" />
        <UnitQuizSettingsForm unitId={unitId} quizType="pyq-test" title="PYQ test (past-year only)" />
      </main>
    </div>
  );
}
