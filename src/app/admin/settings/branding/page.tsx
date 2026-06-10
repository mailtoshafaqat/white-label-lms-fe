"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, Palette, Upload, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { AdminSettingsNav } from "@/components/admin-settings-nav";
import { BrandingThemePreview } from "@/components/branding-theme-preview";
import { adminApi, type BrandingDto } from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";
import { applyBranding, brandingFromForm, getTenantSlug } from "@/lib/branding";
import {
  clearBrandingPreview,
  openPreview,
  saveBrandingPreview,
} from "@/lib/preview-session";
import { resolveAssetUrl } from "@/lib/assets";
import { THEME_PRESETS, normalizeHex, brandForegroundFor } from "@/lib/theme";

const defaultForm = {
  displayName: "",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#0b3d91",
  supportEmail: "",
  mentorDisplayName: "",
};

function hasDraftChanges(form: typeof defaultForm, saved: BrandingDto | null): boolean {
  if (!saved) return false;
  return (
    form.displayName.trim() !== saved.displayName ||
    (form.logoUrl || null) !== saved.logoUrl ||
    (form.faviconUrl || null) !== saved.faviconUrl ||
    normalizeHex(form.primaryColor) !== normalizeHex(saved.primaryColor) ||
    (form.supportEmail || null) !== saved.supportEmail ||
    (form.mentorDisplayName || "") !== (saved.mentorDisplayName || "")
  );
}

