"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GraduationCap, KeyRound, LogOut } from "lucide-react";
import { getSession, canManageInstitute, isAdmin, clearSession, formatRoleLabel } from "@/lib/auth";
import { getTenantSlug } from "@/lib/branding";

const instituteTabs = [
  { href: "/admin/checklist", label: "Checklist" },
  { href: "/admin/setup", label: "Setup wizard" },
  { href: "/admin", label: "Content" },
  { href: "/admin/teachers", label: "Teachers" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/doubts", label: "Doubts" },
  { href: "/admin/live-classes", label: "Live classes" },
  { href: "/admin/mock-exams", label: "Mock exams" },
  { href: "/admin/settings", label: "Settings" },
];

const teacherTabs = [
  { href: "/admin/home", label: "Home" },
  { href: "/admin", label: "Content" },
  { href: "/admin/progress", label: "Progress" },
  { href: "/admin/doubts", label: "Doubts" },
  { href: "/admin/live-classes", label: "Live classes" },
  { href: "/admin/mock-exams", label: "Mock exams" },
  { href: "/admin/profile", label: "Profile" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [tabs, setTabs] = useState(teacherTabs);
  const [userName, setUserName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [tenantSlug, setTenantSlug] = useState("demo");
  const [homeLabel, setHomeLabel] = useState("Admin");

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) return;
    const institute = canManageInstitute(session);
    setTabs(institute ? instituteTabs : teacherTabs);
    setUserName(session.fullName);
    setRoleLabel(formatRoleLabel(session.role));
    const slug = session.tenant?.slug ?? getTenantSlug();
    setTenantSlug(slug);
    setHomeLabel(session.tenant?.tenantName ?? "Admin");
  }, []);

  function logout() {
    clearSession();
    router.replace(`/login?tenant=${encodeURIComponent(tenantSlug)}`);
  }

  const homeHref = `/?tenant=${encodeURIComponent(tenantSlug)}`;

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={homeHref}
          className="flex items-center gap-2 font-bold text-slate-900 hover:opacity-80"
          title="Go to institute home page"
        >
          <GraduationCap className="h-6 w-6 text-[var(--brand)]" />
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
      <nav className="mt-3 flex flex-wrap gap-1">
        {tabs.map((t) => {
          const active =
            t.href === "/admin/home"
              ? pathname === "/admin/home"
              : t.href === "/admin/profile"
                ? pathname === "/admin/profile"
                : t.href === "/admin/progress"
                  ? pathname.startsWith("/admin/progress")
              : t.href === "/admin/mock-exams"
                ? pathname.startsWith("/admin/mock-exams")
              : t.href === "/admin"
              ? pathname === "/admin"
              : t.href === "/admin/checklist"
                ? pathname === "/admin/checklist"
                : t.href === "/admin/setup"
                  ? pathname === "/admin/setup"
                  : t.href === "/admin/settings"
                    ? pathname.startsWith("/admin/settings")
                    : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
