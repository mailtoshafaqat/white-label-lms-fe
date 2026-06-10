"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ADMIN_SETTINGS_ITEMS } from "@/lib/admin-settings";

export function AdminSettingsNav() {
  const pathname = usePathname();
  const onHub = pathname === "/admin/settings";

  return (
    <div className="mb-6">
      <Link
        href="/admin/settings"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" />
        All settings
      </Link>
      {!onHub && (
        <nav className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {ADMIN_SETTINGS_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
