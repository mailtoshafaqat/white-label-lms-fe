"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LandingSections } from "@/components/landing/landing-sections";
import { loadAndApplyBranding, type BrandingDto } from "@/lib/branding";
import { fetchPublicLanding, type LandingPageDto } from "@/lib/landing";
import { persistTenantSlug, resolveTenantSlug } from "@/lib/tenant";

function HomeContent() {
  const searchParams = useSearchParams();
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [landing, setLanding] = useState<LandingPageDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = resolveTenantSlug(searchParams);
    persistTenantSlug(slug);

    Promise.all([loadAndApplyBranding(slug), fetchPublicLanding(slug)])
      .then(([b, l]) => {
        setBranding(b);
        setLanding(l);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </main>
    );
  }

  if (!landing || landing.sections.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {branding?.displayName ?? "Welcome"}
        </h1>
        <p className="text-slate-600">Landing page not configured yet.</p>
        <a
          href={`/login?tenant=${encodeURIComponent(branding?.slug ?? "demo")}`}
          className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
        >
          Log in
        </a>
      </main>
    );
  }

  return <LandingSections landing={landing} branding={branding} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-slate-500">
          Loading…
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
