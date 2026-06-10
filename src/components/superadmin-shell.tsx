"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ClipboardCheck, KeyRound, LayoutGrid, LogOut } from "lucide-react";
import { clearSession } from "@/lib/auth";

export function SuperAdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onTenants = pathname === "/superadmin";
  const onChecklist = pathname.startsWith("/superadmin/checklist");

  function logout() {
    clearSession();
    router.replace("/login/platform");
  }

  return (
    <div className="superadmin-console min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 [color-scheme:dark]">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-indigo-200">Platform Console</p>
              <p className="text-xs text-slate-400">SuperAdmin · multi-tenant SaaS</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/superadmin"
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                onTenants
                  ? "bg-white/15 text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <LayoutGrid className="h-4 w-4" /> Institutes
              </span>
            </Link>
            <Link
              href="/superadmin/checklist"
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                onChecklist
                  ? "bg-white/15 text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4" /> Checklist
              </span>
            </Link>
            <Link
              href="/account/password"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <KeyRound className="h-4 w-4" /> Change password
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-slate-300">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
