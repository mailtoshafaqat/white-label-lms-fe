"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { doubtsApi, type DoubtReplyTemplateDto, type DoubtThreadDetailDto } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

export default function AdminDoubtThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [thread, setThread] = useState<DoubtThreadDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [templates, setTemplates] = useState<DoubtReplyTemplateDto[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/dashboard");
      return;
    }
    Promise.all([doubtsApi.adminGet(id), doubtsApi.listTemplates()])
      .then(([t, tpl]) => {
        setThread(t);
        setTemplates(tpl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await doubtsApi.adminReply(id, reply.trim());
      setThread(updated);
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setSubmitting(false);
    }
  }

  async function resolve() {
    setResolving(true);
    setError(null);
    try {
      const updated = await doubtsApi.adminResolve(id);
      setThread(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-8 py-8">
        <Link
          href="/admin/doubts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to inbox
        </Link>

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : error && !thread ? (
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : thread ? (
          <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{thread.title}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {thread.studentName} · {thread.subjectTitle} · {thread.bundleTitle}
                  {thread.topicTitle ? ` · ${thread.topicTitle}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    thread.status === "Open"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {thread.status}
                </span>
                {thread.status === "Open" && (
                  <Button size="sm" variant="outline" onClick={() => void resolve()} disabled={resolving}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {resolving ? "Resolving…" : "Mark resolved"}
                  </Button>
                )}
              </div>
            </div>

            {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="mt-6 space-y-4">
              {thread.messages.map((m) => {
                const isStudent = m.authorRole === "Student";
                return (
                  <Card
                    key={m.id}
                    className={isStudent ? "border-slate-200 bg-white" : "border-[var(--brand)]/30 bg-blue-50/40"}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-sm font-medium">
                        <span className="text-slate-800">
                          {m.authorName}
                          {!isStudent && (
                            <span className="ml-2 rounded bg-[var(--brand)]/10 px-1.5 py-0.5 text-xs text-[var(--brand)]">
                              You
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-normal text-slate-400">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{m.body}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {thread.status === "Open" ? (
              <form className="mt-6 space-y-3" onSubmit={sendReply}>
                {templates.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Canned replies</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          onClick={() => setReply(t.body)}
                          title={t.body}
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="block text-sm font-medium text-slate-700">Your reply</label>
                <textarea
                  className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Answer the student's question…"
                  required
                />
                <Button type="submit" disabled={submitting}>
                  <Send className="h-4 w-4" />
                  {submitting ? "Sending…" : "Send reply"}
                </Button>
              </form>
            ) : (
              <p className="mt-6 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                Resolved
                {thread.resolvedAt
                  ? ` on ${new Date(thread.resolvedAt).toLocaleString()}`
                  : ""}
                .
              </p>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
