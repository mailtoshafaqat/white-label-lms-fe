"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayCircle, Trophy, Video, BookOpen, Layers, CheckCircle2, BookX, Brain, MessageCircleQuestion, Medal } from "lucide-react";
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

type LeaderboardSize = 5 | 10;

const LEADERBOARD_SIZE_KEY = "leaderboardTake";

function readLeaderboardSize(): LeaderboardSize {
  if (typeof window === "undefined") return 10;
  return localStorage.getItem(LEADERBOARD_SIZE_KEY) === "5" ? 5 : 10;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-amber-100 text-amber-800 ring-amber-200";
  if (rank === 2) return "bg-slate-200 text-slate-700 ring-slate-300";
  if (rank === 3) return "bg-orange-100 text-orange-800 ring-orange-200";
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

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
  const [leaderboardTake, setLeaderboardTake] = useState<LeaderboardSize>(() => readLeaderboardSize());
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
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
    if (isSuperAdmin(session)) {
      router.replace("/superadmin");
      return;
    }
    if (isAdmin(session)) {
      router.replace("/admin");
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
      enrollmentApi.myEnrollments(),
      liveClassesApi.mine(),
    ])
      .then(([b, t, g, e, lc]) => {
        setBundles(b);
        setTopics(t);
        setGrades(g);
        setEnrollments(e);
        setLiveClasses(lc);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const session = getSession();
    if (!session || isSuperAdmin(session) || isAdmin(session)) return;

    setLeaderboardLoading(true);
    progressApi
      .leaderboard(leaderboardTake)
      .then(setLeaderboard)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load leaderboard"))
      .finally(() => setLeaderboardLoading(false));
  }, [leaderboardTake]);

  function setLeaderboardSize(size: LeaderboardSize) {
    setLeaderboardTake(size);
    localStorage.setItem(LEADERBOARD_SIZE_KEY, String(size));
  }

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
          <Link href="/account/password" className="text-slate-500 hover:text-slate-800">
            Change password
          </Link>
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
        <p className="mt-1 text-slate-600">
          Continue where you left off.{" "}
          <Link href="/mock-exams" className="font-medium text-[var(--brand)] hover:underline">
            Mock exams
          </Link>
        </p>

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Continue learning</h2>
            <div className="flex flex-wrap gap-3">
              {branding?.syllabusMentorEnabled !== false && (
                <Link
                  href="/mentor"
                  className="flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:underline"
                >
                  <Brain className="h-4 w-4" /> Syllabus Mentor
                </Link>
              )}
              <Link
                href="/doubts"
                className="flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:underline"
              >
                <MessageCircleQuestion className="h-4 w-4" /> Ask Teacher
              </Link>
              <Link
                href="/mistakes"
                className="flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:underline"
              >
                <BookX className="h-4 w-4" /> Mistake diary
              </Link>
            </div>
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
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" /> Leaderboard
                </CardTitle>
                <div
                  className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs"
                  role="group"
                  aria-label="Leaderboard size"
                >
                  {([5, 10] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setLeaderboardSize(size)}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        leaderboardTake === size
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Top {size}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Best score per quiz, summed — top {leaderboardTake} in your institute
              </p>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <p className="text-sm text-slate-500">Loading rankings…</p>
              ) : leaderboard.length === 0 ? (
                <p className="text-sm text-slate-500">No scores yet — be the first on the board.</p>
              ) : (
                <ol className="space-y-1.5">
                  {leaderboard.map((l) => (
                    <li
                      key={l.userId}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                        l.isMe
                          ? "border-[var(--brand)]/30 bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]/20"
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${rankBadgeClass(l.rank)}`}
                        aria-hidden
                      >
                        {l.rank <= 3 ? (
                          <Medal className={`h-4 w-4 ${l.rank === 1 ? "text-amber-600" : l.rank === 2 ? "text-slate-600" : "text-orange-600"}`} />
                        ) : (
                          l.rank
                        )}
                      </span>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          l.isMe ? "bg-[var(--brand)] text-white" : "bg-slate-100 text-slate-600"
                        }`}
                        aria-hidden
                      >
                        {initials(l.isMe ? name || l.name : l.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${l.isMe ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>
                          {l.isMe ? "You" : l.name}
                        </p>
                        <p className="text-xs text-slate-500">Rank #{l.rank}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        {l.points.toLocaleString()} pts
                      </span>
                    </li>
                  ))}
                </ol>
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
                      {c.subjectTitle} · {c.hostName} · {new Date(c.scheduledStartUtc).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.state !== "Ended" && c.state !== "Cancelled" && (
                        <Button
                          size="sm"
                          variant={c.state === "Live" ? "default" : "outline"}
                          onClick={async () => {
                            try {
                              const res = await liveClassesApi.recordJoin(c.id);
                              window.open(res.joinUrl, "_blank", "noopener,noreferrer");
                            } catch {
                              window.open(c.joinUrl, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          {c.state === "Live" ? "Join now" : "Join"}
                        </Button>
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
