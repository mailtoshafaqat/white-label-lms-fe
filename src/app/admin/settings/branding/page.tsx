"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, Palette, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { adminApi, type BrandingDto } from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";
import { applyBranding } from "@/lib/branding";
import { resolveAssetUrl } from "@/lib/assets";

export default function BrandingSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#0b3d91",
    supportEmail: "",
  });

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
        setForm({
          displayName: b.displayName,
          logoUrl: b.logoUrl ?? "",
          faviconUrl: b.faviconUrl ?? "",
          primaryColor: b.primaryColor,
          supportEmail: b.supportEmail ?? "",
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.saveBranding({
        displayName: form.displayName,
        logoUrl: form.logoUrl || null,
        faviconUrl: form.faviconUrl || null,
        primaryColor: form.primaryColor,
        supportEmail: form.supportEmail || null,
      });
      applyBranding(result);
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
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Palette className="h-6 w-6 text-[var(--brand)]" /> White-label branding
        </h1>
        <p className="mt-1 text-slate-600">
          Your institute name, logo, and colors appear on login and across the student experience.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Brand appearance</CardTitle>
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
                          className="h-14 w-14 rounded border border-slate-200 object-contain"
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
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading…" : "Upload image"}
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
                          className="h-8 w-8 rounded border border-slate-200 object-contain"
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
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
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
                  <p className="mt-1 text-xs text-slate-500">Shown in the browser tab. PNG or ICO recommended.</p>
                </div>
                <div>
                  <label className={label}>Primary color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="h-10 w-14 cursor-pointer rounded border border-slate-300"
                    />
                    <input
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className={field}
                    />
                  </div>
                </div>
                <div>
                  <label className={label}>Support email (shown to students)</label>
                  <input
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                    className={field}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save branding"}
                  </Button>
                  {saved && (
                    <span className="flex items-center gap-1 text-sm text-emerald-700">
                      <Check className="h-4 w-4" /> Saved
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
