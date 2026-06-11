"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GraduationCap, KeyRound, LogOut } from "lucide-react";
import { getSession, canManageInstitute, isAdmin, clearSession, formatRoleLabel } from "@/lib/auth";
import { fetchBranding, getTenantSlug, type BrandingDto } from "@/lib/branding";
import { resolveAssetUrl } from "@/lib/assets";
import { getAdminNavItems, showNavGroupLabels, type AdminNavItem } from "@/lib/admin-nav-config";

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/home") return pathname === "/admin/home";
  if (href === "/admin/profile") return pathname === "/admin/profile";
  if (href === "/admin/progress") return pathname.startsWith("/admin/progress");
  if (href === "/admin/mock-exams") return pathname.startsWith("/admin/mock-exams");
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/checklist") return pathname === "/admin/checklist";
  if (href === "/admin/setup") return pathname === "/admin/setup";
  if (href === "/admin/settings") return pathname.startsWith("/admin/settings");
  return pathname.startsWith(href);
}

function NavLink({ item, pathname }: { item: AdminNavItem; pathname: string }) {
  const active = isNavActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {item.label}
    </Link>
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

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) return;
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
  }, []);

  const { academy, rest } = useMemo(() => {
    if (!grouped) return { academy: [] as AdminNavItem[], rest: tabs };
    return {
      academy: tabs.filter((t) => t.group === "academy"),
      rest: tabs.filter((t) => t.group !== "academy"),
    };
  }, [grouped, tabs]);

  function logout() {
    clearSession();
    router.replace(`/login?tenant=${encodeURIComponent(tenantSlug)}`);
  }

  const homeHref = `/?tenant=${encodeURIComponent(tenantSlug)}`;
  const logoUrl = resolveAssetUrl(branding?.logoUrl);

  return (
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
            Change password
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
      <nav className="mt-3 flex flex-wrap items-center gap-1">
        {grouped ? (
          <>
            {rest.map((t) => (
              <NavLink key={t.href} item={t} pathname={pathname} />
            ))}
            {academy.length > 0 && (
              <>
                <span
                  className="mx-1 hidden items-center gap-2 sm:inline-flex"
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
                  <NavLink key={t.href} item={t} pathname={pathname} />
                ))}
              </>
            )}
          </>
        ) : (
          tabs.map((t) => <NavLink key={t.href} item={t} pathname={pathname} />)
        )}
      </nav>
    </header>
  );
}
