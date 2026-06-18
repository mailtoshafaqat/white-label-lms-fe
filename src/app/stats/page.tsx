"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BarChart3, Flame, Target, TrendingDown, TrendingUp } from "lucide-react";
import { StudentNav } from "@/components/student-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { progressApi, type StudentStatsDto } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { loadAndApplyBranding, type BrandingDto } from "@/lib/branding";

const SUBJECT_BAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StudentStatsDto | null>(null);
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    loadAndApplyBranding().then(setBranding);
    progressApi
      .stats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  const weeklyMax = Math.max(...(stats?.weeklyTrend.map((d) => d.accuracy) ?? [0]), 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-white to-slate-50">
      <StudentNav branding={branding} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Stats</h1>
          <p className="mt-1 text-sm text-slate-600">Progress and quiz performance across your subjects</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
        {loading && <p className="text-slate-500">Loading…</p>}

        {stats && (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-slate-200/80 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Accuracy</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{stats.overallAccuracy}%</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    {stats.accuracyChangeThisWeek >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    {stats.accuracyChangeThisWeek >= 0 ? "+" : ""}
                    {stats.accuracyChangeThisWeek}% this week
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">MCQs this month</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{stats.mcqsAttemptedThisMonth}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Target className="h-3.5 w-3.5" /> Attempted
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Practice streak</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{stats.practiceStreakDays}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Flame className="h-3.5 w-3.5 text-orange-500" /> Days
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Subjects tracked</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{stats.subjectCompletion.length}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <BarChart3 className="h-3.5 w-3.5" /> Enrolled
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Subject completion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.subjectCompletion.length === 0 ? (
                    <p className="text-sm text-slate-500">No subject data yet.</p>
                  ) : (
                    stats.subjectCompletion.map((s, i) => (
                      <div key={s.subjectId}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-800">{s.subjectTitle}</span>
                          <span className="font-semibold text-slate-700">{s.percentComplete}%</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${SUBJECT_BAR_COLORS[i % SUBJECT_BAR_COLORS.length]}`}
                            style={{ width: `${Math.max(s.percentComplete, 4)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {s.topicsCompleted}/{s.topicsTotal} topics complete
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Weekly trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-40 items-end justify-between gap-2">
                    {stats.weeklyTrend.map((day) => (
                      <div key={day.dayLabel} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className="w-full rounded-t-md bg-[var(--brand)]/80 transition-all"
                            style={{
                              height: `${Math.max((day.accuracy / weeklyMax) * 100, day.attempts > 0 ? 8 : 2)}%`,
                            }}
                            title={`${day.accuracy}% · ${day.attempts} attempts`}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">{day.dayLabel}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  Back to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
