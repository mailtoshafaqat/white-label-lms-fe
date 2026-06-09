"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, ExternalLink, Layout, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { adminApi, type PageSectionDto } from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";
import {
  ALL_LANDING_SECTION_TYPES,
  defaultSectionContent,
  parseSection,
  type CoursesShowcaseContent,
  type FeatureCard,
  type FeaturesContent,
  type FooterContent,
  type HeroContent,
  type LandingSectionType,
  type StatItem,
  type StatsContent,
  type TestimonialItem,
  type TestimonialsContent,
} from "@/lib/landing";

type EditableSection = PageSectionDto & { key: string };

function newKey() {
  return `s-${Math.random().toString(36).slice(2, 9)}`;
}

export default function LandingSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<EditableSection[]>([]);
  const [addType, setAddType] = useState<LandingSectionType>("Hero");

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canManageInstitute(session)) {
      router.replace("/dashboard");
      return;
    }
    adminApi
      .getLanding()
      .then((page) =>
        setSections(
          page.sections.map((s) => ({
            ...s,
            key: s.id ?? newKey(),
          }))
        )
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  function updateSection(key: string, patch: Partial<EditableSection>) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function updateJson<T>(key: string, fallback: T, patch: Partial<T>) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        const c = parseSection<T>(s.contentJson, fallback);
        return { ...s, contentJson: JSON.stringify({ ...c, ...patch }) };
      })
    );
  }

  function updateHero(key: string, patch: Partial<HeroContent>) {
    updateJson(key, { title: "", subtitle: "", ctaLabel: "Log in", ctaHref: "/login" }, patch);
  }

  function updateFeatures(key: string, cards: FeatureCard[]) {
    setSections((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, contentJson: JSON.stringify({ cards } satisfies FeaturesContent) } : s
      )
    );
  }

  function updateFooter(key: string, patch: Partial<FooterContent>) {
    updateJson(key, { text: "" }, patch);
  }

  function updateTestimonials(key: string, patch: Partial<TestimonialsContent>) {
    updateJson(key, { items: [] }, patch);
  }

  function updateCoursesShowcase(key: string, patch: Partial<CoursesShowcaseContent>) {
    updateJson(key, { title: "Our courses", subtitle: "" }, patch);
  }

  function updateStats(key: string, patch: Partial<StatsContent>) {
    updateJson(key, { items: [] }, patch);
  }

  function moveSection(key: string, dir: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy.map((s, i) => ({ ...s, sortOrder: i }));
    });
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        key: newKey(),
        id: null,
        sectionType: addType,
        sortOrder: prev.length,
        contentJson: defaultSectionContent(addType),
        isEnabled: true,
      },
    ]);
  }

  function removeSection(key: string) {
    setSections((prev) => prev.filter((s) => s.key !== key).map((s, i) => ({ ...s, sortOrder: i })));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = sections.map((s, i) => ({
        id: s.id,
        sectionType: s.sectionType,
        sortOrder: i,
        contentJson: s.contentJson,
        isEnabled: s.isEnabled,
      }));
      await adminApi.saveLanding({ sections: payload });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]";
  const label = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Layout className="h-6 w-6 text-[var(--brand)]" /> Landing page
            </h1>
            <p className="mt-1 text-slate-600">
              Edit the public homepage sections students see before they log in.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/" target="_blank">
              <ExternalLink className="h-4 w-4" /> Preview
            </Link>
          </Button>
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSave}>
            {sections.map((s, index) => {
              const hero =
                s.sectionType === "Hero"
                  ? parseSection<HeroContent>(s.contentJson, {
                      title: "",
                      subtitle: "",
                      ctaLabel: "Log in",
                      ctaHref: "/login",
                    })
                  : null;
              const features =
                s.sectionType === "Features"
                  ? parseSection<FeaturesContent>(s.contentJson, { cards: [] })
                  : null;
              const footer =
                s.sectionType === "Footer"
                  ? parseSection<FooterContent>(s.contentJson, { text: "" })
                  : null;
              const testimonials =
                s.sectionType === "Testimonials"
                  ? parseSection<TestimonialsContent>(s.contentJson, { items: [] })
                  : null;
              const coursesShowcase =
                s.sectionType === "CoursesShowcase"
                  ? parseSection<CoursesShowcaseContent>(s.contentJson, {
                      title: "Our courses",
                      subtitle: "",
                    })
                  : null;
              const stats =
                s.sectionType === "Stats"
                  ? parseSection<StatsContent>(s.contentJson, { items: [] })
                  : null;

              return (
                <Card key={s.key}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">{s.sectionType}</CardTitle>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={s.isEnabled}
                          onChange={(e) => updateSection(s.key, { isEnabled: e.target.checked })}
                        />
                        Enabled
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => moveSection(s.key, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={index === sections.length - 1}
                        onClick={() => moveSection(s.key, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSection(s.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hero && (
                      <>
                        <div>
                          <label className={label}>Headline</label>
                          <input
                            className={field}
                            value={hero.title}
                            onChange={(e) => updateHero(s.key, { title: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={label}>Subtitle</label>
                          <textarea
                            className={field}
                            rows={2}
                            value={hero.subtitle}
                            onChange={(e) => updateHero(s.key, { subtitle: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={label}>Button label</label>
                            <input
                              className={field}
                              value={hero.ctaLabel}
                              onChange={(e) => updateHero(s.key, { ctaLabel: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className={label}>Button link</label>
                            <input
                              className={field}
                              value={hero.ctaHref}
                              onChange={(e) => updateHero(s.key, { ctaHref: e.target.value })}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {features && (
                      <div className="space-y-3">
                        {features.cards.map((card, ci) => (
                          <div key={ci} className="rounded-md border border-slate-200 p-3">
                            <input
                              className={`${field} mb-2`}
                              placeholder="Title"
                              value={card.title}
                              onChange={(e) => {
                                const cards = [...features.cards];
                                cards[ci] = { ...card, title: e.target.value };
                                updateFeatures(s.key, cards);
                              }}
                            />
                            <textarea
                              className={field}
                              rows={2}
                              placeholder="Description"
                              value={card.description}
                              onChange={(e) => {
                                const cards = [...features.cards];
                                cards[ci] = { ...card, description: e.target.value };
                                updateFeatures(s.key, cards);
                              }}
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateFeatures(s.key, [
                              ...features.cards,
                              { title: "", description: "" },
                            ])
                          }
                        >
                          <Plus className="h-3.5 w-3.5" /> Add card
                        </Button>
                      </div>
                    )}
                    {testimonials && (
                      <div className="space-y-3">
                        <div>
                          <label className={label}>Section title</label>
                          <input
                            className={field}
                            value={testimonials.title ?? ""}
                            onChange={(e) => updateTestimonials(s.key, { title: e.target.value })}
                          />
                        </div>
                        {testimonials.items.map((item, ti) => (
                          <div key={ti} className="rounded-md border border-slate-200 p-3 space-y-2">
                            <input
                              className={field}
                              placeholder="Name"
                              value={item.name}
                              onChange={(e) => {
                                const items = [...testimonials.items];
                                items[ti] = { ...item, name: e.target.value };
                                updateTestimonials(s.key, { items });
                              }}
                            />
                            <input
                              className={field}
                              placeholder="Role"
                              value={item.role}
                              onChange={(e) => {
                                const items = [...testimonials.items];
                                items[ti] = { ...item, role: e.target.value };
                                updateTestimonials(s.key, { items });
                              }}
                            />
                            <textarea
                              className={field}
                              rows={2}
                              placeholder="Quote"
                              value={item.quote}
                              onChange={(e) => {
                                const items = [...testimonials.items];
                                items[ti] = { ...item, quote: e.target.value };
                                updateTestimonials(s.key, { items });
                              }}
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTestimonials(s.key, {
                              items: [
                                ...testimonials.items,
                                { name: "", role: "", quote: "" },
                              ],
                            })
                          }
                        >
                          <Plus className="h-3.5 w-3.5" /> Add testimonial
                        </Button>
                      </div>
                    )}
                    {coursesShowcase && (
                      <>
                        <div>
                          <label className={label}>Title</label>
                          <input
                            className={field}
                            value={coursesShowcase.title}
                            onChange={(e) =>
                              updateCoursesShowcase(s.key, { title: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className={label}>Subtitle</label>
                          <input
                            className={field}
                            value={coursesShowcase.subtitle ?? ""}
                            onChange={(e) =>
                              updateCoursesShowcase(s.key, { subtitle: e.target.value })
                            }
                          />
                        </div>
                        <p className="text-xs text-slate-500">
                          Courses are loaded automatically from your catalog on the public page.
                        </p>
                      </>
                    )}
                    {stats && (
                      <div className="space-y-3">
                        <div>
                          <label className={label}>Section title</label>
                          <input
                            className={field}
                            value={stats.title ?? ""}
                            onChange={(e) => updateStats(s.key, { title: e.target.value })}
                          />
                        </div>
                        {stats.items.map((item: StatItem, si) => (
                          <div key={si} className="grid gap-2 sm:grid-cols-2">
                            <input
                              className={field}
                              placeholder="Label"
                              value={item.label}
                              onChange={(e) => {
                                const items = [...stats.items];
                                items[si] = { ...item, label: e.target.value };
                                updateStats(s.key, { items });
                              }}
                            />
                            <input
                              className={field}
                              placeholder="Value"
                              value={item.value}
                              onChange={(e) => {
                                const items = [...stats.items];
                                items[si] = { ...item, value: e.target.value };
                                updateStats(s.key, { items });
                              }}
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStats(s.key, {
                              items: [...stats.items, { label: "", value: "" }],
                            })
                          }
                        >
                          <Plus className="h-3.5 w-3.5" /> Add stat
                        </Button>
                      </div>
                    )}
                    {footer && (
                      <div>
                        <label className={label}>Footer text</label>
                        <input
                          className={field}
                          value={footer.text}
                          onChange={(e) => updateFooter(s.key, { text: e.target.value })}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-slate-300 p-4">
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value as LandingSectionType)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {ALL_LANDING_SECTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={addSection}>
                <Plus className="h-4 w-4" /> Add section
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save landing page"}
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-emerald-700">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
