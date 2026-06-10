"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminApi,
  coursesApi,
  type AdminMockExamDto,
  type AssignedSubjectDto,
  type ResultVisibilityMode,
  type TopicDto,
} from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminMockExamsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<AssignedSubjectDto[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [exams, setExams] = useState<AdminMockExamDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [resultVisibility, setResultVisibility] = useState<ResultVisibilityMode>("AfterClose");
  const [showExplanations, setShowExplanations] = useState(true);
  const [notifyBatchComplete, setNotifyBatchComplete] = useState(true);
  const [batchThreshold, setBatchThreshold] = useState("80");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/dashboard");
      return;
    }
    adminApi
      .mySubjects()
      .then((subs) => {
        setSubjects(subs);
        if (subs.length > 0) setSubjectId(subs[0].subjectId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!subjectId) return;
    adminApi.listMockExams(subjectId).then(setExams).catch(() => setExams([]));
    coursesApi.units(subjectId).then(async (units) => {
      const all: TopicDto[] = [];
      for (const u of units) {
        all.push(...(await coursesApi.topics(u.id)));
      }
      setTopics(all);
      setSelectedTopics({});
    });
  }, [subjectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const topicInputs = Object.entries(selectedTopics)
      .filter(([, count]) => count >= 0)
      .map(([topicId, questionCount]) => ({ topicId, questionCount }));
    if (topicInputs.length === 0) {
      setError("Select at least one topic.");
      return;
    }
    try {
      await adminApi.createMockExam({
        subjectId,
        title: title.trim(),
        description: description.trim() || null,
        timeLimitMinutes: Number(timeLimit),
        availableFromUtc: availableFrom ? new Date(availableFrom).toISOString() : null,
        availableUntilUtc: availableUntil ? new Date(availableUntil).toISOString() : null,
        isPublished,
        resultVisibility,
        showExplanations,
        notifyTeachersOnBatchComplete: notifyBatchComplete,
        batchCompleteThresholdPercent: Number(batchThreshold) || 80,
        topics: topicInputs,
      });
      setTitle("");
      setDescription("");
      setExams(await adminApi.listMockExams(subjectId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create mock exam");
    }
  }

  function startEditExam(exam: AdminMockExamDto) {
    setEditingExamId(exam.id);
    setTitle(exam.title);
    setDescription(exam.description ?? "");
    setTimeLimit(String(exam.timeLimitMinutes));
    setAvailableFrom(toDatetimeLocal(exam.availableFromUtc));
    setAvailableUntil(toDatetimeLocal(exam.availableUntilUtc));
    setIsPublished(exam.isPublished);
    setResultVisibility(exam.resultVisibility);
    setShowExplanations(exam.showExplanations);
    setNotifyBatchComplete(exam.notifyTeachersOnBatchComplete);
    setBatchThreshold(String(exam.batchCompleteThresholdPercent));
    const topicsMap: Record<string, number> = {};
    for (const t of exam.topics) topicsMap[t.topicId] = t.questionCount;
    setSelectedTopics(topicsMap);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExamId) return;
    const topicInputs = Object.entries(selectedTopics)
      .filter(([, count]) => count >= 0)
      .map(([topicId, questionCount]) => ({ topicId, questionCount }));
    if (topicInputs.length === 0) {
      setError("Select at least one topic.");
      return;
    }
    try {
      await adminApi.updateMockExam(editingExamId, {
        title: title.trim(),
        description: description.trim() || null,
        timeLimitMinutes: Number(timeLimit),
        availableFromUtc: availableFrom ? new Date(availableFrom).toISOString() : null,
        availableUntilUtc: availableUntil ? new Date(availableUntil).toISOString() : null,
        isPublished,
        resultVisibility,
        showExplanations,
        notifyTeachersOnBatchComplete: notifyBatchComplete,
        batchCompleteThresholdPercent: Number(batchThreshold) || 80,
        topics: topicInputs,
      });
      setEditingExamId(null);
      setTitle("");
      setDescription("");
      setExams(await adminApi.listMockExams(subjectId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update mock exam");
    }
  }

  async function publishExamResults(examId: string) {
    try {
      await adminApi.publishMockExamResults(examId);
      setExams(await adminApi.listMockExams(subjectId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish results");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ClipboardList className="h-6 w-6 text-[var(--brand)]" />
          Mock exams
        </h1>
        <p className="mt-1 text-slate-600">
          Build multi-topic timed exams from topic quiz questions.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-8 text-slate-500">Loading…</p>
        ) : subjects.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No subjects assigned.</p>
        ) : (
          <div className="mt-6 space-y-6">
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectTitle} ({s.bundleTitle})
                </option>
              ))}
            </select>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editingExamId ? "Edit mock exam" : "Create mock exam"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={editingExamId ? handleUpdate : handleCreate}>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Exam title"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    placeholder="Time limit (minutes)"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="datetime-local"
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="datetime-local"
                      value={availableUntil}
                      onChange={(e) => setAvailableUntil(e.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                    />
                    Published (visible to enrolled students)
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Result visibility
                      </label>
                      <select
                        value={resultVisibility}
                        onChange={(e) =>
                          setResultVisibility(e.target.value as ResultVisibilityMode)
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="Immediate">Immediate</option>
                        <option value="AfterClose">After window closes (default)</option>
                        <option value="ManualPublish">Manual publish</option>
                      </select>
                    </div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showExplanations}
                          onChange={(e) => setShowExplanations(e.target.checked)}
                        />
                        Show explanations
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={notifyBatchComplete}
                          onChange={(e) => setNotifyBatchComplete(e.target.checked)}
                        />
                        Email teachers on batch complete
                      </label>
                    </div>
                  </div>
                  {notifyBatchComplete && (
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={batchThreshold}
                      onChange={(e) => setBatchThreshold(e.target.value)}
                      placeholder="Batch threshold %"
                      className="w-full max-w-[10rem] rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  )}
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-xs font-medium text-slate-600">Topics (0 = all questions)</p>
                    <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm">
                      {topics.map((t) => (
                        <li key={t.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={t.id in selectedTopics}
                            onChange={(e) => {
                              setSelectedTopics((prev) => {
                                const next = { ...prev };
                                if (e.target.checked) next[t.id] = 0;
                                else delete next[t.id];
                                return next;
                              });
                            }}
                          />
                          <span className="flex-1">{t.title}</span>
                          {t.id in selectedTopics && (
                            <input
                              type="number"
                              min={0}
                              value={selectedTopics[t.id]}
                              onChange={(e) =>
                                setSelectedTopics((prev) => ({
                                  ...prev,
                                  [t.id]: Number(e.target.value),
                                }))
                              }
                              className="w-16 rounded border border-slate-300 px-1 text-xs"
                              title="Question count (0 = all)"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      <Plus className="h-4 w-4" /> {editingExamId ? "Save changes" : "Create exam"}
                    </Button>
                    {editingExamId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingExamId(null);
                          setTitle("");
                          setDescription("");
                          setSelectedTopics({});
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h2 className="font-semibold text-slate-900">Existing exams</h2>
              {exams.length === 0 ? (
                <p className="text-sm text-slate-500">No mock exams for this subject.</p>
              ) : (
                exams.map((exam) => (
                  <div key={exam.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{exam.title}</p>
                        <p className="text-xs text-slate-500">
                          {exam.timeLimitMinutes} min · {exam.topics.length} topics ·{" "}
                          {exam.isPublished ? "Published" : "Draft"} · {exam.resultVisibility}
                        </p>
                        {exam.availableFromUtc && (
                          <p className="text-xs text-slate-400">
                            {toDatetimeLocal(exam.availableFromUtc)} –{" "}
                            {exam.availableUntilUtc
                              ? toDatetimeLocal(exam.availableUntilUtc)
                              : "open"}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          className="text-xs text-[var(--brand)] hover:underline"
                          onClick={() => startEditExam(exam)}
                        >
                          Edit
                        </button>
                        {exam.resultVisibility === "ManualPublish" && (
                          <button
                            type="button"
                            className="text-xs text-slate-600 hover:underline"
                            onClick={() => void publishExamResults(exam.id)}
                          >
                            Publish results
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-slate-300 hover:text-red-600"
                          onClick={async () => {
                            await adminApi.deleteMockExam(exam.id);
                            setExams(await adminApi.listMockExams(subjectId));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
