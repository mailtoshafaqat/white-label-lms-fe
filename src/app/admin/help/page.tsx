"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleHelp, ExternalLink } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canManageInstitute, getSession, isAdmin } from "@/lib/auth";
import {
  getAdminHelpIntro,
  getAdminHelpSections,
  type AdminHelpSection,
} from "@/lib/admin-help-content";
import { parseProductProfile, PRODUCT_PROFILE_LABELS } from "@/lib/product-profile";

function HelpSectionCard({ section }: { section: AdminHelpSection }) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">{section.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="list-inside list-disc space-y-1.5 text-slate-600">
              {section.bullets.map((b) => (
                <li key={b.slice(0, 48)}>{b}</li>
              ))}
            </ul>
          )}
          {section.links && section.links.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-[var(--brand)] hover:bg-slate-200"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default function AdminHelpPage() {
  const router = useRouter();
  const session = getSession();
  const profile = parseProductProfile(session?.tenant?.productProfile);
  const institute = canManageInstitute(session);

  const sections = useMemo(() => {
    const all = getAdminHelpSections(profile);
    return institute ? all : all.filter((s) => !s.instituteOnly);
  }, [profile, institute]);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isAdmin(session)) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <CircleHelp className="h-7 w-7 text-[var(--brand)]" />
              Help &amp; configuration
            </h1>
            <p className="mt-1 max-w-2xl text-slate-600">{getAdminHelpIntro(profile)}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Mode: {PRODUCT_PROFILE_LABELS[profile]}
            </p>
          </div>
          <Link
            href="/admin/checklist"
            className="shrink-0 text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Setup checklist →
          </Link>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav
            className="hidden lg:block"
            aria-label="Help sections"
          >
            <ul className="sticky top-24 space-y-1 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-6">
            {sections.map((section) => (
              <HelpSectionCard key={section.id} section={section} />
            ))}

            <p className="text-center text-xs text-slate-500">
              Need platform-level support? Contact your SuperAdmin or platform support.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
