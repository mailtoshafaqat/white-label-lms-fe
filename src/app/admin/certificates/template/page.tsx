"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, Save, Upload } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { adminApi, type CertificateTemplateDto } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";
import { resolveAssetUrl } from "@/lib/assets";

export default function CertificateTemplatePage() {
  const router = useRouter();
  const [form, setForm] = useState<CertificateTemplateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/login");
      return;
    }
    adminApi
      .getCertificateTemplate()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function uploadImage(
    file: File,
    field: "backgroundUrl" | "logoUrl" | "signatureUrl",
    folder: string
  ) {
    if (!form) return;
    setUploading(field);
    setError(null);
    try {
      const result = await adminApi.uploadFile(file, folder);
      setForm({ ...form, [field]: result.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await adminApi.saveCertificateTemplate({
        title: form.title,
        subtitle: form.subtitle,
        backgroundUrl: form.backgroundUrl,
        logoUrl: form.logoUrl,
        signatureUrl: form.signatureUrl,
        signatureLabel: form.signatureLabel,
        primaryColor: form.primaryColor,
        showQrCode: form.showQrCode,
        enabled: form.enabled,
      });
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/admin/certificates"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-[var(--brand)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to issued certificates
        </Link>

        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Award className="h-7 w-7 text-[var(--brand)]" />
          Certificate template
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          One template per institute. PDFs include a QR code linking to public verification.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {loading || !form ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Enable certificate issuance for this institute
            </label>

            <div>
              <label className="text-sm font-medium text-slate-700">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Subtitle</label>
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Primary color</label>
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="mt-1 h-10 w-20 rounded border border-slate-200"
              />
            </div>

            <ImageField
              label="Logo (optional)"
              url={form.logoUrl}
              uploading={uploading === "logoUrl"}
              onUpload={(f) => void uploadImage(f, "logoUrl", "branding")}
              onClear={() => setForm({ ...form, logoUrl: null })}
            />

            <ImageField
              label="Background image (optional, A4 landscape)"
              url={form.backgroundUrl}
              uploading={uploading === "backgroundUrl"}
              onUpload={(f) => void uploadImage(f, "backgroundUrl", "uploads")}
              onClear={() => setForm({ ...form, backgroundUrl: null })}
            />

            <ImageField
              label="Signature image (optional)"
              url={form.signatureUrl}
              uploading={uploading === "signatureUrl"}
              onUpload={(f) => void uploadImage(f, "signatureUrl", "branding")}
              onClear={() => setForm({ ...form, signatureUrl: null })}
            />

            <div>
              <label className="text-sm font-medium text-slate-700">Signature label</label>
              <input
                value={form.signatureLabel}
                onChange={(e) => setForm({ ...form, signatureLabel: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.showQrCode}
                onChange={(e) => setForm({ ...form, showQrCode: e.target.checked })}
              />
              Show QR code on PDF (links to public verify page)
            </label>

            <p className="text-xs text-slate-500">
              Merge fields on PDF: student name, course name, issue date, certificate number, institute name.
            </p>

            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : saved ? "Saved" : "Save template"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

function ImageField({
  label,
  url,
  uploading,
  onUpload,
  onClear,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        {url && (
          <>
            <img src={resolveAssetUrl(url)} alt="" className="h-12 max-w-[120px] object-contain" />
            <button type="button" onClick={onClear} className="text-xs text-red-600 hover:underline">
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
