"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Brain, Video, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandHeader } from "@/components/brand-header";
import type { BrandingDto } from "@/lib/branding";
import { API_BASE_URL, type BundleDto } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import {
  parseSection,
  type CoursesShowcaseContent,
  type FeaturesContent,
  type FooterContent,
  type HeroContent,
  type LandingPageDto,
  type StatsContent,
  type TestimonialsContent,
} from "@/lib/landing";

const iconMap: Record<string, LucideIcon> = {
  Video,
  BookOpen,
  Brain,
};

function loginHref(slug: string, href: string) {
  if (href === "/login" || href.startsWith("/login?")) {
    return `/login?tenant=${encodeURIComponent(slug)}`;
  }
  return href;
}

function HeroSection({
  json,
  slug,
  branding,
}: {
  json: string;
  slug: string;
  branding: BrandingDto | null;
}) {
  const c = parseSection<HeroContent>(json, {
    title: branding?.displayName ?? "Your academy",
    subtitle: "",
    ctaLabel: "Log in",
    ctaHref: "/login",
  });
  const imageUrl = resolveAssetUrl(c.imageUrl ?? null);

  return (
    <>
      <header className="flex items-center justify-between px-8 py-5">
        <BrandHeader branding={branding} />
        <Button asChild>
          <Link href={loginHref(slug, "/login")}>Log in</Link>
        </Button>
      </header>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mx-auto mb-8 max-h-48 rounded-lg object-contain" />
        )}
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{c.title}</h1>
        {c.subtitle && (
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">{c.subtitle}</p>
        )}
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href={loginHref(slug, c.ctaHref)}>{c.ctaLabel}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function FeaturesSection({ json }: { json: string }) {
  const c = parseSection<FeaturesContent>(json, { cards: [] });
  if (c.cards.length === 0) return null;

  return (
    <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-16 sm:grid-cols-3">
      {c.cards.map((card) => {
        const Icon = card.icon ? iconMap[card.icon] ?? BookOpen : BookOpen;
        return (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <Icon className="h-8 w-8 text-[var(--brand)]" />
              <h3 className="mt-3 font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function TestimonialsSection({ json }: { json: string }) {
  const c = parseSection<TestimonialsContent>(json, { items: [] });
  if (c.items.length === 0) return null;

  return (
    <section className="bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {c.title && (
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">{c.title}</h2>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {c.items.map((item, i) => {
            const avatar = resolveAssetUrl(item.avatarUrl ?? null);
            return (
              <Card key={i}>
                <CardContent className="pt-6">
                  <p className="text-sm italic text-slate-600">&ldquo;{item.quote}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    {avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CoursesShowcaseSection({ json, slug }: { json: string; slug: string }) {
  const c = parseSection<CoursesShowcaseContent>(json, {
    title: "Our courses",
    subtitle: "",
  });
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/bundles`, {
      headers: { "X-Tenant-Slug": slug },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: BundleDto[]) => setBundles(data))
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!loading && bundles.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-center text-2xl font-bold text-slate-900">{c.title}</h2>
      {c.subtitle && (
        <p className="mt-2 text-center text-slate-600">{c.subtitle}</p>
      )}
      {loading ? (
        <p className="mt-8 text-center text-sm text-slate-500">Loading courses…</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b) => (
            <Card key={b.id}>
              <CardContent className="pt-6">
                <BookOpen className="h-8 w-8 text-[var(--brand)]" />
                <h3 className="mt-3 font-semibold text-slate-900">{b.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {b.subjectCount} subjects · Rs. {b.price.toLocaleString()}
                </p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href={loginHref(slug, "/login")}>Enroll</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function StatsSection({ json }: { json: string }) {
  const c = parseSection<StatsContent>(json, { items: [] });
  if (c.items.length === 0) return null;

  return (
    <section className="border-y border-slate-200 bg-white px-6 py-12">
      <div className="mx-auto max-w-4xl">
        {c.title && (
          <h2 className="mb-8 text-center text-xl font-semibold text-slate-900">{c.title}</h2>
        )}
        <div className="grid gap-6 text-center sm:grid-cols-2 lg:grid-cols-4">
          {c.items.map((item, i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-[var(--brand)]">{item.value}</p>
              <p className="mt-1 text-sm text-slate-600">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterSection({ json, branding }: { json: string; branding: BrandingDto | null }) {
  const c = parseSection<FooterContent>(json, { text: "" });
  const email = c.supportEmail ?? branding?.supportEmail;
  return (
    <footer className="border-t border-slate-200 px-6 py-8 text-center text-sm text-slate-500">
      <p>{c.text}</p>
      {email && (
        <p className="mt-2">
          <a href={`mailto:${email}`} className="text-[var(--brand)] hover:underline">
            {email}
          </a>
        </p>
      )}
    </footer>
  );
}

export function LandingSections({
  landing,
  branding,
}: {
  landing: LandingPageDto;
  branding: BrandingDto | null;
}) {
  const slug = landing.slug;
  let hasHero = false;
  const enabled = landing.sections.filter((s) => s.isEnabled);

  return (
    <main className="min-h-screen">
      {enabled.map((s, i) => {
        switch (s.sectionType) {
          case "Hero":
            hasHero = true;
            return <HeroSection key={i} json={s.contentJson} slug={slug} branding={branding} />;
          case "Features":
            return <FeaturesSection key={i} json={s.contentJson} />;
          case "Testimonials":
            return <TestimonialsSection key={i} json={s.contentJson} />;
          case "CoursesShowcase":
            return <CoursesShowcaseSection key={i} json={s.contentJson} slug={slug} />;
          case "Stats":
            return <StatsSection key={i} json={s.contentJson} />;
          case "Footer":
            return <FooterSection key={i} json={s.contentJson} branding={branding} />;
          default:
            return null;
        }
      })}
      {!hasHero && (
        <header className="flex items-center justify-between px-8 py-5">
          <BrandHeader branding={branding} />
          <Button asChild>
            <Link href={loginHref(slug, "/login")}>Log in</Link>
          </Button>
        </header>
      )}
    </main>
  );
}
