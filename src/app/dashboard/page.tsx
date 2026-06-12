"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlayCircle,
  Trophy,
  Video,
  BookOpen,
  Layers,
  BookX,
  Brain,
  MessageCircleQuestion,
  Medal,
  Bookmark,
  Target,
  Flame,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Zap,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { GlobalSearch } from "@/components/global-search";
import { loadAndApplyBranding, getTenantSlug, mentorLabel, type BrandingDto } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  authApi,
  API_BASE_URL,
  coursesApi,
  progressApi,
  enrollmentApi,
  liveClassesApi,
  type BundleDto,
  type TopicDto,
  type LeaderboardRowDto,
  type EnrollmentDto,
  type LiveClassDto,
  type DashboardOverviewDto,
} from "@/lib/api";
import { canStudentJoinLiveClass, liveClassJoinHint } from "@/lib/live-class-utils";
import { getSession, clearSession, isAdmin, isSuperAdmin, canSelfEnroll } from "@/lib/auth";
import { useAuthSession } from "@/lib/use-auth-session";
import {
  hasDoubts,
  hasMockExams,
  hasMistakeDiary,
  hasSyllabusMentor,
} from "@/lib/product-profile";
import { isVideosOnlyStudent } from "@/lib/student-access";

type LeaderboardSize = 5 | 10;

const LEADERBOARD_SIZE_KEY = "leaderboardTake";

