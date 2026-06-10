"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, type StudentDetailDto } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string; userId: string }>;
}) {
  const { subjectId, userId } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<StudentDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/dashboard");
      return;
    }
    adminApi
      .studentDetail(subjectId, userId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [subjectId, userId, router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/admin/progress"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to progress
        </Link>

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : error ? (
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : detail ? (
          <>
            <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-slate-900">
              <BarChart3 className="h-6 w-6 text-[var(--brand)]" />
              {detail.studentName}
            </h1>
            <p className="mt-1 text-slate-600">
              {detail.subjectTitle} · {detail.quizzesCompleted} quizzes · avg{" "}
              {detail.averagePercentage}%
              {detail.lastActiveAt
                ? ` · last active ${new Date(detail.lastActiveAt).toLocaleString()}`
                : ""}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Doubts</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  <p>{detail.doubts.openCount} open · {detail.doubts.resolvedCount} resolved</p>
                  {detail.doubts.lastActivityAt && (
                    <p className="mt-1 text-xs text-slate-400">
                      Last activity {new Date(detail.doubts.lastActivityAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Mistakes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  <p>
                    {detail.mistakes.unresolvedCount} unresolved ·{" "}
                    {detail.mistakes.totalWrongAttempts} wrong attempts
                  </p>
                  {detail.mistakes.lastSeenAt && (
                    <p className="mt-1 text-xs text-slate-400">
                      Last seen {new Date(detail.mistakes.lastSeenAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quiz grades (best per quiz)</CardTitle>
              </CardHeader>
              <CardContent>
                {detail.grades.length === 0 ? (
                  <p className="text-sm text-slate-500">No quiz attempts in this subject yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.grades.map((g) => (
                      <li key={g.quizId} className="flex justify-between text-sm">
                        <span className="font-medium text-slate-800">{g.quizTitle}</span>
                        <span className="text-slate-600">
                          {g.bestScore}/{g.total} ({g.percentage}%) ·{" "}
                          {new Date(g.submittedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
