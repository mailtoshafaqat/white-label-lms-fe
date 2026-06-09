"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayCircle, Trophy, Video, BookOpen, Layers, CheckCircle2, BookX } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { loadAndApplyBranding, getTenantSlug, type BrandingDto } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  coursesApi,
  progressApi,
  enrollmentApi,
  liveClassesApi,
  type BundleDto,
  type TopicDto,
  type GradeDto,
  type LeaderboardRowDto,
  type EnrollmentDto,
  type LiveClassDto,
} from "@/lib/api";
import { getSession, clearSession, isAdmin, isSuperAdmin, canSelfEnroll } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [admin, setAdmin] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [selfEnroll, setSelfEnroll] = useState(false);
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRowDto[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClassDto[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingDto | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setName(session.fullName);
    setAdmin(isAdmin(session));
    setSuperAdmin(isSuperAdmin(session));
    setSelfEnroll(canSelfEnroll(session));

    const slug = session.tenant?.slug ?? getTenantSlug();
    loadAndApplyBranding(slug).then(setBranding);

    Promise.all([
      coursesApi.bundles(),
      coursesApi.recentTopics(3),
      progressApi.myGrades(),
      progressApi.leaderboard(10),
      enrollmentApi.myEnrollments(),
      liveClassesApi.mine(),
    ])
      .then(([b, t, g, l, e, lc]) => {
        setBundles(b);
        setTopics(t);
        setGrades(g);
        setLeaderboard(l);
        setEnrollments(e);
        setLiveClasses(lc);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function enroll(bundleId: string) {
    setEnrolling(bundleId);
    setError(null);
    try {
      const e = await enrollmentApi.enroll(bundleId);
      setEnrollments((prev) => [e, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enroll failed");
    } finally {
      setEnrolling(null);
    }
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <BrandHeader branding={branding} />
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">Hi, {name || "there"}</span>
          {superAdmin && (
            <Link href="/superadmin" className="font-medium text-slate-800 hover:underline">
              Platform
            </Link>
          )}
          {admin && !superAdmin && (
            <Link href="/admin" className="font-medium text-[var(--brand)] hover:underline">
              Admin
            </Link>
          )}
          <button onClick={logout} className="text-slate-500 hover:text-slate-800">
            Log out
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-semibold text-white">
            {(name || "A").charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">Continue where you left off.</p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error} — is the API running on port 5237?
          </p>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {loading ? (
            <p className="text-slate-500">Loading courses…</p>
          ) : (
            bundles.map((b) => {
              const enrolled = enrollments.find((e) => e.bundleId === b.id);
              return (
                <Card key={b.id}>
                  <CardHeader>
                    <CardTitle>{b.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>{b.subjectCount} subjects</span>
                      <span>Rs. {b.price.toLocaleString()}</span>
                    </div>
                    <div className="mt-4">
                      {enrolled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Enrolled · expires{" "}
                          {new Date(enrolled.expiresAt).toLocaleDateString()}
                        </span>
                      ) : selfEnroll ? (
                        <Button
                          size="sm"
                          onClick={() => enroll(b.id)}
                          disabled={enrolling === b.id}
                        >
                          {enrolling === b.id ? "Enrolling…" : "Enroll"}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Contact your institute to enroll
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Continue learning</h2>
            <Link
              href="/mistakes"
              className="flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:underline"
            >
              <BookX className="h-4 w-4" /> Mistake diary
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {topics.map((t) => (
              <Link key={t.id} href={`/topic/${t.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-5">
                    <PlayCircle className="h-8 w-8 text-[var(--brand)]" />
                    <h3 className="mt-3 font-semibold text-slate-900">{t.title}</h3>
                    <div className="mt-2 flex gap-4 text-xs text-slate-500">
                      {t.hasVideo && (
                        <span className="flex items-center gap-1">
                          <Video className="h-3.5 w-3.5" /> Video
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> {t.mcqCount} MCQs
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" /> {t.flashcardCount} cards
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>My Grades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {grades.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No attempts yet. Take a Daily Practice Test to see your grades here.
                </p>
              ) : (
                grades.map((g, i) => (
                  <div key={`${g.quizId}-${i}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{g.quizTitle}</span>
                      <span className="text-slate-600">
                        {g.score}/{g.total} ({g.percentage}%)
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-[var(--brand)]"
                        style={{ width: `${g.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-slate-500">No scores yet — be the first on the board.</p>
              ) : (
                leaderboard.map((l) => (
                  <div
                    key={l.userId}
                    className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                      l.isMe ? "bg-blue-50 font-semibold" : ""
                    }`}
                  >
                    <span className="text-slate-700">
                      #{l.rank} {l.isMe ? "You" : l.name}
                    </span>
                    <span className="text-slate-500">{l.points.toLocaleString()} pts</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-4 w-4 text-[var(--brand)]" /> Live classes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveClasses.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming classes for your courses.</p>
              ) : (
                liveClasses.map((c) => (
                  <div key={c.id} className="rounded-md border border-slate-100 p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{c.title}</p>
                      {c.state === "Live" && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.bundleTitle} · {new Date(c.scheduledStartUtc).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.state !== "Ended" && c.state !== "Cancelled" && (
                        <a href={c.joinUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant={c.state === "Live" ? "default" : "outline"}>
                            {c.state === "Live" ? "Join now" : "Join"}
                          </Button>
                        </a>
                      )}
                      {c.recordingUrl && (
                        <a href={c.recordingUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline">
                            Watch recording
                          </Button>
                        </a>
                      )}
                    </div>
                    {c.passcode && (
                      <p className="mt-1 text-xs text-slate-400">Passcode: {c.passcode}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
