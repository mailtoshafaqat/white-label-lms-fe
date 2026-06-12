"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Medal,
  Target,
  Users,
  AlertTriangle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminApi,
  type AssignedSubjectDto,
  type LeaderboardRowDto,
  type StudentSubjectProgressDto,
  type SubjectProgressDto,
} from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

type ProgressTab = "students" | "leaderboard";
type LeaderboardSize = 5 | 10;

const SCORE_BAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

const BUCKET_COLORS = [
  "bg-slate-300",
  "bg-red-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-blue-500",
];

function studentRiskLabel(student: StudentSubjectProgressDto): string | null {
  if (student.quizzesCompleted === 0) return "No activity";
  if (student.averagePercentage < 50) return "At risk";
  return null;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentRow({
  student,
  subjectId,
}: {
  student: StudentSubjectProgressDto;
  subjectId: string;
}) {
  const risk = studentRiskLabel(student);
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          {student.results.length > 0 ? (
            open ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )
          ) : (
            <span className="inline-block h-4 w-4" />
          )}
          <span className="font-medium text-slate-800">{student.studentName}</span>
          {risk && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                risk === "At risk"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {risk}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4 text-slate-600">
          <Link
            href={`/admin/progress/${subjectId}/students/${student.userId}`}
            className="text-xs font-medium text-[var(--brand)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="mr-0.5 inline h-3 w-3" />
            Details
          </Link>
          <span>{student.quizzesCompleted} quiz{student.quizzesCompleted === 1 ? "" : "zes"}</span>
          <span className="w-12 text-right font-medium">
            {student.quizzesCompleted > 0 ? `${student.averagePercentage}%` : "—"}
          </span>
        </div>
      </button>
      {open && student.results.length > 0 && (
        <ul className="mb-3 ml-6 space-y-1 border-l border-slate-200 pl-4">
          {student.results.map((r) => (
            <li key={r.quizId} className="text-xs text-slate-600">
              <span className="font-medium text-slate-700">{r.quizTitle}</span>
              {" · "}
              {r.bestScore}/{r.total} ({r.percentage}%)
              {" · "}
              {new Date(r.submittedAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-amber-100 text-amber-800 ring-amber-200";
  if (rank === 2) return "bg-slate-200 text-slate-700 ring-slate-300";
  if (rank === 3) return "bg-orange-100 text-orange-800 ring-orange-200";
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

type WeeklyTrendDay = { dayLabel: string; accuracy: number; attempts: number };

function buildWeeklyTrend(students: StudentSubjectProgressDto[]): WeeklyTrendDay[] {
  const days: WeeklyTrendDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const scores: number[] = [];
    for (const student of students) {
      for (const result of student.results) {
        const submitted = new Date(result.submittedAt);
        if (submitted >= start && submitted < end) scores.push(result.percentage);
      }
    }

    days.push({
      dayLabel: start.toLocaleDateString(undefined, { weekday: "short" }),
      accuracy:
        scores.length > 0
          ? Math.round(scores.reduce((sum, pct) => sum + pct, 0) / scores.length)
          : 0,
      attempts: scores.length,
    });
  }
  return days;
}

function scoreBuckets(students: StudentSubjectProgressDto[]) {
  return [
    {
      label: "No activity",
      count: students.filter((s) => s.quizzesCompleted === 0).length,
    },
    {
      label: "Below 50%",
      count: students.filter((s) => s.quizzesCompleted > 0 && s.averagePercentage < 50).length,
    },
    {
      label: "50–70%",
      count: students.filter(
        (s) => s.quizzesCompleted > 0 && s.averagePercentage >= 50 && s.averagePercentage < 70
      ).length,
    },
    {
      label: "70–85%",
      count: students.filter(
        (s) => s.quizzesCompleted > 0 && s.averagePercentage >= 70 && s.averagePercentage < 85
      ).length,
    },
    {
      label: "85%+",
      count: students.filter((s) => s.quizzesCompleted > 0 && s.averagePercentage >= 85).length,
    },
  ];
}

export default function AdminProgressPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<AssignedSubjectDto[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<ProgressTab>("students");
  const [leaderboardTake, setLeaderboardTake] = useState<LeaderboardSize>(10);
  const [progress, setProgress] = useState<SubjectProgressDto | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRowDto[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
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
        if (subs.length > 0) setSelectedId(subs[0].subjectId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load subjects"))
      .finally(() => setLoadingSubjects(false));
  }, [router]);

  useEffect(() => {
    if (!selectedId) {
      setProgress(null);
      setLeaderboard([]);
      return;
    }

    setLoadingProgress(true);
    setError(null);

    const load =
      tab === "students"
        ? adminApi.subjectProgress(selectedId).then(setProgress)
        : adminApi.subjectLeaderboard(selectedId, leaderboardTake).then(setLeaderboard);

    load
      .catch((e) => {
        setProgress(null);
        setLeaderboard([]);
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoadingProgress(false));
  }, [selectedId, tab, leaderboardTake]);

  const progressStats = useMemo(() => {
    if (!progress || progress.students.length === 0) return null;
    const active = progress.students.filter((s) => s.quizzesCompleted > 0);
    const atRisk = progress.students.filter((s) => studentRiskLabel(s) === "At risk");
    const avg =
      active.length > 0
        ? Math.round(active.reduce((sum, s) => sum + s.averagePercentage, 0) / active.length)
        : 0;
    return {
      total: progress.students.length,
      active: active.length,
      atRisk: atRisk.length,
      avg,
      buckets: scoreBuckets(progress.students),
      topStudents: [...active]
        .sort((a, b) => b.averagePercentage - a.averagePercentage)
        .slice(0, 6),
      weeklyTrend: buildWeeklyTrend(progress.students),
    };
  }, [progress]);

  const weeklyMax = Math.max(...(progressStats?.weeklyTrend.map((d) => d.accuracy) ?? [0]), 1);
  const selectedSubject = subjects.find((s) => s.subjectId === selectedId);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <BarChart3 className="h-6 w-6 text-[var(--brand)]" />
          Student progress
        </h1>
        <p className="mt-1 text-slate-600">
          Quiz completion and scores for students in your assigned subjects.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {loadingSubjects ? (
          <p className="mt-8 text-slate-500">Loading…</p>
        ) : subjects.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">
            No subjects assigned yet. Ask your institute admin to assign subjects.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-slate-700">
                Subject
              </label>
              <select
                id="subject"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectTitle} ({s.bundleTitle})
                  </option>
                ))}
              </select>
            </div>

            {tab === "students" && progressStats && !loadingProgress && (
              <>
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="Enrolled"
                    value={String(progressStats.total)}
                    sub={selectedSubject?.bundleTitle ?? undefined}
                    icon={Users}
                    accent="bg-gradient-to-br from-slate-600 to-slate-700"
                  />
                  <StatCard
                    label="Active"
                    value={String(progressStats.active)}
                    sub="Completed at least one quiz"
                    icon={TrendingUp}
                    accent="bg-gradient-to-br from-emerald-500 to-emerald-600"
                  />
                  <StatCard
                    label="At risk"
                    value={String(progressStats.atRisk)}
                    sub="Below 50% average"
                    icon={AlertTriangle}
                    accent="bg-gradient-to-br from-amber-500 to-orange-500"
                  />
                  <StatCard
                    label="Class average"
                    value={progressStats.active > 0 ? `${progressStats.avg}%` : "—"}
                    sub="Among active students"
                    icon={Target}
                    accent="bg-gradient-to-br from-blue-500 to-blue-600"
                  />
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                  <Card className="border-slate-200/80 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4 text-[var(--brand)]" />
                        7-day activity trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {progressStats.weeklyTrend.every((d) => d.attempts === 0) ? (
                        <p className="text-sm text-slate-500">
                          Daily class accuracy appears here once students complete quizzes this week.
                        </p>
                      ) : (
                        <div className="flex h-36 items-end justify-between gap-2 pt-2">
                          {progressStats.weeklyTrend.map((day) => (
                            <div key={day.dayLabel} className="flex flex-1 flex-col items-center gap-1">
                              <span className="text-[10px] font-medium text-slate-500">
                                {day.attempts > 0 ? `${day.accuracy}%` : ""}
                              </span>
                              <div className="flex w-full flex-1 items-end">
                                <div
                                  className="w-full rounded-t-md bg-gradient-to-t from-[var(--brand)] to-[var(--brand)]/60 transition-all"
                                  style={{
                                    height: `${Math.max((day.accuracy / weeklyMax) * 100, day.attempts > 0 ? 8 : 2)}%`,
                                    minHeight: day.attempts > 0 ? "0.5rem" : "0.25rem",
                                  }}
                                  title={
                                    day.attempts > 0
                                      ? `${day.attempts} quiz attempt${day.attempts === 1 ? "" : "s"}`
                                      : "No activity"
                                  }
                                />
                              </div>
                              <span className="text-[10px] text-slate-500">{day.dayLabel}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200/80 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4 text-[var(--brand)]" />
                        Score distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {progressStats.active === 0 ? (
                        <p className="text-sm text-slate-500">
                          No quiz activity yet — distribution appears once students start quizzes.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {progressStats.buckets.map((b, i) => {
                            const pct =
                              progressStats.total > 0
                                ? Math.round((b.count / progressStats.total) * 100)
                                : 0;
                            return (
                              <div key={b.label}>
                                <div className="mb-1 flex items-center justify-between text-sm">
                                  <span className="text-slate-700">{b.label}</span>
                                  <span className="font-medium text-slate-800">
                                    {b.count} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={`h-full rounded-full transition-all ${BUCKET_COLORS[i % BUCKET_COLORS.length]}`}
                                    style={{
                                      width: `${Math.max(pct, b.count > 0 ? 4 : 0)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </section>

                <section>
                  <Card className="border-slate-200/80 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Top performers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {progressStats.topStudents.length === 0 ? (
                        <p className="text-sm text-slate-500">No scores yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {progressStats.topStudents.map((s, i) => (
                            <div key={s.userId}>
                              <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="truncate font-medium text-slate-800">
                                  {s.studentName}
                                </span>
                                <span className="ml-2 shrink-0 font-semibold text-slate-700">
                                  {s.averagePercentage}%
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full ${SCORE_BAR_COLORS[i % SCORE_BAR_COLORS.length]}`}
                                  style={{ width: `${Math.max(s.averagePercentage, 4)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>
              </>
            )}

            <div className="flex gap-2">
              {(["students", "leaderboard"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                    tab === t
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t === "students" ? "Student progress" : "Leaderboard"}
                </button>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {tab === "students"
                      ? progress?.subjectTitle ?? "Progress"
                      : `${progress?.subjectTitle ?? selectedSubject?.subjectTitle ?? "Subject"} leaderboard`}
                  </CardTitle>
                  {tab === "leaderboard" && (
                    <div
                      className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs"
                      role="group"
                      aria-label="Leaderboard size"
                    >
                      {([5, 10] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setLeaderboardTake(size)}
                          className={`rounded-md px-2.5 py-1 font-medium ${
                            leaderboardTake === size
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500"
                          }`}
                        >
                          Top {size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingProgress ? (
                  <p className="text-sm text-slate-500">Loading…</p>
                ) : tab === "students" ? (
                  !progress || progress.students.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No enrolled students or quiz activity for this subject yet.
                    </p>
                  ) : (
                    <div>
                      <div className="flex justify-between border-b border-slate-200 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <span>Student</span>
                        <span>Completion · Avg score</span>
                      </div>
                      {[...progress.students]
                        .sort((a, b) => {
                          const riskOrder = (s: StudentSubjectProgressDto) =>
                            studentRiskLabel(s) === "At risk"
                              ? 0
                              : studentRiskLabel(s) === "No activity"
                                ? 1
                                : 2;
                          return riskOrder(a) - riskOrder(b) || a.studentName.localeCompare(b.studentName);
                        })
                        .map((s) => (
                          <StudentRow key={s.userId} student={s} subjectId={selectedId} />
                        ))}
                    </div>
                  )
                ) : leaderboard.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No quiz scores in this subject yet.
                  </p>
                ) : (
                  <ol className="space-y-1.5">
                    {leaderboard.map((l) => (
                      <li
                        key={l.userId}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${rankBadgeClass(l.rank)}`}
                        >
                          {l.rank <= 3 ? (
                            <Medal className="h-4 w-4" />
                          ) : (
                            l.rank
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                          {l.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          {l.points.toLocaleString()} pts
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