export default function BrandingSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBranding, setSavedBranding] = useState<BrandingDto | null>(null);
  const [form, setForm] = useState(defaultForm);

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
      .getBranding()
      .then((b: BrandingDto) => {
        setSavedBranding(b);
        setForm({
          displayName: b.displayName,
          logoUrl: b.logoUrl ?? "",
          faviconUrl: b.faviconUrl ?? "",
          primaryColor: b.primaryColor,
          supportEmail: b.supportEmail ?? "",
          mentorDisplayName: b.mentorDisplayName ?? "",
        });
        applyBranding(b);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleFileUpload(file: File, field: "logoUrl" | "faviconUrl") {
    setUploading(true);
    setError(null);
    try {
      const result = await adminApi.uploadFile(file, "branding");
      setForm((f) => ({ ...f, [field]: result.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function setPrimaryColor(color: string) {
    setForm((f) => ({ ...f, primaryColor: normalizeHex(color, f.primaryColor) }));
  }

  function previewOn(path: "/" | "/login") {
    const slug = savedBranding?.slug ?? getTenantSlug();
    if (hasDraftChanges(form, savedBranding)) {
      saveBrandingPreview(slug, brandingFromForm(form, savedBranding, slug));
      openPreview(path, slug, { branding: true });
      return;
    }
    clearBrandingPreview();
    openPreview(path, slug, { branding: false });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.saveBranding({
        displayName: form.displayName.trim(),
        logoUrl: form.logoUrl || null,
        faviconUrl: form.faviconUrl || null,
        primaryColor: normalizeHex(form.primaryColor),
        supportEmail: form.supportEmail || null,
        mentorDisplayName: form.mentorDisplayName || null,
      });
      setSavedBranding(result);
      applyBranding(result);
      setForm((f) => ({ ...f, primaryColor: result.primaryColor }));
      clearBrandingPreview();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]";
  const label = "mb-1 block text-sm font-medium text-slate-700";
  const previewColor = normalizeHex(form.primaryColor, savedBranding?.primaryColor ?? "#0b3d91");
  const buttonFg = brandForegroundFor(previewColor);
  const draftActive = hasDraftChanges(form, savedBranding);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <AdminSettingsNav />
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Palette className="h-6 w-6 text-[var(--brand)]" /> Theme & branding
        </h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          Customize how your institute looks on login, the student dashboard, and emails. Use the
          live preview before saving.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] xl:items-start">
          <div className="order-2 space-y-6 xl:order-1">
            {loading && (
              <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Loading saved theme…
              </p>
            )}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                    Color presets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {THEME_PRESETS.map((preset) => {
                      const active =
                        normalizeHex(form.primaryColor) === normalizeHex(preset.primary);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          title={preset.description}
                          onClick={() => setPrimaryColor(preset.primary)}
                          className={`rounded-xl border p-2 text-left transition-all ${
                            active
                              ? "border-slate-800 ring-2 ring-slate-800 ring-offset-2"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <span
                            className="block h-8 w-full rounded-lg"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span className="mt-2 block text-xs font-medium text-slate-800">
                            {preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Brand identity</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSave}>
                    <div>
                      <label className={label}>Display name</label>
                      <input
                        required
                        value={form.displayName}
                        onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                        className={field}
                        placeholder="ABC Academy"
                      />
                    </div>
                    <div>
                      <label className={label}>Syllabus Mentor label (optional)</label>
                      <input
                        value={form.mentorDisplayName}
                        onChange={(e) => setForm({ ...form, mentorDisplayName: e.target.value })}
                        placeholder={`${form.displayName || "Academy"} Mentor`}
                        className={field}
                      />
                    </div>
                    <div>
                      <label className={label}>Logo (optional)</label>
                      <div className="flex flex-wrap items-center gap-3">
                        {resolveAssetUrl(form.logoUrl || null) && (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveAssetUrl(form.logoUrl || null)!}
                              alt="Logo preview"
                              className="h-14 w-14 rounded border border-slate-200 bg-white object-contain p-1"
                            />
                            <button
                              type="button"
                              className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-0.5 text-white"
                              onClick={() => setForm({ ...form, logoUrl: "" })}
                              aria-label="Remove logo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                          <Upload className="h-4 w-4" />
                          {uploading ? "Uploading…" : "Upload logo"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleFileUpload(file, "logoUrl");
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">PNG, JPEG, WebP, GIF, or SVG — max 2 MB.</p>
                    </div>
                    <div>
                      <label className={label}>Favicon (optional)</label>
                      <div className="flex flex-wrap items-center gap-3">
                        {resolveAssetUrl(form.faviconUrl || null) && (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveAssetUrl(form.faviconUrl || null)!}
                              alt="Favicon preview"
                              className="h-8 w-8 rounded border border-slate-200 bg-white object-contain"
                            />
                            <button
                              type="button"
                              className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-0.5 text-white"
                              onClick={() => setForm({ ...form, faviconUrl: "" })}
                              aria-label="Remove favicon"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                          <Upload className="h-4 w-4" />
                          {uploading ? "Uploading…" : "Upload favicon"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleFileUpload(file, "faviconUrl");
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className={label}>Primary color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={previewColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white"
                        />
                        <input
                          value={form.primaryColor}
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          onBlur={(e) => setPrimaryColor(e.target.value)}
                          className={field}
                          placeholder="#0b3d91"
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                        <span
                          className="inline-flex rounded-md px-3 py-1.5 text-xs font-medium"
                          style={{
                            backgroundColor: previewColor,
                            color: buttonFg,
                          }}
                        >
                          Button preview
                        </span>
                        <span className="text-xs text-slate-500">
                          Text auto-adjusts for contrast ({buttonFg === "#ffffff" ? "light" : "dark"}{" "}
                          on color)
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className={label}>Support email</label>
                      <input
                        type="email"
                        value={form.supportEmail}
                        onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                        placeholder="support@youracademy.com"
                        className={field}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                      <Button type="submit" disabled={saving}>
                        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save theme"}
                      </Button>
                      {draftActive && !saving && (
                        <span className="text-sm text-amber-700">Draft — not live yet</span>
                      )}
                      {saved && (
                        <span className="flex items-center gap-1 text-sm text-emerald-700">
                          <Check className="h-4 w-4" /> Published to your institute
                        </span>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
          </div>

          <div className="order-1 xl:order-2">
            <BrandingThemePreview
              form={form}
              saved={savedBranding}
              hasDraftChanges={draftActive}
              onPreviewLogin={() => previewOn("/login")}
              onPreviewLanding={() => previewOn("/")}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
