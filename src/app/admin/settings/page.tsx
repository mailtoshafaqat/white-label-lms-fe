"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent } from "@/components/ui/card";
import { ADMIN_SETTINGS_ITEMS } from "@/lib/admin-settings";
import { canManageInstitute, getSession } from "@/lib/auth";

export default function AdminSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canManageInstitute(session)) {
      router.replace("/admin");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Settings className="h-6 w-6 text-[var(--brand)]" />
          Settings
        </h1>
        <p className="mt-1 text-slate-600">
          Configure branding, landing page, email, and live class integrations for your institute.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ADMIN_SETTINGS_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group block">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[var(--brand)] group-hover:bg-slate-200">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