const SUBJECT_BAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function readLeaderboardSize(): LeaderboardSize {
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

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
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
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            {sub && <div className="mt-1.5 text-xs text-slate-500">{sub}</div>}
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const authSession = useAuthSession();
  const [name, setName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [selfEnroll, setSelfEnroll] = useState(false);
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [overview, setOverview] = useState<DashboardOverviewDto | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRowDto[]>([]);
  const [leaderboardTake, setLeaderboardTake] = useState<LeaderboardSize>(10);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClassDto[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingDto | null>(null);

  useEffect(() => {
    setLeaderboardTake(readLeaderboardSize());
  }, []);

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
    void authApi.me().then((p) => {
      setName(p.fullName);
      setProfilePictureUrl(p.profilePictureUrl);
    });
    setAdmin(isAdmin(session));
    setSuperAdmin(isSuperAdmin(session));
    setSelfEnroll(canSelfEnroll(session));

    const slug = session.tenant?.slug ?? getTenantSlug();
    loadAndApplyBranding(slug).then(setBranding);

    Promise.all([
      coursesApi.bundles(),
      coursesApi.recentTopics(3),
      progressApi.dashboard(),
      enrollmentApi.myEnrollments(),
      liveClassesApi.mine(),
    ])
      .then(([b, t, dash, e, lc]) => {
        setBundles(b);
        setTopics(t);
        setOverview(dash);
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
      const dash = await progressApi.dashboard();
      setOverview(dash);
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

  const videosOnly = isVideosOnlyStudent(enrollments);
  const enrolledBundleIds = new Set(
    enrollments.filter((e) => e.isActive).map((e) => e.bundleId),
  );
  const visibleBundles = videosOnly
    ? bundles.filter((b) => enrolledBundleIds.has(b.id))
    : bundles;
  const recentVideoTopics = videosOnly ? topics.filter((t) => t.hasVideo) : topics;
  const academyName = branding?.displayName ?? authSession?.tenant?.tenantName ?? "your academy";
  const primaryCourse =
    overview?.bundleProgress[0]?.bundleTitle ??
    enrollments[0]?.bundleTitle ??
    bundles.find((b) => enrollments.some((e) => e.bundleId === b.id))?.title;
  const weeklyMax = Math.max(...(overview?.weeklyTrend.map((d) => d.accuracy) ?? [0]), 1);

  const quickActions = videosOnly
    ? [{ href: "/videos", label: "Video library", icon: Video, show: true }]
    : [
        { href: "/videos", label: "Video library", icon: Video, show: true },
        { href: "/bookmarks", label: "Bookmarks", icon: Bookmark, show: true },
        {
          href: "/weakness-quiz",
          label: "Weakness quiz",
          icon: Target,
          show: hasMistakeDiary(authSession?.tenant),
        },
        {
          href: "/mistakes",
          label: "Mistake diary",
          icon: BookX,
          show: hasMistakeDiary(authSession?.tenant),
        },
        {
          href: "/mentor",
          label: mentorLabel(branding),
          icon: Brain,
          show: hasSyllabusMentor(authSession?.tenant, branding?.syllabusMentorEnabled),
        },
        {
          href: "/doubts",
          label: "Ask teacher",
          icon: MessageCircleQuestion,
          show: hasDoubts(authSession?.tenant),
        },
        { href: "#leaderboard", label: "Leaderboard", icon: Trophy, show: true },
        ...(hasMockExams(authSession?.tenant)
          ? [{ href: "/mock-exams", label: "Mock exams", icon: Medal, show: true }]
          : []),
      ].filter((a) => a.show);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-white to-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandHeader branding={branding} />
          <div className="flex items-center gap-3 text-sm">
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
            <Link href="/account/password" className="hidden text-slate-500 hover:text-slate-800 sm:inline">
              Password
            </Link>
            <button onClick={logout} className="text-slate-500 hover:text-slate-800">
              Log out
            </button>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--brand)] text-sm font-semibold text-white ring-2 ring-white shadow">
              {profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    profilePictureUrl.startsWith("http")
                      ? profilePictureUrl
                      : `${API_BASE_URL}${profilePictureUrl}`
                  }
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(name || "A")
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {!videosOnly && (
          <div className="mb-6">
            <GlobalSearch />
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-[var(--brand)] p-6 text-white shadow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-[var(--brand)]/30 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">{academyName}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {timeGreeting()}, {firstName(name || "there")}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
                {videosOnly ? (
                  primaryCourse ? (
                    <>
                      Your <strong className="text-white">video lectures</strong> plan for{" "}
                      <strong className="text-white">{primaryCourse}</strong> is active. Open the video library to
                      start watching.
                    </>
                  ) : (
                    "Your video lectures plan is active. Open the video library when content is added."
                  )
                ) : primaryCourse ? (
                  <>
                    You&apos;re enrolled in <strong className="text-white">{primaryCourse}</strong>.
                    {overview && overview.overallAccuracy > 0
                      ? " Keep practicing to climb the leaderboard."
                      : " Take your first quiz to unlock your performance stats."}
                  </>
                ) : (
                  "Explore courses below and start your learning journey."
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {overview && overview.practiceStreakDays > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20 backdrop-blur-sm">
                  <Flame className="h-5 w-5 text-orange-300" />
                  <div>
                    <p className="text-lg font-bold leading-none">{overview.practiceStreakDays}</p>
                    <p className="text-xs text-white/70">day streak</p>
                  </div>
                </div>
              )}
              {overview?.instituteRank != null && (
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20 backdrop-blur-sm">
                  <Trophy className="h-5 w-5 text-amber-300" />
                  <div>
                    <p className="text-lg font-bold leading-none">#{overview.instituteRank}</p>
                    <p className="text-xs text-white/70">institute rank</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[var(--brand)]/40 hover:text-[var(--brand)]"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        {videosOnly && !loading && (
          <section className="mt-6">
            <Card className="border-violet-200 bg-violet-50/50">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Video lectures plan</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Watch recorded lectures from your enrolled subjects in one place.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/videos">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Open video library
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* KPI cards */}
        {!videosOnly && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
            ))
          ) : (
            <>
              <StatCard
                label="Overall accuracy"
                value={overview ? `${overview.overallAccuracy}%` : "—"}
                sub={
                  overview && overview.accuracyChangeThisWeek !== 0 ? (
                    <span
                      className={
                        overview.accuracyChangeThisWeek > 0
                          ? "inline-flex items-center gap-0.5 text-emerald-600"
                          : "inline-flex items-center gap-0.5 text-red-600"
                      }
                    >
                      {overview.accuracyChangeThisWeek > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {overview.accuracyChangeThisWeek > 0 ? "+" : ""}
                      {overview.accuracyChangeThisWeek}% this week
                    </span>
                  ) : (
                    "Best score per quiz averaged"
                  )
                }
                icon={Target}
                accent="bg-gradient-to-br from-blue-500 to-blue-600"
              />
              <StatCard
                label="MCQs attempted"
                value={overview ? overview.mcqsAttemptedThisMonth.toLocaleString() : "0"}
                sub="This month"
                icon={Zap}
                accent="bg-gradient-to-br from-violet-500 to-violet-600"
              />
              <StatCard
                label="Institute rank"
                value={
                  overview?.instituteRank != null ? `#${overview.instituteRank}` : "—"
                }
                sub={
                  overview && overview.instituteStudentCount > 0
                    ? `of ${overview.instituteStudentCount} active students`
                    : "Take a quiz to get ranked"
                }
                icon={Trophy}
                accent="bg-gradient-to-br from-amber-500 to-orange-500"
              />
              <StatCard
                label="Practice streak"
                value={overview ? `${overview.practiceStreakDays}` : "0"}
                sub={overview?.practiceStreakDays === 1 ? "day in a row" : "days in a row"}
                icon={Flame}
                accent="bg-gradient-to-br from-rose-500 to-pink-600"
              />
            </>
          )}
        </section>
        )}

        {/* Analytics row */}
        {!videosOnly && (
        <section className="mt-6 grid gap-6 lg:grid-cols-5">
          <Card className="border-slate-200/80 shadow-sm lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-[var(--brand)]" />
                Subject accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!overview || overview.subjectAccuracy.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Complete topic quizzes to see which subjects need more work.
                </p>
              ) : (
                <div className="space-y-4">
                  {overview.subjectAccuracy.map((s, i) => (
                    <div key={s.subjectId}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{s.subjectTitle}</span>
                        <span className="font-semibold text-slate-700">{s.accuracy}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${SUBJECT_BAR_COLORS[i % SUBJECT_BAR_COLORS.length]}`}
                          style={{ width: `${Math.max(s.accuracy, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {overview.weakestSubject && hasMistakeDiary(authSession?.tenant) && (
                    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-amber-900">
                        <strong>{overview.weakestSubject.subjectTitle}</strong> is your weakest
                        subject — start a targeted quiz to improve.
                      </p>
                      <Link href="/weakness-quiz">
                        <Button size="sm" className="shrink-0 gap-1">
                          Start quiz <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="leaderboard" className="border-slate-200/80 shadow-sm lg:col-span-2">
            <CardHeader className="space-y-3 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Leaderboard
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
              <p className="text-xs text-slate-500">This week · your institute</p>
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
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                        l.isMe
                          ? "border-[var(--brand)]/40 bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]/20"
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${rankBadgeClass(l.rank)}`}
                      >
                        {l.rank <= 3 ? (
                          <Medal
                            className={`h-3.5 w-3.5 ${l.rank === 1 ? "text-amber-600" : l.rank === 2 ? "text-slate-600" : "text-orange-600"}`}
                          />
                        ) : (
                          l.rank
                        )}
                      </span>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                          l.isMe ? "bg-[var(--brand)] text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {initials(l.isMe ? name || l.name : l.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${l.isMe ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}
                        >
                          {l.isMe ? `You — ${firstName(name || l.name)}` : l.name}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-amber-700">
                        {l.points.toLocaleString()} pts
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </section>
        )}

        {/* Weekly trend + live classes */}
        {!videosOnly && (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-[var(--brand)]" />
                Weekly score trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!overview || overview.weeklyTrend.every((d) => d.attempts === 0) ? (
                <p className="text-sm text-slate-500">Your daily accuracy will appear here after you practice.</p>
              ) : (
                <div className="flex h-36 items-end justify-between gap-2 pt-2">
                  {overview.weeklyTrend.map((day) => (
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
                <Video className="h-4 w-4 text-[var(--brand)]" />
                Live classes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveClasses.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming classes for your courses.</p>
              ) : (
                liveClasses.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-3 ${
                      c.state === "Live"
                        ? "border-red-200 bg-red-50/50"
                        : "border-slate-100 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{c.title}</p>
                      {c.state === "Live" && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {c.subjectTitle} · {new Date(c.scheduledStartUtc).toLocaleString()}
                    </p>
                    <div className="mt-2">
                      {c.state !== "Ended" && c.state !== "Cancelled" && (
                        canStudentJoinLiveClass(c.state) ? (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await liveClassesApi.recordJoin(c.id);
                                window.open(res.joinUrl, "_blank", "noopener,noreferrer");
                              } catch {
                                window.open(c.joinUrl, "_blank", "noopener,noreferrer");
                              }
                            }}
                          >
                            Join now
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            title={liveClassJoinHint(c.state, c.scheduledStartUtc)}
                          >
                            Set reminder
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
        )}

        {/* Courses */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">
            {videosOnly ? "My video plan" : "My courses"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {loading ? (
              <p className="text-slate-500">Loading courses…</p>
            ) : (
              visibleBundles.length === 0 ? (
                <p className="text-sm text-slate-500">No enrolled video plans yet.</p>
              ) : (
                visibleBundles.map((b) => {
                  const enrolled = enrollments.find((e) => e.bundleId === b.id && e.isActive);
                  const progress = overview?.bundleProgress.find((p) => p.bundleId === b.id);
                  return (
                    <Card
                      key={b.id}
                      className={`overflow-hidden border-slate-200/80 shadow-sm transition hover:shadow-md ${
                        enrolled ? "ring-1 ring-[var(--brand)]/10" : ""
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-snug">{b.title}</CardTitle>
                          {enrolled && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                              Enrolled
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>{b.subjectCount} subjects</span>
                          {!enrolled && !videosOnly && (
                            <span>Rs. {b.price.toLocaleString()}</span>
                          )}
                        </div>
                        {enrolled && !videosOnly && progress && progress.topicsTotal > 0 && (
                          <div className="mt-4">
                            <div className="mb-1 flex justify-between text-xs text-slate-500">
                              <span>{progress.percentComplete}% complete</span>
                              <span>
                                {progress.topicsTotal - progress.topicsCompleted} topics remaining
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand)]/70"
                                style={{ width: `${progress.percentComplete}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {enrolled && (
                          <p className="mt-3 text-xs text-slate-500">
                            Expires {new Date(enrolled.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                        {videosOnly && enrolled && (
                          <div className="mt-4">
                            <Button size="sm" variant="outline" asChild>
                              <Link href="/videos">
                                <Video className="mr-2 h-3.5 w-3.5" />
                                Browse lectures
                              </Link>
                            </Button>
                          </div>
                        )}
                        <div className="mt-4">
                          {enrolled || videosOnly ? null : selfEnroll ? (
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
              )
            )}
          </div>
        </section>

        {/* Continue learning / recent videos */}
        {recentVideoTopics.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {videosOnly ? "Recent videos" : "Continue learning"}
              </h2>
              {videosOnly && (
                <Link
                  href="/videos"
                  className="text-sm font-medium text-[var(--brand)] hover:underline"
                >
                  View all
                </Link>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {recentVideoTopics.map((t) => (
                <Link key={t.id} href={`/topic/${t.id}`}>
                  <Card className="h-full border-slate-200/80 shadow-sm transition hover:border-[var(--brand)]/30 hover:shadow-md">
                    <CardContent className="pt-5">
                      <PlayCircle className="h-8 w-8 text-[var(--brand)]" />
                      <h3 className="mt-3 font-semibold text-slate-900">{t.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        {t.hasVideo && (
                          <span className="flex items-center gap-1">
                            <Video className="h-3.5 w-3.5" /> Video lecture
                          </span>
                        )}
                        {!videosOnly && (
                          <>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5" /> {t.mcqCount} MCQs
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5" /> {t.flashcardCount} cards
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
