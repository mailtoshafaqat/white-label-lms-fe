"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, UserPlus, Copy, Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { superAdminApi, type TenantDetailDto, type CreatedInstituteAdminDto } from "@/lib/api";
import { getSession, isSuperAdmin } from "@/lib/auth";

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tenant, setTenant] = useState<TenantDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<CreatedInstituteAdminDto | null>(null);
  const [copied, setCopied] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [branding, setBranding] = useState({
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
    if (!isSuperAdmin(session)) {
      router.replace("/dashboard");
      return;
    }
    Promise.all([superAdminApi.getTenant(id), superAdminApi.getTenantBranding(id)])
      .then(([t, b]) => {
        setTenant(t);
        setBranding({
          displayName: b.displayName,
          logoUrl: b.logoUrl ?? "",
          faviconUrl: b.faviconUrl ?? "",
          primaryColor: b.primaryColor,
          supportEmail: b.supportEmail ?? "",
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router, id]);

  async function saveFlags(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await superAdminApi.updateFlags(id, {
        status: tenant.status,
        plan: tenant.plan,
        customDomain: tenant.customDomain || null,
        liveClassesEnabled: tenant.liveClassesEnabled,
        zoomMode: tenant.zoomMode,
        paymentMode: tenant.paymentMode,
        allowStudentSelfEnroll: tenant.allowStudentSelfEnroll,
        allowAdminCreateStudent: tenant.allowAdminCreateStudent,
      });
      setTenant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setCreatingAdmin(true);
    setError(null);
    setCreatedAdmin(null);
    try {
      const result = await superAdminApi.createInstituteAdmin(id, {
        fullName: adminName,
        email: adminEmail,
      });
      setCreatedAdmin(result);
      setAdminName("");
      setAdminEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create admin");
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    setSavingBranding(true);
    setError(null);
    try {
      const result = await superAdminApi.saveTenantBranding(id, {
        displayName: branding.displayName,
        logoUrl: branding.logoUrl || null,
        faviconUrl: branding.faviconUrl || null,
        primaryColor: branding.primaryColor,
        supportEmail: branding.supportEmail || null,
      });
      setBranding({
        displayName: result.displayName,
        logoUrl: result.logoUrl ?? "",
        faviconUrl: result.faviconUrl ?? "",
        primaryColor: result.primaryColor,
        supportEmail: result.supportEmail ?? "",
      });
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save branding");
    } finally {
      setSavingBranding(false);
    }
  }

  function copyCreds() {
    if (!createdAdmin) return;
    navigator.clipboard.writeText(
      `Email: ${createdAdmin.email}\nPassword: ${createdAdmin.tempPassword}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const field = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-sm font-medium text-slate-700";

  if (loading) return <main className="p-8 text-slate-500">Loading…</main>;
  if (!tenant) return <main className="p-8 text-red-600">{error ?? "Tenant not found"}</main>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/superadmin" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> All institutes
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
        <p className="text-slate-500">
          {tenant.slug} · {tenant.status} · {tenant.plan}
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Feature flags</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveFlags}>
              <div>
                <label className={label}>Custom domain (optional)</label>
                <input
                  value={tenant.customDomain ?? ""}
                  onChange={(e) => setTenant({ ...tenant, customDomain: e.target.value || null })}
                  placeholder="learn.example.com"
                  className={field}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Maps this hostname to the tenant. Leave blank to use subdomain only.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Status</label>
                  <select
                    value={tenant.status}
                    onChange={(e) => setTenant({ ...tenant, status: e.target.value })}
                    className={field}
                  >
                    <option value="Trial">Trial</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Plan</label>
                  <input
                    value={tenant.plan}
                    onChange={(e) => setTenant({ ...tenant, plan: e.target.value })}
                    className={field}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tenant.liveClassesEnabled}
                  onChange={(e) => setTenant({ ...tenant, liveClassesEnabled: e.target.checked })}
                />
                Live classes enabled
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Zoom mode</label>
                  <select
                    value={tenant.zoomMode}
                    onChange={(e) => setTenant({ ...tenant, zoomMode: e.target.value })}
                    className={field}
                  >
                    <option value="Disabled">Disabled</option>
                    <option value="TenantManaged">Tenant BYO (recommended)</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Payment mode</label>
                  <select
                    value={tenant.paymentMode}
                    onChange={(e) => setTenant({ ...tenant, paymentMode: e.target.value })}
                    className={field}
                  >
                    <option value="TenantManaged">Tenant BYO (admin grants access)</option>
                    <option value="PlatformManaged">Platform checkout (Phase 3)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tenant.allowAdminCreateStudent}
                  onChange={(e) => setTenant({ ...tenant, allowAdminCreateStudent: e.target.checked })}
                />
                Allow admin to create students
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tenant.allowStudentSelfEnroll}
                  onChange={(e) => setTenant({ ...tenant, allowStudentSelfEnroll: e.target.checked })}
                />
                Allow student self-enroll (off for BYO payments)
              </label>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save flags"}
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" /> White-label branding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveBranding}>
              <div>
                <label className={label}>Display name</label>
                <input
                  required
                  value={branding.displayName}
                  onChange={(e) => setBranding({ ...branding, displayName: e.target.value })}
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Logo URL</label>
                <input
                  value={branding.logoUrl}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Primary color</label>
                <input
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className={field}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={savingBranding}>
                  <Save className="h-4 w-4" /> {savingBranding ? "Saving…" : "Save branding"}
                </Button>
                {brandingSaved && (
                  <span className="flex items-center gap-1 text-sm text-emerald-700">
                    <Check className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Institute admin credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-600">
              Create the institute&apos;s first admin. They manage students, courses, Zoom, and email inside their tenant.
            </p>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={createAdmin}>
              <div>
                <label className={label}>Full name</label>
                <input
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className={field}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={creatingAdmin}>
                  <UserPlus className="h-4 w-4" /> {creatingAdmin ? "Creating…" : "Create institute admin"}
                </Button>
              </div>
            </form>

            {createdAdmin && (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <p className="font-medium text-emerald-800">{createdAdmin.fullName} created</p>
                <p className="mt-1 font-mono text-slate-700">Email: {createdAdmin.email}</p>
                <p className="font-mono text-slate-700">Temp password: {createdAdmin.tempPassword}</p>
                <button
                  type="button"
                  onClick={copyCreds}
                  className="mt-2 flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy credentials"}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
