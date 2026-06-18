"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ArchiveRestore, ClipboardList, Plus, Trash2 } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { InfoTooltip } from "@/components/info-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminApi,
  coursesApi,
  type AdminMockExamDto,
  type AssignedSubjectDto,
  type MockExamLeaderboardDto,
  type MockExamSectionInput,
  type ResultVisibilityMode,
  type TopicDto,
} from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";
import { profileCohortLabel, profileEmailTeachersOnCohortComplete } from "@/lib/product-profile";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

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
  const [marksPerCorrect, setMarksPerCorrect] = useState("1");
  const [penaltyPerWrong, setPenaltyPerWrong] = useState("0");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [resultVisibility, setResultVisibility] = useState<ResultVisibilityMode>("AfterClose");
  const [showExplanations, setShowExplanations] = useState(true);
  const [notifyBatchComplete, setNotifyBatchComplete] = useState(true);
  const [batchThreshold, setBatchThreshold] = useState("80");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [sections, setSections] = useState<MockExamSectionInput[]>([
    { title: "Section 1", sortOrder: 1, topics: [] },
  ]);
  const [leaderboardExamId, setLeaderboardExamId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<MockExamLeaderboardDto | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const tenant = getSession()?.tenant;
  const cohortLabel = profileCohortLabel(tenant);

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
    adminApi
      .listMockExams(subjectId, showArchived)
      .then(setExams)
      .catch(() => setExams([]));
    coursesApi.units(subjectId).then(async (units) => {
      const all: TopicDto[] = [];
      for (const u of units) {
        all.push(...(await coursesApi.topics(u.id)));
      }
      setTopics(all);
      setSections([{ title: "Section 1", sortOrder: 1, topics: [] }]);
    });
  }, [subjectId, showArchived]);

  function sectionsFromExam(exam: AdminMockExamDto): MockExamSectionInput[] {
    if (exam.sections.length > 0) {
      return exam.sections.map((s) => ({
        title: s.title,
        sortOrder: s.sortOrder,
        sectionTimeLimitMinutes: s.sectionTimeLimitMinutes,
        topics: s.topics.map((t) => ({ topicId: t.topicId, questionCount: t.questionCount })),
      }));
    }
    return [
      {
        title: "General",
        sortOrder: 1,
        topics: exam.topics.map((t) => ({ topicId: t.topicId, questionCount: t.questionCount })),
      },
    ];
  }

  function validateSections(): string | null {
    if (topics.length === 0) {
      return "This subject has no topics yet. Add topics and MCQs under Course content first.";
    }
    if (sections.length === 0) {
      return "Add at least one blueprint section.";
    }
    for (const section of sections) {
      if (!section.title.trim()) return "Each section needs a title.";
      if (section.topics.length === 0) {
        return `Section "${section.title}" needs at least one topic.`;
      }
    }
    return null;
  }

  function validateForm(): string | null {
    const sectionError = validateSections();
    if (sectionError) return sectionError;
    if (isPublished && resultVisibility === "AfterClose" && !availableUntil.trim()) {
      return "Published exams need an Available until date when result visibility is “After window closes”. Set the end date below or choose Immediate / Manual publish.";
    }
    return null;
  }

  const publishNeedsEndDate = isPublished && resultVisibility === "AfterClose";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const formError = validateForm();
    if (formError) {
      setError(formError);
      return;
    }
    try {
      await adminApi.createMockExam({
        subjectId,
        title: title.trim(),
        description: description.trim() || null,
        timeLimitMinutes: Number(timeLimit),
        marksPerCorrect: Number(marksPerCorrect),
        penaltyPerWrong: Number(penaltyPerWrong),
        availableFromUtc: availableFrom ? new Date(availableFrom).toISOString() : null,
        availableUntilUtc: availableUntil ? new Date(availableUntil).toISOString() : null,
        isPublished,
        resultVisibility,
        showExplanations,
        notifyTeachersOnBatchComplete: notifyBatchComplete,
        batchCompleteThresholdPercent: Number(batchThreshold) || 80,
        sections,
      });
      setTitle("");
      setDescription("");
      setExams(await adminApi.listMockExams(subjectId, showArchived));
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
    setMarksPerCorrect(String(exam.marksPerCorrect));
    setPenaltyPerWrong(String(exam.penaltyPerWrong));
    setAvailableFrom(toDatetimeLocal(exam.availableFromUtc));
    setAvailableUntil(toDatetimeLocal(exam.availableUntilUtc));
    setIsPublished(exam.isPublished);
    setResultVisibility(exam.resultVisibility);
    setShowExplanations(exam.showExplanations);
    setNotifyBatchComplete(exam.notifyTeachersOnBatchComplete);
    setBatchThreshold(String(exam.batchCompleteThresholdPercent));
    setSections(sectionsFromExam(exam));
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExamId) return;
    const formError = validateForm();
    if (formError) {
      setError(formError);
      return;
    }
    try {
      await adminApi.updateMockExam(editingExamId, {
        title: title.trim(),
        description: description.trim() || null,
        timeLimitMinutes: Number(timeLimit),
        marksPerCorrect: Number(marksPerCorrect),
        penaltyPerWrong: Number(penaltyPerWrong),
        availableFromUtc: availableFrom ? new Date(availableFrom).toISOString() : null,
        availableUntilUtc: availableUntil ? new Date(availableUntil).toISOString() : null,
        isPublished,
        resultVisibility,
        showExplanations,
        notifyTeachersOnBatchComplete: notifyBatchComplete,
        batchCompleteThresholdPercent: Number(batchThreshold) || 80,
        sections,
      });
      setEditingExamId(null);
      setTitle("");
      setDescription("");
      setExams(await adminApi.listMockExams(subjectId, showArchived));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update mock exam");
    }
  }

  async function publishExamResults(examId: string) {
    try {
      await adminApi.publishMockExamResults(examId);
      setExams(await adminApi.listMockExams(subjectId, showArchived));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish results");
    }
  }

  async function openLeaderboard(examId: string) {
    setLeaderboardExamId(examId);
    setLeaderboardLoading(true);
    setLeaderboard(null);
    try {
      setLeaderboard(await adminApi.mockExamLeaderboard(examId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leaderboard");
    } finally {
      setLeaderboardLoading(false);
    }
  }

  async function toggleArchive(exam: AdminMockExamDto) {
    try {
      await adminApi.setMockExamArchived(exam.id, !exam.isArchived);
      setExams(await adminApi.listMockExams(subjectId, showArchived));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update archive status");
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
          A <strong className="font-medium text-slate-800">mock exam</strong> combines MCQs from
          several topics into one timed test (like MDCAT/ECAT practice). Topic quizzes are per-lesson;
          mock exams span multiple lessons with a schedule and result rules.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-8 text-slate-500">Loading…</p>
        ) : subjects.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No subjects assigned.</p>
        ) : (
          <div className="mt-6 space-y-6">
            <label className="block max-w-md text-sm font-medium text-slate-700">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      type="number"
                      min={1}
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                      placeholder="Time limit (minutes)"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={marksPerCorrect}
                      onChange={(e) => setMarksPerCorrect(e.target.value)}
                      placeholder="Marks per correct"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={penaltyPerWrong}
                      onChange={(e) => setPenaltyPerWrong(e.target.value)}
                      placeholder="Penalty per wrong"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Available from
                      </label>
                      <input
                        type="datetime-local"
                        value={availableFrom}
                        onChange={(e) => setAvailableFrom(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Available until
                        {publishNeedsEndDate && (
                          <span className="ml-1 text-red-600" title="Required to publish with after-close results">
                            *
                          </span>
                        )}
                      </label>
                      <input
                        type="datetime-local"
                        value={availableUntil}
                        onChange={(e) => setAvailableUntil(e.target.value)}
                        required={publishNeedsEndDate}
                        title={
                          publishNeedsEndDate
                            ? "Required when publishing with after-close result visibility"
                            : "Optional end of the exam window"
                        }
                        className={`w-full rounded-md border px-3 py-2 text-sm ${
                          publishNeedsEndDate && !availableUntil
                            ? "border-amber-400 ring-1 ring-amber-200"
                            : "border-slate-300"
                        }`}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                    />
                    Published (visible to enrolled students)
                    <InfoTooltip
                      text="Students enrolled in this course bundle will see the exam once published. If result visibility is “After window closes”, you must set Available until before saving."
                    />
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
                        {profileEmailTeachersOnCohortComplete(tenant)}
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
                      placeholder={`${cohortLabel.charAt(0).toUpperCase()}${cohortLabel.slice(1)} threshold %`}
                      className="w-full max-w-[10rem] rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  )}
                  <div className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">Blueprint sections</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSections((prev) => [
                            ...prev,
                            {
                              title: `Section ${prev.length + 1}`,
                              sortOrder: prev.length + 1,
                              topics: [],
                            },
                          ])
                        }
                      >
                        Add section
                      </Button>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      MDCAT/ECAT-style sections (Biology, Chemistry, etc.). Pick topics per section;
                      use <strong>0</strong> for all MCQs from a topic.
                    </p>
                    {topics.length === 0 ? (
                      <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                        No topics in this subject yet. Add topics under{" "}
                        <Link href="/admin" className="font-medium underline">
                          Course content
                        </Link>{" "}
                        first.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {sections.map((section, sectionIdx) => (
                          <div key={sectionIdx} className="rounded border border-slate-100 p-2">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <input
                                value={section.title}
                                onChange={(e) =>
                                  setSections((prev) =>
                                    prev.map((s, i) =>
                                      i === sectionIdx ? { ...s, title: e.target.value } : s
                                    )
                                  )
                                }
                                placeholder="Section title"
                                className="min-w-[8rem] flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                              />
                              {sections.length > 1 && (
                                <button
                                  type="button"
                                  className="text-xs text-red-600 hover:underline"
                                  onClick={() =>
                                    setSections((prev) =>
                                      prev
                                        .filter((_, i) => i !== sectionIdx)
                                        .map((s, i) => ({ ...s, sortOrder: i + 1 }))
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <ul className="max-h-36 space-y-1 overflow-y-auto text-sm">
                              {topics.map((t) => {
                                const selected = section.topics.find((x) => x.topicId === t.id);
                                return (
                                  <li key={t.id} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selected)}
                                      disabled={t.mcqCount === 0}
                                      onChange={(e) => {
                                        setSections((prev) =>
                                          prev.map((s, i) => {
                                            if (i !== sectionIdx) return s;
                                            const nextTopics = e.target.checked
                                              ? [...s.topics, { topicId: t.id, questionCount: 0 }]
                                              : s.topics.filter((x) => x.topicId !== t.id);
                                            return { ...s, topics: nextTopics };
                                          })
                                        );
                                        setError(null);
                                      }}
                                    />
                                    <span
                                      className={`flex-1 ${t.mcqCount === 0 ? "text-slate-400" : "text-slate-700"}`}
                                    >
                                      {t.title}
                                      <span className="ml-1 text-xs text-slate-400">
                                        ({t.mcqCount} MCQs)
                                      </span>
                                    </span>
                                    {selected && t.mcqCount > 0 && (
                                      <input
                                        type="number"
                                        min={0}
                                        max={t.mcqCount}
                                        value={selected.questionCount}
                                        onChange={(e) =>
                                          setSections((prev) =>
                                            prev.map((s, i) => {
                                              if (i !== sectionIdx) return s;
                                              return {
                                                ...s,
                                                topics: s.topics.map((x) =>
                                                  x.topicId === t.id
                                                    ? { ...x, questionCount: Number(e.target.value) }
                                                    : x
                                                ),
                                              };
                                            })
                                          )
                                        }
                                        className="w-14 rounded border border-slate-300 px-1 text-xs"
                                      />
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
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
                          setSections([{ title: "Section 1", sortOrder: 1, topics: [] }]);
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">Existing exams</h2>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />
                  Show archived
                </label>
              </div>
              {exams.length === 0 ? (
                <p className="text-sm text-slate-500">No mock exams for this subject.</p>
              ) : (
                exams.map((exam) => (
                  <div key={exam.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{exam.title}</p>
                        <p className="text-xs text-slate-500">
                          {exam.bundleTitle} · {exam.timeLimitMinutes} min · +
                          {exam.marksPerCorrect}/−{exam.penaltyPerWrong} · {exam.sections.length}{" "}
                          sections · {exam.isPublished ? "Published" : "Draft"}
                          {exam.isArchived ? " · Archived" : ""} · {exam.resultVisibility}
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
                        <button
                          type="button"
                          className="text-xs text-slate-600 hover:underline"
                          onClick={() => void openLeaderboard(exam.id)}
                        >
                          Leaderboard
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
                          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline"
                          onClick={() => void toggleArchive(exam)}
                        >
                          {exam.isArchived ? (
                            <>
                              <ArchiveRestore className="h-3.5 w-3.5" /> Unarchive
                            </>
                          ) : (
                            <>
                              <Archive className="h-3.5 w-3.5" /> Archive
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="text-slate-300 hover:text-red-600"
                          onClick={() =>
                            confirm({
                              title: "Delete mock exam?",
                              description: `Delete "${exam.title}" and all attempt data? This cannot be undone.`,
                              confirmLabel: "Delete",
                              requireTypedConfirm: "delete",
                              onConfirm: async () => {
                                await adminApi.deleteMockExam(exam.id);
                                setExams(await adminApi.listMockExams(subjectId, showArchived));
                              },
                            })
                          }
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
      {confirmDialog}
      {leaderboardExamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[80vh] w-full max-w-lg overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-base">Mock exam leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboardLoading && <p className="text-sm text-slate-500">Loading…</p>}
              {leaderboard && leaderboard.rows.length === 0 && (
                <p className="text-sm text-slate-500">No submitted attempts yet.</p>
              )}
              {leaderboard && leaderboard.rows.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-slate-500">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Student</th>
                      <th className="py-2 pr-2">Score</th>
                      <th className="py-2">C/W</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.rows.map((row) => (
                      <tr key={row.userId} className="border-b border-slate-100">
                        <td className="py-2 pr-2 font-medium">{row.rank}</td>
                        <td className="py-2 pr-2">{row.name}</td>
                        <td className="py-2 pr-2">{row.score}</td>
                        <td className="py-2 text-slate-500">
                          {row.correctCount}/{row.wrongCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLeaderboardExamId(null);
                    setLeaderboard(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
