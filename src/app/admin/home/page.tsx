"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  MessageCircleQuestion,
  Settings,
  Users,
  UserCircle2,
  Video,
  ListChecks,
  Layers,
  Trophy,
  Calendar,
  ArrowRight,
  CircleHelp,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { LiveClassActions } from "@/components/live-class-actions";
import { StorageUsageCard } from "@/components/storage-usage-card";
import {
  adminApi,
  coursesApi,
  doubtsApi,
  type AdminLiveClassDto,
  type AssignedSubjectDto,
  type DoubtThreadSummaryDto,
  type TenantStorageUsageDto,
} from "@/lib/api";
import {
  getSession,
  isTeacherRole,
  canManageInstitute,
  isAdmin,
  type AuthSession,
} from "@/lib/auth";
import { fetchBranding, getTenantSlug, type BrandingDto } from "@/lib/branding";
import { formatBytes } from "@/lib/format-bytes";
import {
  hasDoubts,
  hasMockExams,
  isExamPrepProfile,
  parseProductProfile,
  profileBundleLabelPlural,
} from "@/lib/product-profile";
import { isTrialExpired } from "@/lib/trial";
import {
  INSTITUTE_CHECKLIST_STORAGE_KEY,
  instituteChecklistSections,
  fetchInstituteChecklistAuto,
  isInstituteItemAutoComplete,
  loadManualChecks,
  type InstituteChecklistAutoState,
} from "@/lib/setup-checklists";

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
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  href?: string;
}) {
  const inner = (
    <Card className="h-full overflow-hidden border-slate-200/80 shadow-sm transition hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function HeroSection({
  academyName,
  name,
  subtitle,
  badges,
}: {
  academyName: string;
  name: string;
  subtitle: string;
  badges?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-[var(--brand)] p-6 text-white shadow-lg sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-white/70">{academyName}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {timeGreeting()}, {firstName(name || "there")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">{subtitle}</p>
        </div>
        {badges && <div className="flex flex-wrap gap-3">{badges}</div>}
      </div>
    </section>
  );
}

