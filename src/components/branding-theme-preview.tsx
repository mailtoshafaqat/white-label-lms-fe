"use client";

import { useMemo, useState } from "react";
import { GraduationCap, BookOpen, LayoutDashboard, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BrandingDto } from "@/lib/branding";
import { mentorLabel } from "@/lib/branding";
import { resolveAssetUrl } from "@/lib/assets";
import { brandForegroundFor, normalizeHex } from "@/lib/theme";

type PreviewTab = "login" | "dashboard" | "components";

export type BrandingPreviewForm = {
  displayName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  mentorDisplayName: string;
};

type Props = {
  form: BrandingPreviewForm;
  saved?: BrandingDto | null;
  hasDraftChanges?: boolean;
  onPreviewLogin?: () => void;
  onPreviewLanding?: () => void;
};

export function BrandingThemePreview({
  form,
  saved,
  hasDraftChanges = false,
  onPreviewLogin,
  onPreviewLanding,
}: Props) {
  const [tab, setTab] = useState<PreviewTab>("login");

  const fallbackColor = saved?.primaryColor ?? "#0b3d91";
  const brand = normalizeHex(form.primaryColor, fallbackColor);
  const brandFg = brandForegroundFor(brand);

  const previewBranding: BrandingDto = useMemo(
    () => ({
      slug: saved?.slug ?? "preview",
      displayName: form.displayName.trim() || "Your Academy",
      logoUrl: form.logoUrl || null,
      faviconUrl: null,
      primaryColor: brand,
      supportEmail: form.supportEmail || null,
      mentorDisplayName: form.mentorDisplayName || "",
      syllabusMentorEnabled: saved?.syllabusMentorEnabled ?? true,
      bundlePriceEditEnabled: saved?.bundlePriceEditEnabled ?? true,
      mcqBulkImportEnabled: saved?.mcqBulkImportEnabled ?? true,
    }),
    [form, saved, brand],
  );

  const logoUrl = resolveAssetUrl(previewBranding.logoUrl);
  const name = previewBranding.displayName;

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: "login", label: "Login" },
    { id: "dashboard", label: "Dashboard" },
    { id: "components", label: "UI elements" },
  ];

  const brandStyle = { color: brand };
  const brandBgStyle = { backgroundColor: brand, color: brandFg };

  return (
    <div className="xl:sticky xl:top-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <Eye className="h-4 w-4 text-[var(--brand)]" />
          Draft preview
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            hasDraftChanges
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {hasDraftChanges ? "Unsaved changes" : "Matches saved theme"}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Updates instantly as you edit. Click <strong>Save theme</strong> to publish site-wide.
      </p>

      {(onPreviewLogin || onPreviewLanding) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {onPreviewLogin && (
            <Button type="button" variant="outline" size="sm" onClick={onPreviewLogin}>
              <ExternalLink className="h-3.5 w-3.5" />
              {hasDraftChanges ? "Preview draft on login" : "View live login"}
            </Button>
          )}
          {onPreviewLanding && (
            <Button type="button" variant="outline" size="sm" onClick={onPreviewLanding}>
              <ExternalLink className="h-3.5 w-3.5" />
              {hasDraftChanges ? "Preview draft on landing" : "View live landing"}
            </Button>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 shadow-inner">
        {tab === "login" && (
          <div className="flex min-h-[300px] items-center justify-center bg-gradient-to-b from-slate-100 to-white p-6">
            <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
              <div className="mb-3 flex items-center gap-2 font-bold" style={brandStyle}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
                ) : (
                  <GraduationCap className="h-6 w-6" />
                )}
                <span className="truncate text-sm">{name}</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">Log in to your account</p>
              <div className="mt-4 space-y-2">
                <div className="h-8 rounded-md border border-slate-200 bg-slate-50" />
                <div className="h-8 rounded-md border border-slate-200 bg-slate-50" />
                <div
                  className="flex h-9 items-center justify-center rounded-md text-sm font-medium"
                  style={brandBgStyle}
                >
                  Log in
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "dashboard" && (
          <div className="min-h-[300px] bg-white">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2 font-bold" style={brandStyle}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-7 w-7 rounded object-contain" />
                ) : (
                  <GraduationCap className="h-5 w-5" />
                )}
                <span className="truncate text-sm">{name}</span>
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                style={brandBgStyle}
              >
                S
              </div>
            </header>
            <div className="p-4">
              <p className="text-sm font-semibold text-slate-900">Dashboard</p>
              <p className="mt-0.5 text-xs text-slate-500">Continue where you left off.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <BookOpen className="h-4 w-4" style={brandStyle} />
                  <p className="mt-1 text-xs font-medium text-slate-800">My courses</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <LayoutDashboard className="h-4 w-4" style={brandStyle} />
                  <p className="mt-1 text-xs font-medium text-slate-800">
                    {mentorLabel(previewBranding)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "components" && (
          <div className="space-y-4 p-5">
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Primary button</p>
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm font-medium"
                style={brandBgStyle}
              >
                Enroll now
              </button>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Active nav tab</p>
              <span
                className="inline-block rounded-md px-3 py-1.5 text-xs font-medium"
                style={brandBgStyle}
              >
                Content
              </span>
              <span className="ml-2 inline-block rounded-md px-3 py-1.5 text-xs text-slate-600">
                Students
              </span>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Link accent</p>
              <span className="text-sm font-medium" style={brandStyle}>
                View course →
              </span>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Brand color</p>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded border border-slate-200" style={{ backgroundColor: brand }} />
                <code className="text-xs text-slate-600">{brand}</code>
              </div>
            </div>
            {form.supportEmail && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Support footer</p>
                <p className="text-xs text-slate-600">
                  Questions? <span style={brandStyle}>{form.supportEmail}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
