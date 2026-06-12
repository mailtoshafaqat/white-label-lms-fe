"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Download, Users } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminApi,
  API_BASE_URL,
  coursesApi,
  type BundleDto,
  type CohortAnalyticsOverviewDto,
  type CohortStudentRowDto,
} from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

async function downloadCohortCsv(bundleId: string) {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  const tenantSlug = session?.tenant?.slug ?? localStorage.getItem("lms.tenantSlug");
  if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;

  const res = await fetch(
    `${API_BASE_URL}/api/v1/admin/analytics/cohort/export?bundleId=${encodeURIComponent(bundleId)}`,
    { headers }
  );
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cohort-${bundleId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [bundleId, setBundleId] = useState("");
  const [overview, setOverview] = useState<CohortAnalyticsOverviewDto | null>(null);
  const [students, setStudents] = useState<CohortStudentRowDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/login");
      return;
    }
    coursesApi.bundles().then(setBundles).catch(() => setBundles([]));
  }, [router]);

  useEffect(() => {
    if (!bundleId) {
      setOverview(null);
      setStudents([]);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([adminApi.cohortAnalytics(bundleId), adminApi.cohortStudents(bundleId)])
      .then(([ov, rows]) => {
        setOverview(ov);
        setStudents(rows);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [bundleId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <BarChart3 className="h-7 w-7 text-[var(--brand)]" />
              Cohort analytics
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Completion, quiz accuracy, and video watch progress by enrolled students.
            </p>
          </div>
          {bundleId && (
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
              onClick={() => {
                setExporting(true);
                downloadCohortCsv(bundleId).catch((e) =>
                  setError(e instanceof Error ? e.message : "Export failed")
                ).finally(() => setExporting(false));
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          )}
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-slate-700">Course / batch</label>
          <select
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value)}
            className="mt-1 h-10 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Select a bundle…</option>
            {bundles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {loading && <p className="mt-6 text-sm text-slate-500">Loading analytics…</p>}

        {overview && !loading && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Users className="h-8 w-8 text-[var(--brand)]" />
                  <div>
                    <p className="text-xs text-slate-500">Enrolled</p>
                    <p className="text-2xl font-bold">{overview.enrolledStudents}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Avg completion</p>
                  <p className="text-2xl font-bold">{overview.avgCompletionPercent}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Avg quiz accuracy</p>
                  <p className="text-2xl font-bold">{overview.avgQuizAccuracy}%</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 border-slate-200/80">
              <CardHeader>
                <CardTitle className="text-base">Students in {overview.bundleTitle}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-slate-500">
                      <th className="pb-2 pr-4">Student</th>
                      <th className="pb-2 pr-4">Completion</th>
                      <th className="pb-2 pr-4">Quiz avg</th>
                      <th className="pb-2 pr-4">Videos</th>
                      <th className="pb-2">Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.userId} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{s.studentName}</td>
                        <td className="py-2.5 pr-4">
                          {s.completionPercent}% ({s.topicsCompleted}/{s.topicsTotal})
                        </td>
                        <td className="py-2.5 pr-4">{s.avgQuizAccuracy}%</td>
                        <td className="py-2.5 pr-4">
                          {s.videosWatched}/{s.videosTotal}
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {s.lastActiveAt
                            ? new Date(s.lastActiveAt).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {students.length === 0 && (
                  <p className="py-4 text-sm text-slate-500">No enrolled students in this bundle.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
