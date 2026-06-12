"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PlayCircle, Search, Video } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contentApi, progressApi, type VideoLibraryItemDto } from "@/lib/api";
import { ProtectedVideo } from "@/components/protected-video";
import { getSession } from "@/lib/auth";
import { getTenantSlug, loadAndApplyBranding, type BrandingDto } from "@/lib/branding";

function formatDuration(sec: number): string {
  if (sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoLibraryPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [items, setItems] = useState<VideoLibraryItemDto[]>([]);
  const [videosOnlyStudent, setVideosOnlyStudent] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<VideoLibraryItemDto | null>(null);
  const [progressByLecture, setProgressByLecture] = useState<Record<string, number>>({});
  const [activeProgress, setActiveProgress] = useState(0);
  const [activePosition, setActivePosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    const slug = getTenantSlug();
    loadAndApplyBranding(slug).then(setBranding);
    contentApi
      .videoLibrary()
      .then(async (lib) => {
        setItems(lib.items);
        setVideosOnlyStudent(lib.videosOnlyStudent);
        if (lib.items.length > 0) {
          setActive(lib.items[0]);
          const rows = await progressApi.lectureProgressBulk(lib.items.map((i) => i.lectureId));
          const map: Record<string, number> = {};
          const pos: Record<string, number> = {};
          for (const row of rows) {
            map[row.lectureId] = row.progressPercent;
            pos[row.lectureId] = row.positionSec;
          }
          setProgressByLecture(map);
          if (lib.items[0]) {
            setActiveProgress(map[lib.items[0].lectureId] ?? 0);
            setActivePosition(pos[lib.items[0].lectureId] ?? 0);
          }
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load videos"))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (v) =>
        v.lectureTitle.toLowerCase().includes(q) ||
        v.topicTitle.toLowerCase().includes(q) ||
        v.subjectTitle.toLowerCase().includes(q) ||
        v.bundleTitle.toLowerCase().includes(q)
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, VideoLibraryItemDto[]>();
    for (const item of filtered) {
      const key = `${item.bundleTitle} / ${item.subjectTitle}`;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-white to-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandHeader branding={branding} />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Video className="h-7 w-7 text-[var(--brand)]" />
            {videosOnlyStudent ? "My video lectures" : "Video library"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {videosOnlyStudent
              ? "Watch recorded lectures from your enrolled plan."
              : "All lectures from your enrolled courses."}
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {loading ? (
          <p className="text-slate-500">Loading videos…</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No videos yet. Your institute will add lectures to your course topics.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section>
              {active ? (
                <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{active.lectureTitle}</CardTitle>
                    <p className="text-xs text-slate-500">
                      {active.bundleTitle} · {active.subjectTitle} · {active.topicTitle}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ProtectedVideo
                      key={active.lectureId}
                      src={active.playUrl}
                      title={active.lectureTitle}
                      lectureId={active.lectureId}
                      topicId={active.topicId}
                      initialPositionSec={activePosition}
                      onProgressChange={(p) => {
                        setActiveProgress(p);
                        setProgressByLecture((prev) => ({ ...prev, [active.lectureId]: p }));
                      }}
                      className="aspect-video w-full rounded-md bg-black"
                    />
                    {activeProgress > 0 && (
                      <p className="mt-2 text-xs text-slate-500">{activeProgress}% complete</p>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, topic, or subject…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm"
                />
              </div>

              <div className="mt-4 space-y-4">
                {grouped.map(([group, lectures]) => (
                  <div key={group}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</h2>
                    <div className="space-y-2">
                      {lectures.map((v) => (
                        <button
                          key={v.lectureId}
                          type="button"
                          onClick={() => {
                            setActive(v);
                            setActiveProgress(progressByLecture[v.lectureId] ?? 0);
                            progressApi
                              .lectureProgress(v.lectureId)
                              .then((p) => setActivePosition(p.positionSec))
                              .catch(() => setActivePosition(0));
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                            active?.lectureId === v.lectureId
                              ? "border-[var(--brand)]/40 bg-[var(--brand)]/5"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <PlayCircle className="h-5 w-5 shrink-0 text-[var(--brand)]" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-800">{v.lectureTitle}</p>
                            <p className="truncate text-xs text-slate-500">{v.topicTitle}</p>
                          </div>
                          <span className="shrink-0 text-xs text-slate-400">
                            {(progressByLecture[v.lectureId] ?? 0) > 0
                              ? `${progressByLecture[v.lectureId]}%`
                              : v.durationSec > 0
                                ? formatDuration(v.durationSec)
                                : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="hidden lg:block">
              <Card className="border-slate-200/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Now playing</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  {active ? (
                    <>
                      <p className="font-medium text-slate-900">{active.lectureTitle}</p>
                      <p className="mt-1 text-xs">{active.topicTitle}</p>
                    </>
                  ) : (
                    "Select a lecture"
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
