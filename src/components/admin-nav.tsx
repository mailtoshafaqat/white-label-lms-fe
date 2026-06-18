"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GraduationCap, KeyRound, LogOut, Menu, X } from "lucide-react";
import {
  getSession,
  canManageInstitute,
  isAdmin,
  clearSession,
  formatRoleLabel,
  type TenantFeatures,
} from "@/lib/auth";
import { isTrialExpired } from "@/lib/trial";
import { fetchBranding, getTenantSlug, type BrandingDto } from "@/lib/branding";
import { resolveAssetUrl } from "@/lib/assets";
import { getAdminNavItems, showNavGroupLabels, type AdminNavItem } from "@/lib/admin-nav-config";
import { adminApi } from "@/lib/api";

const MOBILE_PRIMARY_COUNT = 3;

/** High-traffic links on small screens; remainder live under More. */
function getMobilePrimaryTabs(tabs: AdminNavItem[], instituteAdmin: boolean): AdminNavItem[] {
  if (instituteAdmin) {
    const pick = (href: string) => tabs.find((t) => t.href === href);
    return [pick("/admin/home"), pick("/admin"), pick("/admin/progress"), pick("/admin/students")].filter(
      (t): t is AdminNavItem => Boolean(t)
    );
  }
  return tabs.slice(0, MOBILE_PRIMARY_COUNT);
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/home") return pathname === "/admin/home";
  if (href === "/admin/profile") return pathname === "/admin/profile";
  if (href === "/admin/progress") return pathname.startsWith("/admin/progress");
  if (href === "/admin/mock-exams") return pathname.startsWith("/admin/mock-exams");
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/checklist") return pathname === "/admin/checklist";
  if (href === "/admin/setup") return pathname === "/admin/setup";
  if (href === "/admin/settings") return pathname.startsWith("/admin/settings");
  if (href === "/admin/payments") return pathname.startsWith("/admin/payments");
  return pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onNavigate,
  className = "",
  badge,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate?: () => void;
  className?: string;
  badge?: number;
}) {
  const active = isNavActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
      } ${className}`}
    >
      {item.label}
      {badge && badge > 0 ? (
        <span
          className={`ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            active ? "bg-white/20 text-white" : "bg-amber-500 text-white"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function MobileNavMenu({
  tabs,
  grouped,
  academy,
  rest,
  pathname,
  open,
  onClose,
  pendingPayments,
}: {
  tabs: AdminNavItem[];
  grouped: boolean;
  academy: AdminNavItem[];
  rest: AdminNavItem[];
  pathname: string;
  open: boolean;
  onClose: () => void;
  pendingPayments: number;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function renderLinks(items: AdminNavItem[]) {
    return items.map((t) => (
      <NavLink
        key={t.href}
        item={t}
        pathname={pathname}
        onNavigate={onClose}
        className="block w-full px-4 py-2.5"
        badge={t.href === "/admin/payments" ? pendingPayments : undefined}
      />
    ));
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-sm font-semibold text-slate-900">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {grouped ? (
            <>
              {renderLinks(rest)}
              {academy.length > 0 && (
                <>
                  <p className="mx-4 mt-3 mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Academy
                  </p>
                  {renderLinks(academy)}
                </>
              )}
            </>
          ) : (
            renderLinks(tabs)
          )}
        </nav>
      </div>
    </>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [tabs, setTabs] = useState<AdminNavItem[]>([]);
  const [grouped, setGrouped] = useState(false);
  const [userName, setUserName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [tenantSlug, setTenantSlug] = useState("demo");
  const [homeLabel, setHomeLabel] = useState("Admin");
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeatures | null>(null);
  const [showTrialBanner, setShowTrialBanner] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [instituteAdmin, setInstituteAdmin] = useState(false);
  const [pendingPayments, setPendingPayments] = useState(0);

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) return;
    setTenantFeatures(session.tenant ?? null);
    setShowTrialBanner(
      canManageInstitute(session) && session.tenant?.status === "Trial"
    );
    setInstituteAdmin(canManageInstitute(session));
    setTabs(getAdminNavItems(session));
    setGrouped(showNavGroupLabels(session));
    setUserName(session.fullName);
    setRoleLabel(formatRoleLabel(session.role));
    const slug = session.tenant?.slug ?? getTenantSlug();
    setTenantSlug(slug);
    setHomeLabel(session.tenant?.tenantName ?? "Admin");
    void fetchBranding(slug).then((b) => {
      if (!b) return;
      setBranding(b);
      setHomeLabel(b.displayName || session.tenant?.tenantName || "Admin");
    });
    if (canManageInstitute(session)) {
      void adminApi.pendingPaymentCount().then((r) => setPendingPayments(r.count)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const { academy, rest } = useMemo(() => {
    if (!grouped) return { academy: [] as AdminNavItem[], rest: tabs };
    return {
      academy: tabs.filter((t) => t.group === "academy"),
      rest: tabs.filter((t) => t.group !== "academy"),
    };
  }, [grouped, tabs]);

  const mobilePrimary = useMemo(
    () => getMobilePrimaryTabs(tabs, instituteAdmin),
    [tabs, instituteAdmin]
  );
  const mobilePrimaryHrefs = useMemo(() => new Set(mobilePrimary.map((t) => t.href)), [mobilePrimary]);
  const mobileOverflow = tabs.filter((t) => !mobilePrimaryHrefs.has(t.href));
  const hasOverflow = mobileOverflow.length > 0;

  function logout() {
    clearSession();
    router.replace(`/login?tenant=${encodeURIComponent(tenantSlug)}`);
  }

  const homeHref = `/?tenant=${encodeURIComponent(tenantSlug)}`;
  const logoUrl = resolveAssetUrl(branding?.logoUrl);

  const trialExpired = isTrialExpired(
    tenantFeatures?.status,
    tenantFeatures?.trialEndsAt,
    tenantFeatures?.trialExpired
  );
  const trialDays = tenantFeatures?.trialDaysRemaining;

  return (
    <>
      {showTrialBanner && (
        <div
          className={`border-b px-4 py-2.5 text-center text-sm sm:px-8 ${
            trialExpired
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-sky-200 bg-sky-50 text-sky-900"
          }`}
        >
          {trialExpired ? (
            <>
              Your institute trial has expired. Students and teachers can no longer sign in until
              your account is activated. Contact platform support to upgrade.
            </>
          ) : (
            <>
              Trial period:{" "}
              {trialDays !== null && trialDays !== undefined
                ? `${trialDays} day${trialDays === 1 ? "" : "s"} remaining`
                : "active"}
              . Upgrade before trial ends to avoid blocking student and teacher access.
            </>
          )}
        </div>
      )}
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={homeHref}
            className="flex items-center gap-2 font-bold text-slate-900 hover:opacity-80"
            title="Go to institute home page"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
            ) : (
              <GraduationCap className="h-6 w-6 text-[var(--brand)]" />
            )}
            <span>{homeLabel}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
            {userName && (
              <span className="hidden text-slate-600 sm:inline">
                Hi, {userName}
                {roleLabel ? ` (${roleLabel})` : ""}
              </span>
            )}
            <Link
              href="/account/password"
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800"
            >
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">Change password</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>

        {/* Mobile: primary links + More */}
        <nav className="mt-3 flex items-center gap-1 md:hidden">
          {mobilePrimary.map((t) => (
            <NavLink
              key={t.href}
              item={t}
              pathname={pathname}
              badge={t.href === "/admin/payments" ? pendingPayments : undefined}
            />
          ))}
          {hasOverflow && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                mobileOverflow.some((t) => isNavActive(pathname, t.href))
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <Menu className="h-4 w-4" />
              More
            </button>
          )}
        </nav>

        {/* Desktop: full horizontal nav */}
        <nav className="mt-3 hidden flex-wrap items-center gap-1 md:flex">
          {grouped ? (
            <>
              {rest.map((t) => (
                <NavLink
                  key={t.href}
                  item={t}
                  pathname={pathname}
                  badge={t.href === "/admin/payments" ? pendingPayments : undefined}
                />
              ))}
              {academy.length > 0 && (
                <>
                  <span
                    className="mx-1 hidden items-center gap-2 lg:inline-flex"
                    aria-hidden
                  >
                    <span className="h-4 w-px bg-slate-200" />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                      title="Academy: mock exams, doubts, and live classes"
                    >
                      Academy
                    </span>
                  </span>
                  {academy.map((t) => (
                    <NavLink
                      key={t.href}
                      item={t}
                      pathname={pathname}
                      badge={t.href === "/admin/payments" ? pendingPayments : undefined}
                    />
                  ))}
                </>
              )}
            </>
          ) : (
            tabs.map((t) => (
              <NavLink
                key={t.href}
                item={t}
                pathname={pathname}
                badge={t.href === "/admin/payments" ? pendingPayments : undefined}
              />
            ))
          )}
        </nav>
      </header>

      <MobileNavMenu
        tabs={tabs}
        grouped={grouped}
        academy={academy}
        rest={rest}
        pathname={pathname}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        pendingPayments={pendingPayments}
      />
    </>
  );
}
