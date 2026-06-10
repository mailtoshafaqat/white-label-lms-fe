"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ClipboardList, Layers, Lock, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contentApi, API_BASE_URL, type LectureDto, type TopicContentDto } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getTenantSlug, loadAndApplyBranding, type BrandingDto } from "@/lib/branding";
import { MentorPanel } from "@/components/mentor-panel";

function absolute(url: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
}

function LecturePlayer({ lecture }: { lecture: LectureDto }) {
  const slug = getTenantSlug();
  const loginUrl = `/login?tenant=${encodeURIComponent(slug)}`;

  if (lecture.locked || (lecture.membersOnly && !lecture.url)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-slate-400" />
            {lecture.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex aspect-video flex-col items-center justify-center rounded-md bg-slate-100 text-center">
            <Lock className="h-10 w-10 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">Members-only content</p>
            <p className="mt-1 text-sm text-slate-500">Log in to watch this lecture.</p>
            <Button className="mt-4" asChild>
              <Link href={loginUrl}>Log in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lecture.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <video
          controls
          className="aspect-video w-full rounded-md bg-black"
          src={absolute(lecture.url)}
        />
      </CardContent>
    </Card>
  );
}

export default function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [content, setContent] = useState<TopicContentDto | null>(null);
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    loadAndApplyBranding().then(setBranding);
    contentApi
      .topicContent(id)
      .then(setContent)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const lectures = content?.lectures ?? [];

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Topic</span>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_340px]">
        <div>
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error} — is the API running on port 5237?
          </p>
        )}

        {content && (
          <>
            {lectures.length > 0 ? (
              <div className="space-y-4">
                {lectures.map((lecture) => (
                  <LecturePlayer key={lecture.id} lecture={lecture} />
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No lecture for this topic yet.</p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/quiz/${id}`}>
                  <ClipboardList className="h-4 w-4" /> Take the Daily Practice Test
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/flashcards/${id}`}>
                  <Layers className="h-4 w-4" /> Review flashcards
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/doubts?topicId=${id}`}>
                  <MessageCircleQuestion className="h-4 w-4" /> Ask Teacher
                </Link>
              </Button>
            </div>

            <section className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-[var(--brand)]" /> Notes
              </h2>
              <div className="space-y-4">
                {content.notes.map((n) => (
                  <Card key={n.id}>
                    <CardHeader>
                      <CardTitle>{n.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {n.contentHtml ? (
                        <div
                          className="prose prose-sm max-w-none text-slate-700"
                          dangerouslySetInnerHTML={{ __html: n.contentHtml }}
                        />
                      ) : n.downloadUrl ? (
                        <a
                          href={absolute(n.downloadUrl)}
                          className="text-sm font-medium text-[var(--brand)]"
                        >
                          Download notes
                        </a>
                      ) : (
                        <p className="text-sm text-slate-500">No content.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {content.notes.length === 0 && (
                  <p className="text-slate-500">No notes for this topic yet.</p>
                )}
              </div>
            </section>
          </>
        )}
        </div>
        {branding?.syllabusMentorEnabled !== false && (
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <MentorPanel topicId={id} branding={branding} compact />
          </aside>
        )}
      </main>
    </div>
  );
}

