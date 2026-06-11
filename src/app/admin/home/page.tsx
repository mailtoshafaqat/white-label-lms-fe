"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  MessageCircleQuestion,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { LiveClassActions } from "@/components/live-class-actions";
import {
  adminApi,
  doubtsApi,
  type AdminLiveClassDto,
  type AssignedSubjectDto,
  type DoubtThreadSummaryDto,
} from "@/lib/api";
import { getSession, isTeacherRole, canManageInstitute } from "@/lib/auth";

export default function TeacherHomePage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<AssignedSubjectDto[]>([]);
  const [doubts, setDoubts] = useState<DoubtThreadSummaryDto[]>([]);
  const [openDoubtTotal, setOpenDoubtTotal] = useState(0);
  const [classes, setClasses] = useState<AdminLiveClassDto[]>([]);
  const [liveNow, setLiveNow] = useState<AdminLiveClassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isTeacherRole(session)) {
      router.replace(canManageInstitute(session) ? "/admin" : "/dashboard");
      return;
    }
    setName(session.fullName);

    Promise.all([
      adminApi.mySubjects(),
      doubtsApi.adminList({ status: "open", page: 1, pageSize: 5 }),
      adminApi.listLiveClasses({ state: "upcoming", page: 1, pageSize: 5 }),
      adminApi.listLiveClasses({ state: "live", page: 1, pageSize: 3 }),
    ])
      .then(([subs, doubtPage, upcoming, live]) => {
        setSubjects(subs);
        setDoubts(doubtPage.data);
        setOpenDoubtTotal(doubtPage.total);
        setClasses(upcoming.data);
        setLiveNow(live.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Teacher home</h1>
        <p className="mt-1 text-slate-600">
          {name ? `Welcome back, ${name}.` : "Welcome back."} Here is what needs your attention
          across your assigned subjects.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {loading ? (
          <p className="mt-8 text-slate-500">Loading…</p>
        ) : (
          <div className="mt-8 space-y-6">
            {liveNow.length > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-red-800">
                    <Video className="h-4 w-4" /> Live now
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {liveNow.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-100 bg-white p-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{c.title}</p>
                        <p className="text-xs text-slate-500">
                          {c.subjectTitle} · {new Date(c.scheduledStartUtc).toLocaleString()}
                        </p>
                      </div>
                      <LiveClassActions
                        state={c.state}
                        scheduledStartUtc={c.scheduledStartUtc}
                        startUrl={c.startUrl}
                        joinUrl={c.joinUrl}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <MessageCircleQuestion className="h-4 w-4 text-[var(--brand)]" />
                      Open doubts
                    </span>
                    <span className="text-sm font-normal text-slate-500">{openDoubtTotal}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {doubts.length === 0 ? (
                    <p className="text-sm text-slate-500">No open student questions.</p>
                  ) : (
                    <ul className="space-y-2">
                      {doubts.map((d) => (
                        <li key={d.id}>
                          <Link
                            href={`/admin/doubts/${d.id}`}
                            className="block rounded-md border border-slate-100 p-2 text-sm hover:bg-slate-50"
                          >
                            <p className="font-medium text-slate-800">{d.title}</p>
                            <p className="text-xs text-slate-500">
                              {d.studentName} · {d.subjectTitle}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/admin/doubts">View all doubts</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Video className="h-4 w-4 text-[var(--brand)]" />
                    Upcoming classes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {classes.length === 0 ? (
                    <p className="text-sm text-slate-500">No upcoming live classes scheduled.</p>
                  ) : (
                    <ul className="space-y-2">
                      {classes.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-md border border-slate-100 p-2 text-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-800">{c.title}</p>
                              <p className="text-xs text-slate-500">
                                {c.subjectTitle} · {new Date(c.scheduledStartUtc).toLocaleString()}
                              </p>
                            </div>
                            <LiveClassActions
                              state={c.state}
                              scheduledStartUtc={c.scheduledStartUtc}
                              startUrl={c.startUrl}
                              joinUrl={c.joinUrl}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/admin/live-classes">Manage live classes</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[var(--brand)]" />
                    Student progress
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  View quiz scores and completion for students in your assigned subjects.
                </p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/admin/progress">View progress</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-[var(--brand)]" />
                  My subjects
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subjects.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No subjects assigned yet. Ask your institute admin to assign subjects at{" "}
                    <span className="font-medium">Admin → Teachers</span>.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {subjects.map((s) => (
                      <li key={s.subjectId}>
                        <Link
                          href="/admin"
                          className="flex items-center justify-between py-3 text-sm hover:text-[var(--brand)]"
                        >
                          <div>
                            <p className="font-medium text-slate-800">{s.subjectTitle}</p>
                            <p className="text-xs text-slate-500">{s.bundleTitle}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/admin">
                    <ClipboardList className="h-4 w-4" />
                    Edit course content
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
