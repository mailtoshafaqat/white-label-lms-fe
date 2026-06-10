"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircleQuestion, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { doubtsApi, type DoubtThreadSummaryDto, type EnrolledSubjectOption } from "@/lib/api";
import { getSession } from "@/lib/auth";

function DoubtsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<DoubtThreadSummaryDto[]>([]);
  const [subjects, setSubjects] = useState<EnrolledSubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }

    const prefillSubject = searchParams.get("subjectId");
    const prefillTopic = searchParams.get("topicId");
    if (prefillSubject) {
      setSubjectId(prefillSubject);
      setShowForm(true);
    }
    if (prefillTopic) setTopicId(prefillTopic);

    Promise.all([doubtsApi.list(), doubtsApi.listSubjects()])
      .then(([t, s]) => {
        setThreads(t);
        setSubjects(s);
        if (!prefillSubject && s.length > 0) setSubjectId(s[0].subjectId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router, searchParams]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !question.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await doubtsApi.create({
        subjectId,
        topicId: topicId.trim() || undefined,
        question: question.trim(),
      });
      router.push(`/doubts/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit question");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Ask Teacher</span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <MessageCircleQuestion className="h-6 w-6 text-[var(--brand)]" />
              Your questions
            </h1>
            <p className="mt-1 text-slate-600">
              Ask your subject teacher about course content. Replies appear in the thread.
            </p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)} disabled={subjects.length === 0}>
            <Plus className="h-4 w-4" />
            Ask a question
          </Button>
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {showForm && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">New question</CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <p className="text-sm text-slate-500">Enroll in a course to ask questions.</p>
              ) : (
                <form className="space-y-4" onSubmit={handleCreate}>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      required
                    >
                      {subjects.map((s) => (
                        <option key={s.subjectId} value={s.subjectId}>
                          {s.subjectTitle} ({s.bundleTitle})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Topic ID <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={topicId}
                      onChange={(e) => setTopicId(e.target.value)}
                      placeholder="Paste topic ID if asking about a specific topic"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Question</label>
                    <textarea
                      className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Describe your doubt…"
                      required
                      minLength={3}
                    />
                  </div>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit question"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="mt-6 text-slate-500">No questions yet. Ask your first one above.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {threads.map((t) => (
              <Link key={t.id} href={`/doubts/${t.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start justify-between gap-4 pt-5">
                    <div>
                      <p className="font-medium text-slate-900">{t.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {t.subjectTitle} · {t.bundleTitle}
                        {t.topicTitle ? ` · ${t.topicTitle}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Updated {new Date(t.updatedAt ?? t.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        t.status === "Open"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DoubtsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-slate-500">Loading…</div>}>
      <DoubtsPageContent />
    </Suspense>
  );
}
