"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, RefreshCw, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { LiveClassActions } from "@/components/live-class-actions";
import { LiveClassAttendancePanel } from "@/components/live-class-attendance";
import { AdminListToolbar } from "@/components/admin-list-toolbar";
import { AdminPagination } from "@/components/admin-pagination";
import { PAGED_LIST_EMPTY_EXTRAS, usePagedList } from "@/hooks/use-paged-list";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import {
  coursesApi,
  adminApi,
  type AdminLiveClassDto,
  type AssignedSubjectDto,
  type TeacherListItemDto,
  type TopicDto,
} from "@/lib/api";
import { getSession, isAdmin, canManageInstitute } from "@/lib/auth";

const stateStyles: Record<string, string> = {
  Live: "bg-red-100 text-red-700",
  Upcoming: "bg-blue-100 text-blue-700",
  Ended: "bg-slate-100 text-slate-500",
  Cancelled: "bg-slate-100 text-slate-400 line-through",
};

type StateFilter = "all" | "upcoming" | "live" | "ended" | "cancelled";

async function loadSubjectTopics(subjectId: string): Promise<TopicDto[]> {
  const units = await coursesApi.units(subjectId);
  const topics: TopicDto[] = [];
  for (const unit of units) {
    const unitTopics = await coursesApi.topics(unit.id);
    topics.push(...unitTopics);
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
    loadSubjectTopics(liveClass.subjectId)
      .then((t) => {
        setTopics(t);
        setTopicId((prev) => prev || (t.length > 0 ? t[0].id : ""));
      })
      .catch(() => setError("Could not load topics for this course"))
      .finally(() => setLoadingTopics(false));
  }, [liveClass.subjectId]);

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

