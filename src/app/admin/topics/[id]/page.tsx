"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  Trash2,
  Video,
  FileText,
  ClipboardList,
  Layers,
  X,
  Brain,
  BarChart3,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminApi,
  mentorApi,
  type LectureDto,
  type NoteDto,
  type AdminQuestionDto,
  type FlashcardDto,
  type QuizAnalyticsDto,
  type ResultVisibilityMode,
  type McqImportPreviewDto,
  type McqImportRowInput,
} from "@/lib/api";
import { downloadMcqTemplate, parseMcqCsv } from "@/lib/mcq-csv";
import { getSession, isAdmin } from "@/lib/auth";

type QuestionForm = {
  stem: string;
  options: string[];
  correctKey: string;
  explanation: string;
  isPyq: boolean;
  pyqYear: string;
  pyqExam: string;
};

type McqTab = "questions" | "analytics" | "import";

type CardForm = { front: string; back: string };

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

function reorder<T extends { id: string }>(items: T[], id: string, dir: -1 | 1): T[] {
  const idx = items.findIndex((x) => x.id === id);
  const next = idx + dir;
  if (idx < 0 || next < 0 || next >= items.length) return items;
  const copy = [...items];
  [copy[idx], copy[next]] = [copy[next], copy[idx]];
  return copy;
}

