"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import {
  coursesApi,
  adminApi,
  type BundleDto,
  type AdminLiveClassDto,
  type TopicDto,
} from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

const stateStyles: Record<string, string> = {
  Live: "bg-red-100 text-red-700",
  Upcoming: "bg-blue-100 text-blue-700",
  Ended: "bg-slate-100 text-slate-500",
  Cancelled: "bg-slate-100 text-slate-400 line-through",
};

async function loadBundleTopics(bundleId: string): Promise<TopicDto[]> {
  const bundle = await coursesApi.bundle(bundleId);
  const topics: TopicDto[] = [];
  for (const subject of bundle.subjects) {
    const units = await coursesApi.units(subject.id);
    for (const unit of units) {
      const unitTopics = await coursesApi.topics(unit.id);
      topics.push(...unitTopics);
    }
  }
  return topics;
}

function RecordingForm({
  liveClass,
  onSaved,
}: {
  liveClass: AdminLiveClassDto;
  onSaved: (updated: AdminLiveClassDto) => void;
}) {
  const [recordingUrl, setRecordingUrl] = useState(liveClass.recordingUrl ?? "");
  const [topicId, setTopicId] = useState(liveClass.recordingTopicId ?? "");
  const [lectureTitle, setLectureTitle] = useState(liveClass.title);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBundleTopics(liveClass.bundleId)
      .then((t) => {
        setTopics(t);
        setTopicId((prev) => prev || (t.length > 0 ? t[0].id : ""));
      })
      .catch(() => setError("Could not load topics for this course"))
      .finally(() => setLoadingTopics(false));
  }, [liveClass.bundleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recordingUrl.trim() || !topicId) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminApi.attachRecording(liveClass.id, {
        recordingUrl: recordingUrl.trim(),
        topicId,
        lectureTitle: lectureTitle.trim() || null,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach recording");
    } finally {
      setSubmitting(false);
    }
  }

  if (liveClass.recordingUrl) {
    return (
      <p className="mt-2 text-xs text-emerald-700">
        Recording attached ·{" "}
        <a href={liveClass.recordingUrl} target="_blank" rel="noopener noreferrer" className="underline">
          View
        </a>
      </p>
    );
  }

  return (
    <form className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3" onSubmit={handleSubmit}>
      <p className="text-xs font-medium text-slate-700">Attach recording</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        required
        value={recordingUrl}
        onChange={(e) => setRecordingUrl(e.target.value)}
        placeholder="Recording URL (mp4/HLS/Zoom link)"
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      <select
        required
        value={topicId}
        onChange={(e) => setTopicId(e.target.value)}
        disabled={loadingTopics}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      >
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
      <input
        value={lectureTitle}
        onChange={(e) => setLectureTitle(e.target.value)}
        placeholder="Lecture title (optional)"
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      <Button type="submit" size="sm" disabled={submitting || loadingTopics || topics.length === 0}>
        {submitting ? "Saving…" : "Attach recording"}
      </Button>
    </form>
  );
}

export default function AdminLiveClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<AdminLiveClassDto[]>([]);
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [zoomConfigured, setZoomConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bundleId, setBundleId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(60);
  const [manualJoinUrl, setManualJoinUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isAdmin(session)) {
      router.replace("/dashboard");
      return;
    }
    Promise.all([adminApi.listLiveClasses(), coursesApi.bundles(), adminApi.zoomStatus()])
      .then(([c, b, z]) => {
        setClasses(c);
        setBundles(b);
        setZoomConfigured(z.configured);
        if (b.length > 0) setBundleId(b[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await adminApi.createLiveClass({
        bundleId,
        title,
        description: description || null,
        scheduledStartUtc: new Date(start).toISOString(),
        durationMinutes: duration,
        manualJoinUrl: manualJoinUrl || null,
      });
      setClasses((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setStart("");
      setManualJoinUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule class");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    await adminApi.cancelLiveClass(id);
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, state: "Cancelled" } : c)));
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Video className="h-6 w-6 text-[var(--brand)]" /> Live classes
        </h1>
        <p className="mt-1 text-slate-600">
          Schedule live sessions for a course. Enrolled students see them on their dashboard.
        </p>

        <div
          className={`mt-3 rounded-md p-3 text-sm ${
            zoomConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {zoomConfigured ? (
            <>Zoom is connected — meetings are created automatically.</>
          ) : (
            <>
              Zoom is not connected, so paste a join link below.{" "}
              <Link href="/admin/settings/zoom" className="font-medium underline">
                Connect Zoom
              </Link>{" "}
              to auto-create meetings.
            </>
          )}
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Schedule a class</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Course</label>
                <select
                  value={bundleId}
                  onChange={(e) => setBundleId(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                >
                  {bundles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description (optional)
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Start time</label>
                <input
                  type="datetime-local"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              {!zoomConfigured && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Zoom join link
                  </label>
                  <input
                    value={manualJoinUrl}
                    onChange={(e) => setManualJoinUrl(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting}>
                  <Plus className="h-4 w-4" /> {submitting ? "Scheduling…" : "Schedule class"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">Scheduled classes</h2>
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : classes.length === 0 ? (
            <p className="text-slate-500">No classes scheduled yet.</p>
          ) : (
            classes.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{c.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${stateStyles[c.state] ?? ""}`}>
                        {c.state}
                      </span>
                      <span className="text-xs text-slate-400">{c.provider}</span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {c.bundleTitle} · {new Date(c.scheduledStartUtc).toLocaleString()} · {c.durationMinutes} min
                    </div>
                  </div>
                  {c.startUrl && c.state !== "Cancelled" && (
                    <a
                      href={c.startUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-[var(--brand)] hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Start
                    </a>
                  )}
                  {c.state !== "Cancelled" && (
                    <button onClick={() => cancel(c.id)} className="text-slate-300 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {c.state === "Ended" && (
                  <RecordingForm
                    liveClass={c}
                    onSaved={(updated) =>
                      setClasses((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                    }
                  />
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
