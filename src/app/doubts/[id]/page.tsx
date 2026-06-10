"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { doubtsApi, type DoubtThreadDetailDto } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function DoubtThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [thread, setThread] = useState<DoubtThreadDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    doubtsApi
      .get(id)
      .then(setThread)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function sendFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await doubtsApi.addMessage(id, reply.trim());
      setThread(updated);
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/doubts" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Question thread</span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : error && !thread ? (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : thread ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{thread.title}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {thread.subjectTitle} · {thread.bundleTitle}
                  {thread.topicTitle ? ` · ${thread.topicTitle}` : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  thread.status === "Open"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {thread.status}
              </span>
            </div>

            {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="mt-6 space-y-4">
              {thread.messages.map((m) => {
                const isStudent = m.authorRole === "Student";
                return (
                  <Card
                    key={m.id}
                    className={isStudent ? "border-slate-200" : "border-[var(--brand)]/30 bg-blue-50/40"}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-sm font-medium">
                        <span className="text-slate-800">
                          {m.authorName}
                          {!isStudent && (
                            <span className="ml-2 rounded bg-[var(--brand)]/10 px-1.5 py-0.5 text-xs text-[var(--brand)]">
                              Teacher
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
              <form className="mt-6 space-y-3" onSubmit={sendFollowUp}>
                <label className="block text-sm font-medium text-slate-700">Follow-up</label>
                <textarea
                  className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Add a follow-up question…"
                  required
                />
                <Button type="submit" disabled={submitting}>
                  <Send className="h-4 w-4" />
                  {submitting ? "Sending…" : "Send follow-up"}
                </Button>
              </form>
            ) : (
              <p className="mt-6 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                This thread was resolved
                {thread.resolvedAt
                  ? ` on ${new Date(thread.resolvedAt).toLocaleString()}`
                  : ""}
                . Start a new question if you need more help.
              </p>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