export default function AdminTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = use(params);
  const router = useRouter();

  const [lectures, setLectures] = useState<LectureDto[]>([]);
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [questions, setQuestions] = useState<AdminQuestionDto[]>([]);
  const [cards, setCards] = useState<FlashcardDto[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [resultVisibility, setResultVisibility] = useState<ResultVisibilityMode>("Immediate");
  const [showExplanations, setShowExplanations] = useState(true);
  const [notifyBatchComplete, setNotifyBatchComplete] = useState(false);
  const [batchThreshold, setBatchThreshold] = useState("80");
  const [resultsPublishedAtUtc, setResultsPublishedAtUtc] = useState<string | null>(null);
  const [publishingResults, setPublishingResults] = useState(false);
  const [savingQuizSettings, setSavingQuizSettings] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [editingQuizTitle, setEditingQuizTitle] = useState(false);
  const [editingDeckTitle, setEditingDeckTitle] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [indexMsg, setIndexMsg] = useState<string | null>(null);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mcqTab, setMcqTab] = useState<McqTab>("questions");
  const [analytics, setAnalytics] = useState<QuizAnalyticsDto | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [mcqBulkImport, setMcqBulkImport] = useState(false);
  const [importPreview, setImportPreview] = useState<McqImportPreviewDto | null>(null);
  const [importRows, setImportRows] = useState<McqImportRowInput[]>([]);
  const [importBusy, setImportBusy] = useState(false);

  const [lec, setLec] = useState({ title: "", url: "" });
  const [note, setNote] = useState({ title: "", contentHtml: "" });
  const emptyQuestion = (): QuestionForm => ({
    stem: "",
    options: ["", "", "", ""],
    correctKey: "0",
    explanation: "",
    isPyq: false,
    pyqYear: "",
    pyqExam: "",
  });
  const [q, setQ] = useState<QuestionForm>(emptyQuestion);
  const [editQ, setEditQ] = useState<QuestionForm>(emptyQuestion);
  const [card, setCard] = useState<CardForm>({ front: "", back: "" });
  const [editCard, setEditCard] = useState<CardForm>({ front: "", back: "" });

  useEffect(() => {
    const session = getSession();
    if (!session) return router.replace("/login");
    if (!isAdmin(session)) return router.replace("/dashboard");

    Promise.all([
      adminApi.topicContent(topicId),
      adminApi.quiz(topicId),
      adminApi.deck(topicId),
      adminApi.getBranding().catch(() => null),
    ])
      .then(([content, quiz, deck, branding]) => {
        if (branding) setMcqBulkImport(branding.mcqBulkImportEnabled);
        setLectures(content.lectures);
        setNotes(content.notes);
        setQuestions(quiz?.questions ?? []);
        setQuizTitle(quiz?.title ?? "Quiz");
        setTimeLimitMinutes(
          quiz?.timeLimitMinutes != null ? String(quiz.timeLimitMinutes) : ""
        );
        setAvailableFrom(toDatetimeLocal(quiz?.availableFromUtc ?? null));
        setAvailableUntil(toDatetimeLocal(quiz?.availableUntilUtc ?? null));
        setResultVisibility(quiz?.resultVisibility ?? "Immediate");
        setShowExplanations(quiz?.showExplanations ?? true);
        setNotifyBatchComplete(quiz?.notifyTeachersOnBatchComplete ?? false);
        setBatchThreshold(String(quiz?.batchCompleteThresholdPercent ?? 80));
        setResultsPublishedAtUtc(quiz?.resultsPublishedAtUtc ?? null);
        setCards(deck?.cards ?? []);
        setDeckTitle(deck?.title ?? "Flashcards");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [topicId, router]);

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : "Action failed");
  }

  function startEditQuestion(qq: AdminQuestionDto) {
    setEditingQuestionId(qq.id);
    setEditQ({
      stem: qq.stem,
      options: [...qq.options],
      correctKey: qq.correctKey,
      explanation: qq.explanation ?? "",
      isPyq: qq.isPyq,
      pyqYear: qq.pyqYear != null ? String(qq.pyqYear) : "",
      pyqExam: qq.pyqExam ?? "",
    });
  }

  useEffect(() => {
    if (mcqTab !== "analytics" || questions.length === 0) return;
    setAnalyticsLoading(true);
    adminApi
      .quizAnalytics(topicId)
      .then(setAnalytics)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"))
      .finally(() => setAnalyticsLoading(false));
  }, [mcqTab, topicId, questions.length]);

  function startEditCard(c: FlashcardDto) {
    setEditingCardId(c.id);
    setEditCard({ front: c.front, back: c.back });
  }

  async function saveQuizTitle() {
    try {
      await adminApi.updateQuizTitle(topicId, quizTitle.trim());
      setEditingQuizTitle(false);
      setError(null);
    } catch (e) {
      fail(e);
    }
  }

  async function saveQuizSettings() {
    if (questions.length === 0) {
      setError("Add at least one question before setting schedule.");
      return;
    }
    setSavingQuizSettings(true);
    setScheduleMsg(null);
    try {
      const parsedLimit = timeLimitMinutes.trim() ? Number(timeLimitMinutes) : null;
      if (parsedLimit !== null && (!Number.isFinite(parsedLimit) || parsedLimit < 1)) {
        setError("Time limit must be at least 1 minute, or left empty.");
        return;
      }
      await adminApi.updateQuizSettings(topicId, {
        timeLimitMinutes: parsedLimit,
        availableFromUtc: fromDatetimeLocal(availableFrom),
        availableUntilUtc: fromDatetimeLocal(availableUntil),
        resultVisibility,
        showExplanations,
        notifyTeachersOnBatchComplete: notifyBatchComplete,
        batchCompleteThresholdPercent: Number(batchThreshold) || 80,
      });
      setError(null);
      setScheduleMsg("Schedule and result settings saved.");
    } catch (e) {
      fail(e);
    } finally {
      setSavingQuizSettings(false);
    }
  }

  async function publishResults() {
    setPublishingResults(true);
    try {
      const updated = await adminApi.publishQuizResults(topicId);
      setResultsPublishedAtUtc(updated.resultsPublishedAtUtc);
      setError(null);
    } catch (e) {
      fail(e);
    } finally {
      setPublishingResults(false);
    }
  }

  async function saveDeckTitle() {
    try {
      await adminApi.updateDeckTitle(topicId, deckTitle.trim());
      setEditingDeckTitle(false);
      setError(null);
    } catch (e) {
      fail(e);
    }
  }

  async function moveQuestion(id: string, dir: -1 | 1) {
    const next = reorder(questions, id, dir);
    if (next === questions) return;
    try {
      await adminApi.reorderQuestions(
        topicId,
        next.map((x) => x.id)
      );
      setQuestions(next);
      setError(null);
    } catch (e) {
      fail(e);
    }
  }

  async function moveCard(id: string, dir: -1 | 1) {
    const next = reorder(cards, id, dir);
    if (next === cards) return;
    try {
      await adminApi.reorderCards(
        topicId,
        next.map((x) => x.id)
      );
      setCards(next);
      setError(null);
    } catch (e) {
      fail(e);
    }
  }

  async function indexForMentor() {
    setIndexing(true);
    setIndexMsg(null);
    setError(null);
    try {
      const res = await mentorApi.ingestTopic(topicId);
      setIndexMsg(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Index failed");
    } finally {
      setIndexing(false);
    }
  }

  const field = "h-9 w-full rounded-md border border-slate-300 px-2 text-sm";

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/admin" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Edit topic content</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={indexing}
          onClick={indexForMentor}
        >
          <Brain className="h-4 w-4" />
          {indexing ? "Indexing…" : "Re-index notes (auto on save)"}
        </Button>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {indexMsg && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{indexMsg}</p>}
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && <p className="text-slate-500">Loading…</p>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4 text-[var(--brand)]" /> Lectures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lectures.map((l) => (
              <div key={l.id} className="flex items-center gap-2 text-sm">
                <span className="text-slate-700">{l.title}</span>
                <span className="truncate text-xs text-slate-400">{l.url}</span>
                <button
                  className="ml-auto text-slate-300 hover:text-red-600"
                  onClick={async () => {
                    try {
                      await adminApi.deleteLecture(l.id);
                      setLectures((p) => p.filter((x) => x.id !== l.id));
                    } catch (e) {
                      fail(e);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={lec.title}
                onChange={(e) => setLec({ ...lec, title: e.target.value })}
                placeholder="Lecture title"
                className={field}
              />
              <input
                value={lec.url}
                onChange={(e) => setLec({ ...lec, url: e.target.value })}
                placeholder="Video URL (mp4/HLS)"
                className={field}
              />
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!lec.title.trim()) return;
                try {
                  const created = await adminApi.addLecture(topicId, {
                    title: lec.title.trim(),
                    url: lec.url.trim(),
                    durationSec: 0,
                    order: lectures.length + 1,
                  });
                  setLectures((p) => [...p, created]);
                  setLec({ title: "", url: "" });
                } catch (e) {
                  fail(e);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add lecture
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-[var(--brand)]" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="flex items-center gap-2 text-sm">
                <span className="text-slate-700">{n.title}</span>
                <button
                  className="ml-auto text-slate-300 hover:text-red-600"
                  onClick={async () => {
                    try {
                      await adminApi.deleteNote(n.id);
                      setNotes((p) => p.filter((x) => x.id !== n.id));
                    } catch (e) {
                      fail(e);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <input
              value={note.title}
              onChange={(e) => setNote({ ...note, title: e.target.value })}
              placeholder="Note title"
              className={field}
            />
            <textarea
              value={note.contentHtml}
              onChange={(e) => setNote({ ...note, contentHtml: e.target.value })}
              placeholder="Note content (HTML allowed)"
              rows={3}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <Button
              size="sm"
              onClick={async () => {
                if (!note.title.trim()) return;
                try {
                  const created = await adminApi.addNote(topicId, {
                    title: note.title.trim(),
                    contentHtml: note.contentHtml,
                    order: notes.length + 1,
                  });
                  setNotes((p) => [...p, created]);
                  setNote({ title: "", contentHtml: "" });
                } catch (e) {
                  fail(e);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add note
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-[var(--brand)]" /> MCQs
              </CardTitle>
              {editingQuizTitle ? (
                <div className="ml-auto flex items-center gap-2">
                  <input
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="h-8 rounded-md border border-slate-300 px-2 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => void saveQuizTitle()}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingQuizTitle(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ml-auto flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                  onClick={() => setEditingQuizTitle(true)}
                >
                  <span>{quizTitle}</span>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "questions",
                  ...(mcqBulkImport ? (["import"] as const) : []),
                  "analytics",
                ] as McqTab[]
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMcqTab(t)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                    mcqTab === t
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {t === "analytics" ? (
                    <span className="inline-flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" /> Analytics
                    </span>
                  ) : t === "import" ? (
                    <span className="inline-flex items-center gap-1">
                      <Upload className="h-3.5 w-3.5" /> Import CSV
                    </span>
                  ) : (
                    "Questions"
                  )}
                </button>
              ))}
            </div>

            {mcqTab === "import" ? (
              <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">
                  Upload a CSV with columns: stem, option_a–d, correct (A–D), explanation,
                  is_pyq, pyq_year, pyq_exam. Teachers and institute admins on this subject
                  can import; pricing stays with institute admin.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={downloadMcqTemplate}>
                    Download template
                  </Button>
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
                    <Upload className="mr-1 h-3.5 w-3.5" /> Choose CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const text = await file.text();
                        const rows = parseMcqCsv(text);
                        setImportRows(rows);
                        setImportPreview(null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    disabled={importRows.length === 0 || importBusy}
                    onClick={async () => {
                      setImportBusy(true);
                      try {
                        setImportPreview(
                          await adminApi.previewMcqImport(topicId, importRows)
                        );
                        setError(null);
                      } catch (err) {
                        fail(err);
                      } finally {
                        setImportBusy(false);
                      }
                    }}
                  >
                    {importBusy ? "Validating…" : "Validate & preview"}
                  </Button>
                </div>
                {importPreview && (
                  <>
                    <p className="text-sm text-slate-700">
                      {importPreview.validCount} valid · {importPreview.invalidCount} with
                      errors (of {importPreview.totalRows})
                    </p>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {importPreview.rows.map((row) => (
                        <div
                          key={row.rowNumber}
                          className={`rounded border p-2 text-xs ${
                            row.isValid
                              ? "border-emerald-200 bg-white"
                              : "border-red-200 bg-red-50"
                          }`}
                        >
                          <p className="font-medium">
                            Row {row.rowNumber}: {row.row.stem.slice(0, 80)}
                            {row.row.stem.length > 80 ? "…" : ""}
                          </p>
                          {!row.isValid && (
                            <p className="mt-1 text-red-700">{row.errors.join(" ")}</p>
                          )}
                          {row.isValid && (
                            <input
                              className="mt-1 w-full rounded border border-slate-200 px-2 py-1"
                              value={row.row.stem}
                              onChange={(e) => {
                                const stem = e.target.value;
                                setImportRows((prev) =>
                                  prev.map((r, i) =>
                                    i === row.rowNumber - 1 ? { ...r, stem } : r
                                  )
                                );
                                setImportPreview(null);
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        !importPreview ||
                        importPreview.invalidCount > 0 ||
                        importBusy
                      }
                      onClick={async () => {
                        setImportBusy(true);
                        try {
                          const result = await adminApi.importMcq(topicId, importRows);
                          setQuestions((p) => [...p, ...result.questions]);
                          setImportPreview(null);
                          setImportRows([]);
                          setMcqTab("questions");
                          setError(null);
                        } catch (err) {
                          fail(err);
                        } finally {
                          setImportBusy(false);
                        }
                      }}
                    >
                      Import {importPreview.validCount} questions
                    </Button>
                  </>
                )}
              </div>
            ) : mcqTab === "analytics" ? (
              analyticsLoading ? (
                <p className="text-sm text-slate-500">Loading analytics…</p>
              ) : !analytics || analytics.questions.length === 0 ? (
                <p className="text-sm text-slate-500">No attempt data yet.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    {analytics.totalAttempts} total attempt
                    {analytics.totalAttempts === 1 ? "" : "s"} · hardest questions first
                  </p>
                  {analytics.questions.map((row, i) => (
                    <div key={row.questionId} className="rounded-md border border-slate-100 p-3 text-sm">
                      <p className="font-medium text-slate-800">
                        {i + 1}. {row.stem.slice(0, 120)}
                        {row.stem.length > 120 ? "…" : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.attemptCount} attempts · {row.wrongPercentage}% wrong ({row.wrongCount})
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Test schedule
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Set how long students have to finish and when the test is open (e.g. 30 min timer,
                available for 1 day).
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Time limit (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(e.target.value)}
                    placeholder="e.g. 30"
                    className={field}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Available from
                  </label>
                  <input
                    type="datetime-local"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Available until
                  </label>
                  <input
                    type="datetime-local"
                    value={availableUntil}
                    onChange={(e) => setAvailableUntil(e.target.value)}
                    className={field}
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Result visibility
                  </label>
                  <select
                    value={resultVisibility}
                    onChange={(e) => setResultVisibility(e.target.value as ResultVisibilityMode)}
                    className={field}
                  >
                    <option value="Immediate">Immediate (practice default)</option>
                    <option value="AfterClose">After test window closes</option>
                    <option value="ManualPublish">Manual publish by teacher</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-2 text-xs text-slate-600">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showExplanations}
                      onChange={(e) => setShowExplanations(e.target.checked)}
                    />
                    Show explanations when results are visible
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notifyBatchComplete}
                      onChange={(e) => setNotifyBatchComplete(e.target.checked)}
                    />
                    Email teachers when batch completes
                  </label>
                </div>
              </div>
              {notifyBatchComplete && (
                <div className="mt-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Batch complete threshold (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batchThreshold}
                    onChange={(e) => setBatchThreshold(e.target.value)}
                    className={`${field} max-w-[8rem]`}
                  />
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingQuizSettings || questions.length === 0}
                  onClick={() => void saveQuizSettings()}
                >
                  {savingQuizSettings ? "Saving…" : "Save schedule"}
                </Button>
                {resultVisibility === "ManualPublish" && (
                  <Button
                    size="sm"
                    disabled={publishingResults || questions.length === 0}
                    onClick={() => void publishResults()}
                  >
                    {publishingResults
                      ? "Publishing…"
                      : resultsPublishedAtUtc
                        ? "Republish results"
                        : "Publish results"}
                  </Button>
                )}
                {resultsPublishedAtUtc && (
                  <span className="text-xs text-slate-500">
                    Last published {new Date(resultsPublishedAtUtc).toLocaleString()}
                  </span>
                )}
              </div>
              {scheduleMsg && (
                <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {scheduleMsg}
                </p>
              )}
            </div>

            {questions.map((qq, i) => (
              <div key={qq.id} className="rounded-md border border-slate-100 p-3">
                {editingQuestionId === qq.id ? (
                  <div className="space-y-2">
                    <input
                      value={editQ.stem}
                      onChange={(e) => setEditQ({ ...editQ, stem: e.target.value })}
                      className={field}
                    />
                    {editQ.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={editQ.correctKey === String(idx)}
                          onChange={() => setEditQ({ ...editQ, correctKey: String(idx) })}
                        />
                        <input
                          value={opt}
                          onChange={(e) => {
                            const options = [...editQ.options];
                            options[idx] = e.target.value;
                            setEditQ({ ...editQ, options });
                          }}
                          className={`${field} flex-1`}
                        />
                      </div>
                    ))}
                    <input
                      value={editQ.explanation}
                      onChange={(e) => setEditQ({ ...editQ, explanation: e.target.value })}
                      placeholder="Explanation"
                      className={field}
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={editQ.isPyq}
                        onChange={(e) => setEditQ({ ...editQ, isPyq: e.target.checked })}
                      />
                      PYQ (past year question)
                    </label>
                    {editQ.isPyq && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="number"
                          value={editQ.pyqYear}
                          onChange={(e) => setEditQ({ ...editQ, pyqYear: e.target.value })}
                          placeholder="Year (e.g. 2023)"
                          className={field}
                        />
                        <input
                          value={editQ.pyqExam}
                          onChange={(e) => setEditQ({ ...editQ, pyqExam: e.target.value })}
                          placeholder="Exam (e.g. MDCAT)"
                          className={field}
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const updated = await adminApi.updateQuestion(qq.id, {
                              stem: editQ.stem.trim(),
                              options: editQ.options.map((o) => o.trim()),
                              correctKey: editQ.correctKey,
                              explanation: editQ.explanation.trim() || null,
                              isPyq: editQ.isPyq,
                              pyqYear: editQ.isPyq && editQ.pyqYear ? Number(editQ.pyqYear) : null,
                              pyqExam: editQ.isPyq ? editQ.pyqExam.trim() || null : null,
                            });
                            setQuestions((p) => p.map((x) => (x.id === qq.id ? updated : x)));
                            setEditingQuestionId(null);
                            setError(null);
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingQuestionId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-slate-700">
                      {i + 1}. {qq.stem}{" "}
                      <span className="text-xs text-green-600">
                        (ans: {qq.options[Number(qq.correctKey)]})
                      </span>
                      {qq.isPyq && (
                        <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          PYQ{qq.pyqYear ? ` ${qq.pyqYear}` : ""}
                          {qq.pyqExam ? ` · ${qq.pyqExam}` : ""}
                        </span>
                      )}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        disabled={i === 0}
                        onClick={() => void moveQuestion(qq.id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        disabled={i === questions.length - 1}
                        onClick={() => void moveQuestion(qq.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        onClick={() => startEditQuestion(qq)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-300 hover:text-red-600"
                        onClick={async () => {
                          try {
                            await adminApi.deleteQuestion(qq.id);
                            setQuestions((p) => p.filter((x) => x.id !== qq.id));
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="space-y-2 rounded-md bg-slate-50 p-3">
              <input
                value={q.stem}
                onChange={(e) => setQ({ ...q, stem: e.target.value })}
                placeholder="Question stem"
                className={field}
              />
              {q.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={q.correctKey === String(idx)}
                    onChange={() => setQ({ ...q, correctKey: String(idx) })}
                    title="Mark correct"
                  />
                  <input
                    value={opt}
                    onChange={(e) => {
                      const options = [...q.options];
                      options[idx] = e.target.value;
                      setQ({ ...q, options });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="h-8 flex-1 rounded-md border border-slate-300 px-2 text-sm"
                  />
                </div>
              ))}
              <input
                value={q.explanation}
                onChange={(e) => setQ({ ...q, explanation: e.target.value })}
                placeholder="Explanation (optional)"
                className={field}
              />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={q.isPyq}
                  onChange={(e) => setQ({ ...q, isPyq: e.target.checked })}
                />
                PYQ (past year question)
              </label>
              {q.isPyq && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    value={q.pyqYear}
                    onChange={(e) => setQ({ ...q, pyqYear: e.target.value })}
                    placeholder="Year (e.g. 2023)"
                    className={field}
                  />
                  <input
                    value={q.pyqExam}
                    onChange={(e) => setQ({ ...q, pyqExam: e.target.value })}
                    placeholder="Exam (e.g. MDCAT)"
                    className={field}
                  />
                </div>
              )}
              <Button
                size="sm"
                onClick={async () => {
                  if (!q.stem.trim() || q.options.some((o) => !o.trim())) {
                    setError("Fill the stem and all four options.");
                    return;
                  }
                  try {
                    const created = await adminApi.addQuestion(topicId, {
                      stem: q.stem.trim(),
                      options: q.options.map((o) => o.trim()),
                      correctKey: q.correctKey,
                      explanation: q.explanation.trim(),
                      isPyq: q.isPyq,
                      pyqYear: q.isPyq && q.pyqYear ? Number(q.pyqYear) : null,
                      pyqExam: q.isPyq ? q.pyqExam.trim() || null : null,
                    });
                    setQuestions((p) => [...p, created]);
                    setQ(emptyQuestion());
                    setError(null);
                  } catch (e) {
                    fail(e);
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add question
              </Button>
            </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-[var(--brand)]" /> Flashcards
              </CardTitle>
              {editingDeckTitle ? (
                <div className="ml-auto flex items-center gap-2">
                  <input
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    className="h-8 rounded-md border border-slate-300 px-2 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => void saveDeckTitle()}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingDeckTitle(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ml-auto flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                  onClick={() => setEditingDeckTitle(true)}
                >
                  <span>{deckTitle}</span>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {cards.map((c, i) => (
              <div key={c.id} className="rounded-md border border-slate-100 p-3">
                {editingCardId === c.id ? (
                  <div className="space-y-2">
                    <input
                      value={editCard.front}
                      onChange={(e) => setEditCard({ ...editCard, front: e.target.value })}
                      placeholder="Front"
                      className={field}
                    />
                    <input
                      value={editCard.back}
                      onChange={(e) => setEditCard({ ...editCard, back: e.target.value })}
                      placeholder="Back"
                      className={field}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const updated = await adminApi.updateCard(c.id, {
                              front: editCard.front.trim(),
                              back: editCard.back.trim(),
                            });
                            setCards((p) => p.map((x) => (x.id === c.id ? updated : x)));
                            setEditingCardId(null);
                            setError(null);
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCardId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-700">{c.front}</span>
                    <span className="text-xs text-slate-400">→ {c.back}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        disabled={i === 0}
                        onClick={() => void moveCard(c.id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        disabled={i === cards.length - 1}
                        onClick={() => void moveCard(c.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        onClick={() => startEditCard(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-300 hover:text-red-600"
                        onClick={async () => {
                          try {
                            await adminApi.deleteCard(c.id);
                            setCards((p) => p.filter((x) => x.id !== c.id));
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={card.front}
                onChange={(e) => setCard({ ...card, front: e.target.value })}
                placeholder="Front (question)"
                className={field}
              />
              <input
                value={card.back}
                onChange={(e) => setCard({ ...card, back: e.target.value })}
                placeholder="Back (answer)"
                className={field}
              />
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!card.front.trim() || !card.back.trim()) return;
                try {
                  const created = await adminApi.addCard(topicId, {
                    front: card.front.trim(),
                    back: card.back.trim(),
                  });
                  setCards((p) => [...p, created]);
                  setCard({ front: "", back: "" });
                } catch (e) {
                  fail(e);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add flashcard
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