function QuickPills({ items }: { items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(({ href, label, icon: Icon }) => (
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
  );
}

function checklistProgress(auto: InstituteChecklistAutoState | null): { done: number; total: number; pct: number } {
  const manual = loadManualChecks(INSTITUTE_CHECKLIST_STORAGE_KEY);
  const items = instituteChecklistSections.flatMap((s) => s.items);
  let done = 0;
  for (const item of items) {
    if (auto && isInstituteItemAutoComplete(item.id, auto)) done++;
    else if (manual[item.id]) done++;
  }
  const total = items.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

function InstituteAdminHome({ session, name }: { session: AuthSession; name: string }) {
  const tenant = session.tenant;
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [bundleCount, setBundleCount] = useState(0);
  const [openDoubts, setOpenDoubts] = useState(0);
  const [liveNow, setLiveNow] = useState<AdminLiveClassDto[]>([]);
  const [upcoming, setUpcoming] = useState<AdminLiveClassDto[]>([]);
  const [checklistAuto, setChecklistAuto] = useState<InstituteChecklistAutoState | null>(null);
  const [storage, setStorage] = useState<TenantStorageUsageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profile = parseProductProfile(tenant?.productProfile);
  const bundlesLabel = profileBundleLabelPlural(tenant);

  useEffect(() => {
    const slug = session.tenant?.slug ?? getTenantSlug();
    void fetchBranding(slug).then(setBranding);

    const loads: Promise<void>[] = [
      adminApi.listStudents({ page: 1, pageSize: 1 }).then((r) => setStudentCount(r.total)),
      adminApi.listTeachers({ page: 1, pageSize: 1 }).then((r) => setTeacherCount(r.total)),
      coursesApi.bundles().then((b) => setBundleCount(b.length)),
      fetchInstituteChecklistAuto().then(setChecklistAuto),
      adminApi.storageUsage().then(setStorage),
    ];
    if (hasDoubts(tenant)) {
      loads.push(
        doubtsApi.adminList({ status: "open", page: 1, pageSize: 1 }).then((r) => setOpenDoubts(r.total))
      );
    }
    if (tenant?.liveClassesEnabled !== false) {
      loads.push(
        adminApi.listLiveClasses({ state: "live", page: 1, pageSize: 3 }).then((r) => setLiveNow(r.data)),
        adminApi.listLiveClasses({ state: "upcoming", page: 1, pageSize: 4 }).then((r) => setUpcoming(r.data))
      );
    }

    Promise.all(loads)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [session, tenant]);

  const academyName = branding?.displayName ?? tenant?.tenantName ?? "Your institute";
  const checklist = checklistProgress(checklistAuto);
  const trialExpired = isTrialExpired(tenant?.status, tenant?.trialEndsAt, tenant?.trialExpired);
  const trialDays = tenant?.trialDaysRemaining;
  const storageTone =
    storage?.uploadsBlocked || storage?.warningLevel === "Full" || storage?.warningLevel === "Blocked"
      ? "danger"
      : storage?.warningLevel === "Warning"
        ? "warning"
        : "ok";

  const quickActions = useMemo(() => {
    const items = [
      { href: "/admin/students", label: "Students", icon: GraduationCap },
      { href: "/admin/teachers", label: "Teachers", icon: UserCircle2 },
      { href: "/admin", label: "Content", icon: BookOpen },
      { href: "/admin/progress", label: "Progress", icon: BarChart3 },
      { href: "/admin/checklist", label: "Checklist", icon: ListChecks },
      { href: "/admin/help", label: "Help", icon: CircleHelp },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ];
    if (hasMockExams(tenant)) items.splice(3, 0, { href: "/admin/mock-exams", label: "Mock exams", icon: Trophy });
    if (hasDoubts(tenant)) items.splice(3, 0, { href: "/admin/doubts", label: "Doubts", icon: MessageCircleQuestion });
    if (tenant?.liveClassesEnabled !== false) {
      items.splice(3, 0, { href: "/admin/live-classes", label: "Live classes", icon: Video });
    }
    return items;
  }, [tenant]);

  const subtitle =
    checklist.pct < 100
      ? `Your institute is ${checklist.pct}% set up. Finish the checklist to launch confidently.`
      : isExamPrepProfile(tenant)
        ? "Your institute is ready. Monitor students, content, and academy features from here."
        : "Your courses are live. Manage learners and content from one place.";

  return (
    <>
      <HeroSection
        academyName={academyName}
        name={name}
        subtitle={subtitle}
        badges={
          <>
            {tenant?.status === "Trial" && (
              <div
                className={`rounded-xl px-4 py-2.5 ring-1 backdrop-blur-sm ${
                  trialExpired
                    ? "bg-amber-500/20 ring-amber-300/30"
                    : "bg-white/10 ring-white/20"
                }`}
              >
                <p className="text-lg font-bold leading-none">
                  {trialExpired ? "Trial ended" : trialDays ?? "Trial"}
                </p>
                <p className="text-xs text-white/70">
                  {trialExpired
                    ? "Upgrade to restore access"
                    : typeof trialDays === "number"
                      ? `${trialDays} day${trialDays === 1 ? "" : "s"} left`
                      : "Trial active"}
                </p>
              </div>
            )}
            <div className="rounded-xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20 backdrop-blur-sm">
              <p className="text-lg font-bold leading-none">{checklist.pct}%</p>
              <p className="text-xs text-white/70">setup complete</p>
            </div>
            {storage && (
              <div
                className={`rounded-xl px-4 py-2.5 ring-1 backdrop-blur-sm ${
                  storageTone === "danger"
                    ? "bg-red-500/25 ring-red-300/40"
                    : storageTone === "warning"
                      ? "bg-amber-500/25 ring-amber-300/40"
                      : "bg-white/10 ring-white/20"
                }`}
              >
                <p className="text-lg font-bold leading-none">
                  {formatBytes(storage.usedBytes)} / {formatBytes(storage.quotaBytes)}
                </p>
                <p className="flex items-center gap-1 text-xs text-white/70">
                  <HardDrive className="h-3 w-3" />
                  Storage
                  {storage.quotaBypassEnabled && " (bypass)"}
                </p>
              </div>
            )}
          </>
        }
      />

      {storage && storageTone !== "ok" && (
        <p
          className={`rounded-lg border p-3 text-sm ${
            storageTone === "danger"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {storageTone === "danger"
            ? "Storage is full — new video and file uploads are blocked. Delete old content or ask your platform provider to upgrade."
            : `Storage is ${storage.usedPercent}% full — consider removing old videos or notes before you reach the limit.`}
        </p>
      )}

      <QuickPills items={quickActions} />

      {storage && <StorageUsageCard usage={storage} />}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))
        ) : (
          <>
            <StatCard
              label="Students"
              value={String(studentCount)}
              sub="Enrolled learners"
              icon={GraduationCap}
              accent="bg-gradient-to-br from-blue-500 to-blue-600"
              href="/admin/students"
            />
            <StatCard
              label="Teachers"
              value={String(teacherCount)}
              sub="Active accounts"
              icon={Users}
              accent="bg-gradient-to-br from-violet-500 to-violet-600"
              href="/admin/teachers"
            />
            <StatCard
              label={bundlesLabel.charAt(0).toUpperCase() + bundlesLabel.slice(1)}
              value={String(bundleCount)}
              sub={`Published ${bundlesLabel}`}
              icon={Layers}
              accent="bg-gradient-to-br from-emerald-500 to-emerald-600"
              href="/admin"
            />
            {hasDoubts(tenant) ? (
              <StatCard
                label="Open doubts"
                value={String(openDoubts)}
                sub="Awaiting a reply"
                icon={MessageCircleQuestion}
                accent="bg-gradient-to-br from-amber-500 to-orange-500"
                href="/admin/doubts"
              />
            ) : (
              <StatCard
                label="Setup"
                value={`${checklist.done}/${checklist.total}`}
                sub="Checklist items done"
                icon={ListChecks}
                accent="bg-gradient-to-br from-amber-500 to-orange-500"
                href="/admin/checklist"
              />
            )}
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-[var(--brand)]" />
                Launch checklist
              </span>
              <span className="text-sm font-normal text-slate-500">{checklist.pct}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand)]/70 transition-all"
                style={{ width: `${checklist.pct}%` }}
              />
            </div>
            <p className="text-sm text-slate-600">
              {checklist.pct < 100
                ? "Complete branding, content, teachers, and students to go live."
                : "Great work — your institute setup looks complete."}
            </p>
            <Button size="sm" className="mt-4 gap-1" asChild>
              <Link href="/admin/checklist">
                Open checklist <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-[var(--brand)]" />
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" size="sm" className="justify-start" asChild>
              <Link href="/admin/students">
                <GraduationCap className="mr-2 h-4 w-4" /> Add student
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="justify-start" asChild>
              <Link href="/admin">
                <BookOpen className="mr-2 h-4 w-4" /> Edit content
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="justify-start" asChild>
              <Link href="/admin/settings/branding">
                <Settings className="mr-2 h-4 w-4" /> Branding
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="justify-start" asChild>
              <Link href={`/?tenant=${encodeURIComponent(session.tenant?.slug ?? "demo")}`}>
                <ArrowRight className="mr-2 h-4 w-4" /> Preview site
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {tenant?.liveClassesEnabled !== false && (liveNow.length > 0 || upcoming.length > 0) && (
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4 text-[var(--brand)]" />
              Live classes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveNow.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/50 p-3"
              >
                <div>
                  <p className="flex items-center gap-2 font-medium text-slate-900">
                    {c.title}
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Live
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">{c.subjectTitle}</p>
                </div>
                <LiveClassActions
                  state={c.state}
                  scheduledStartUtc={c.scheduledStartUtc}
                  startUrl={c.startUrl}
                  joinUrl={c.joinUrl}
                />
              </div>
            ))}
            {upcoming.slice(0, 3).map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <p className="font-medium text-slate-800">{c.title}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar className="h-3 w-3" />
                  {c.subjectTitle} · {new Date(c.scheduledStartUtc).toLocaleString()}
                </p>
              </div>
            ))}
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/live-classes">Manage all classes</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function TeacherHome({ name }: { name: string }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [subjects, setSubjects] = useState<AssignedSubjectDto[]>([]);
  const [doubts, setDoubts] = useState<DoubtThreadSummaryDto[]>([]);
  const [openDoubtTotal, setOpenDoubtTotal] = useState(0);
  const [classes, setClasses] = useState<AdminLiveClassDto[]>([]);
  const [liveNow, setLiveNow] = useState<AdminLiveClassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (s?.tenant?.slug) void fetchBranding(s.tenant.slug).then(setBranding);

    const loads: Promise<void>[] = [
      adminApi.mySubjects().then(setSubjects),
      adminApi.listLiveClasses({ state: "upcoming", page: 1, pageSize: 5 }).then((r) => setClasses(r.data)),
      adminApi.listLiveClasses({ state: "live", page: 1, pageSize: 3 }).then((r) => setLiveNow(r.data)),
    ];
    if (hasDoubts(s?.tenant)) {
      loads.push(
        doubtsApi.adminList({ status: "open", page: 1, pageSize: 5 }).then((r) => {
          setDoubts(r.data);
          setOpenDoubtTotal(r.total);
        })
      );
    }

    Promise.all(loads)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const tenant = session?.tenant;
  const academyName = branding?.displayName ?? tenant?.tenantName ?? "Your institute";

  const quickActions = useMemo(() => {
    const items = [
      { href: "/admin", label: "Content", icon: BookOpen },
      { href: "/admin/progress", label: "Progress", icon: BarChart3 },
    ];
    if (hasDoubts(tenant)) items.push({ href: "/admin/doubts", label: "Doubts", icon: MessageCircleQuestion });
    if (tenant?.liveClassesEnabled !== false) items.push({ href: "/admin/live-classes", label: "Live classes", icon: Video });
    items.push({ href: "/admin/profile", label: "Profile", icon: UserCircle2 });
    return items;
  }, [tenant]);

  return (
    <>
      <HeroSection
        academyName={academyName}
        name={name}
        subtitle="Here’s what needs your attention across your assigned subjects."
        badges={
          <>
            {openDoubtTotal > 0 && (
              <div className="rounded-xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20 backdrop-blur-sm">
                <p className="text-lg font-bold leading-none">{openDoubtTotal}</p>
                <p className="text-xs text-white/70">open doubts</p>
              </div>
            )}
            {liveNow.length > 0 && (
              <div className="rounded-xl bg-red-500/30 px-4 py-2.5 ring-1 ring-red-300/30 backdrop-blur-sm">
                <p className="text-lg font-bold leading-none">{liveNow.length}</p>
                <p className="text-xs text-white/70">class live now</p>
              </div>
            )}
            <div className="rounded-xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20 backdrop-blur-sm">
              <p className="text-lg font-bold leading-none">{subjects.length}</p>
              <p className="text-xs text-white/70">subjects</p>
            </div>
          </>
        }
      />

      <QuickPills items={quickActions} />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          {liveNow.length > 0 && (
            <Card className="border-red-200 bg-red-50/50 shadow-sm">
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

          <div className="grid gap-6 lg:grid-cols-2">
            {hasDoubts(tenant) && (
              <Card className="border-slate-200/80 shadow-sm">
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
            )}

            {tenant?.liveClassesEnabled !== false && (
              <Card className="border-slate-200/80 shadow-sm">
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
                        <li key={c.id} className="rounded-md border border-slate-100 p-2 text-sm">
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
            )}
          </div>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-[var(--brand)]" />
                My subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No subjects assigned yet. Ask your institute admin to assign subjects.
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
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link href="/admin">
                    <ClipboardList className="h-4 w-4" />
                    Edit course content
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/admin/progress">
                    <BarChart3 className="h-4 w-4" />
                    Student progress
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default function AdminHomePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    if (!isAdmin(s)) {
      router.replace("/dashboard");
      return;
    }
    if (!isTeacherRole(s) && !canManageInstitute(s)) {
      router.replace("/admin");
      return;
    }
    setSession(s);
    setName(s.fullName);
  }, [router]);

  const isInstitute = canManageInstitute(session);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-white to-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {session &&
          (isInstitute ? (
            <InstituteAdminHome session={session} name={name} />
          ) : (
            <TeacherHome name={name} />
          ))}
      </main>
    </div>
  );
}
