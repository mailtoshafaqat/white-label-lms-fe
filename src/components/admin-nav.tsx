"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";

const tabs = [
  { href: "/admin", label: "Content" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/live-classes", label: "Live classes" },
  { href: "/admin/settings/branding", label: "Branding" },
  { href: "/admin/settings/landing", label: "Landing" },
  { href: "/admin/settings/email", label: "Email" },
  { href: "/admin/settings/zoom", label: "Zoom" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-200 bg-white px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-[var(--brand)]">
          <GraduationCap className="h-6 w-6" />
          <span>Admin</span>
        </div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
          Back to dashboard
        </Link>
      </div>
      <nav className="mt-3 flex gap-1">
        {tabs.map((t) => {
          const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                active
                  ? "bg-[var(--brand)] text-white"
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
