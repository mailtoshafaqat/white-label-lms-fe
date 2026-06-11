"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { doubtsApi, type DoubtReplyTemplateDto } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

export default function DoubtTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<DoubtReplyTemplateDto[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function reload() {
    return doubtsApi.listTemplates().then(setTemplates);
  }

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/dashboard");
      return;
    }
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    try {
      await doubtsApi.createTemplate({ title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      await reload();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create template");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/admin/doubts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to doubts
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Canned doubt replies</h1>
        <p className="mt-1 text-sm text-slate-600">
          Templates appear as quick-insert buttons when replying to student doubts.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">New template</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleCreate}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short label (e.g. Review lecture)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Full reply text…"
                className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" /> Add template
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Saved templates</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-slate-500">No templates yet.</p>
            ) : (
              <ul className="space-y-3">
                {templates.map((t) => (
                  <li key={t.id} className="rounded-md border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-800">{t.title}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{t.body}</p>
                      </div>
                      <button
                        type="button"
                        className="text-slate-300 hover:text-red-600"
                        onClick={() =>
                          confirm({
                            title: "Delete template?",
                            description: `Remove "${t.title}"? Teachers will no longer see this canned reply.`,
                            confirmLabel: "Delete",
                            onConfirm: async () => {
                              await doubtsApi.deleteTemplate(t.id);
                              await reload();
                            },
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
      {confirmDialog}
    </div>
  );
}