function AdminLiveClassesContent() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<AssignedSubjectDto[]>([]);
  const [teachers, setTeachers] = useState<TeacherListItemDto[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [isInstitute, setIsInstitute] = useState(false);
  const [myUserId, setMyUserId] = useState("");
  const [zoomConfigured, setZoomConfigured] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");

  const [subjectId, setSubjectId] = useState("");
  const [hostUserId, setHostUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(60);
  const [manualJoinUrl, setManualJoinUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const listExtras = useMemo(
    () => (stateFilter === "all" ? PAGED_LIST_EMPTY_EXTRAS : { state: stateFilter }),
    [stateFilter]
  );

  const fetchLiveClasses = useCallback(
    (params: Parameters<typeof adminApi.listLiveClasses>[0]) =>
      adminApi.listLiveClasses({
        ...params,
        state: stateFilter === "all" ? undefined : stateFilter,
      }),
    [stateFilter]
  );

  const list = usePagedList({
    fetch: fetchLiveClasses,
    syncUrl: true,
    extraParams: listExtras,
  });

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
    const institute = canManageInstitute(session);
    setIsInstitute(institute);
    setMyUserId(session.userId);
    if (!institute) setHostUserId(session.userId);

    const loads: Promise<unknown>[] = [adminApi.mySubjects(), adminApi.zoomStatus()];
    if (institute) {
      loads.push(adminApi.listTeachers({ pageSize: 100 }), adminApi.listSubjectTeachers());
    }

    Promise.all(loads)
      .then((results) => {
        const [subs, z, t, maps] = results as [
          AssignedSubjectDto[],
          { configured: boolean },
          { data: TeacherListItemDto[] }?,
          { userId: string; subjectIds: string[] }[]?,
        ];
        setSubjects(subs);
        setZoomConfigured(z.configured);
        if (subs.length > 0) setSubjectId(subs[0].subjectId);
        if (institute && t && maps) {
          setTeachers(t.data);
          const map: Record<string, string[]> = {};
          for (const row of maps) map[row.userId] = row.subjectIds ?? [];
          setAssignments(map);
          if (subs.length > 0) {
            const firstHost = t.data.find((teacher) =>
              (map[teacher.userId] ?? []).includes(subs[0].subjectId)
            );
            if (firstHost) setHostUserId(firstHost.userId);
          }
        }
      })
      .catch((e) => setFormError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setMetaLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await adminApi.createLiveClass({
        subjectId,
        hostUserId: isInstitute ? hostUserId : myUserId,
        title,
        description: description || null,
        scheduledStartUtc: new Date(start).toISOString(),
        durationMinutes: duration,
        manualJoinUrl: manualJoinUrl || null,
      });
      setTitle("");
      setDescription("");
      setStart("");
      setManualJoinUrl("");
      await list.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not schedule class");
    } finally {
      setSubmitting(false);
    }
  }

  function requestCancel(id: string, title: string) {
    confirm({
      title: "Cancel live class?",
      description: `Cancel "${title}"? Students will no longer see this class on their dashboard.`,
      confirmLabel: "Cancel class",
      onConfirm: async () => {
        await adminApi.cancelLiveClass(id);
        await list.reload();
      },
    });
  }

  const emptyMessage =
    list.debouncedSearch.trim().length > 0
      ? "No classes match your search."
      : stateFilter === "all"
        ? "No classes scheduled yet."
        : `No ${stateFilter} classes.`;

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Video className="h-6 w-6 text-[var(--brand)]" /> Live classes
        </h1>
        <p className="mt-1 text-slate-600">
          Schedule live sessions per subject and host teacher. Zoom meetings are created when Zoom is connected.
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

        {formError && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</p>
        )}
        {list.error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{list.error}</p>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Schedule a class</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                <select
                  value={subjectId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSubjectId(id);
                    if (isInstitute) {
                      const host = teachers.find((t) => (assignments[t.userId] ?? []).includes(id));
                      if (host) setHostUserId(host.userId);
                    }
                  }}
                  required
                  disabled={metaLoading}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                >
                  {subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.bundleTitle} — {s.subjectTitle}
                    </option>
                  ))}
                </select>
              </div>
              {isInstitute && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Host teacher</label>
                  <select
                    value={hostUserId}
                    onChange={(e) => setHostUserId(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                  >
                    {teachers
                      .filter((t) => (assignments[t.userId] ?? []).includes(subjectId))
                      .map((t) => (
                        <option key={t.userId} value={t.userId}>
                          {t.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              )}
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
                <Button type="submit" disabled={submitting || metaLoading}>
                  <Plus className="h-4 w-4" /> {submitting ? "Scheduling…" : "Schedule class"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Scheduled classes</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={list.loading}
            onClick={() => void list.reload()}
          >
            <RefreshCw className={`h-4 w-4 ${list.loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "upcoming", "live", "ended", "cancelled"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStateFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                stateFilter === s
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <AdminListToolbar
            search={list.searchInput}
            onSearchChange={list.setSearchInput}
            pageSize={list.pageSize}
            onPageSizeChange={list.setPageSize}
            page={list.page}
            total={list.total}
            searchPlaceholder="Search by title…"
          />
        </div>

        <div className="mt-3 space-y-2">
          {list.loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : list.data.length === 0 ? (
            <p className="text-slate-500">{emptyMessage}</p>
          ) : (
            list.data.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
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
                      {c.bundleTitle} · {c.subjectTitle} · {c.hostName} ·{" "}
                      {new Date(c.scheduledStartUtc).toLocaleString()} · {c.durationMinutes} min
                    </div>
                    {c.state === "Upcoming" && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Join link activates when the class is live. Host can start up to 15 minutes
                        early.
                      </p>
                    )}
                  </div>
                  <LiveClassActions
                    state={c.state}
                    scheduledStartUtc={c.scheduledStartUtc}
                    startUrl={c.startUrl}
                    joinUrl={c.joinUrl}
                  />
                  {c.state !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() => requestCancel(c.id, c.title)}
                      className="text-slate-300 hover:text-red-600"
                      title="Cancel class"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {(c.state === "Live" || c.state === "Ended") && (
                  <LiveClassAttendancePanel liveClassId={c.id} state={c.state} />
                )}
                {c.state === "Ended" && (
                  <RecordingForm liveClass={c} onSaved={() => void list.reload()} />
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <AdminPagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            onPageChange={list.setPage}
          />
        </div>
      </main>
      {confirmDialog}
    </div>
  );
}

export default function AdminLiveClassesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-slate-500">Loading…</div>}>
      <AdminLiveClassesContent />
    </Suspense>
  );
}
