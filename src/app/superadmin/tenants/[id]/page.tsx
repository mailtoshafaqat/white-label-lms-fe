"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  UserPlus,
  Copy,
  Check,
  Palette,
  Upload,
  X,
  Users,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SuperAdminShell } from "@/components/superadmin-shell";
import {
  superAdminApi,
  type TenantDetailDto,
  type CreatedInstituteAdminDto,
  type InstituteAdminListItemDto,
  type ResetInstituteAdminPasswordDto,
} from "@/lib/api";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { resolveAssetUrl } from "@/lib/assets";
import { persistTenantSlug } from "@/lib/tenant";

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tenant, setTenant] = useState<TenantDetailDto | null>(null);
  const [admins, setAdmins] = useState<InstituteAdminListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<CreatedInstituteAdminDto | null>(null);
  const [resetAdmin, setResetAdmin] = useState<ResetInstituteAdminPasswordDto | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<InstituteAdminListItemDto | null>(null);
  const [copied, setCopied] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [branding, setBranding] = useState({
    displayName: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#0b3d91",
    supportEmail: "",
    mentorDisplayName: "",
  });

  async function loadAdmins() {
    const list = await superAdminApi.listInstituteAdmins(id);
    setAdmins(list);
  }

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
    Promise.all([
      superAdminApi.getTenant(id),
      superAdminApi.getTenantBranding(id),
      superAdminApi.listInstituteAdmins(id),
    ])
      .then(([t, b, a]) => {
        setTenant(t);
        persistTenantSlug(t.slug);
        setAdmins(a);
        setBranding({
          displayName: b.displayName,
          logoUrl: b.logoUrl ?? "",
          faviconUrl: b.faviconUrl ?? "",
          primaryColor: b.primaryColor,
          supportEmail: b.supportEmail ?? "",
          mentorDisplayName: b.mentorDisplayName ?? "",
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
        productProfile: tenant.productProfile ?? "ExamPrep",
        customDomain: tenant.customDomain || null,
        liveClassesEnabled: tenant.liveClassesEnabled,
        zoomMode: tenant.zoomMode,
        paymentMode: tenant.paymentMode,
        allowStudentSelfEnroll: tenant.allowStudentSelfEnroll,
        allowAdminCreateStudent: tenant.allowAdminCreateStudent,
        syllabusMentorEnabled: tenant.syllabusMentorEnabled,
        bundlePriceEditEnabled: tenant.bundlePriceEditEnabled,
        mcqBulkImportEnabled: tenant.mcqBulkImportEnabled,
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
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create admin");
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function handleFileUpload(file: File, field: "logoUrl" | "faviconUrl") {
    setUploading(true);
    setError(null);
    try {
      const result = await superAdminApi.uploadFile(file, "branding");
      setBranding((b) => ({ ...b, [field]: result.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
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
        mentorDisplayName: branding.mentorDisplayName || null,
      });
      setBranding({
        displayName: result.displayName,
        logoUrl: result.logoUrl ?? "",
        faviconUrl: result.faviconUrl ?? "",
        primaryColor: result.primaryColor,
        supportEmail: result.supportEmail ?? "",
        mentorDisplayName: result.mentorDisplayName ?? "",
      });
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save branding");
    } finally {
      setSavingBranding(false);
    }
  }

  function copyCreds(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function requestResetAdminPassword(admin: InstituteAdminListItemDto) {
    setResetConfirm(admin);
  }

  async function confirmResetAdminPassword() {
    if (!resetConfirm) return;
    const userId = resetConfirm.userId;
    setResettingUserId(userId);
    setError(null);
    setResetAdmin(null);
    try {
      const result = await superAdminApi.resetInstituteAdminPassword(id, userId);
      setResetAdmin(result);
      setCreatedAdmin(null);
      setResetConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset password");
    } finally {
      setResettingUserId(null);
    }
  }

  const field =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400";
  const selectField =
    "w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400";
  const label = "mb-1.5 block text-sm font-medium text-slate-300";
  const card = "rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur";
  const btn =
    "inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60";

  if (loading) {
    return (
      <SuperAdminShell title="Loading…">
        <p className="text-slate-400">Loading institute…</p>
      </SuperAdminShell>
    );
  }
  if (!tenant) {
    return (
      <SuperAdminShell title="Not found">
        <p className="text-red-300">{error ?? "Tenant not found"}</p>
      </SuperAdminShell>
    );
  }

  const loginUrl = `http://localhost:3000/login?tenant=${tenant.slug}`;

  return (
    <SuperAdminShell
      title={tenant.name}
      subtitle={`${tenant.slug} · ${tenant.status} · ${tenant.plan} plan`}
    >
      <Link
        href="/superadmin"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> All institutes
      </Link>

      {error && (
        <p className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <a
          href={loginUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
        >
          <ExternalLink className="h-4 w-4" /> Institute login page
        </a>
        <span className="self-center font-mono text-xs text-slate-500">{loginUrl}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-lg font-semibold text-white">Feature flags</h2>
          <p className="mt-1 text-sm text-slate-400">What this institute can use. Institute admin handles day-to-day config.</p>
          <form className="mt-5 space-y-4" onSubmit={saveFlags}>
            <div>
              <label className={label}>Custom domain (optional)</label>
              <input
                value={tenant.customDomain ?? ""}
                onChange={(e) => setTenant({ ...tenant, customDomain: e.target.value || null })}
                placeholder="learn.example.com"
                className={field}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Status</label>
                <select
                  value={tenant.status}
                  onChange={(e) => setTenant({ ...tenant, status: e.target.value })}
                  className={selectField}
                >
                  <option value="Trial">Trial</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className={label}>Plan</label>
                <select
                  value={tenant.plan}
                  onChange={(e) => setTenant({ ...tenant, plan: e.target.value })}
                  className={selectField}
                >
                  <option value="MVP">MVP</option>
                  <option value="Pro">Pro</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">Billing label. MVP = current features. Pro = future premium tier.</p>
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Product profile</label>
                <select
                  value={tenant.productProfile ?? "ExamPrep"}
                  onChange={(e) =>
                    setTenant({
                      ...tenant,
                      productProfile: e.target.value as "ExamPrep" | "GeneralLms" | "Both",
                    })
                  }
                  className={selectField}
                >
                  <option value="ExamPrep">Exam preparation (MDCAT / ECAT)</option>
                  <option value="GeneralLms">General LMS (courses & quizzes)</option>
                  <option value="Both">Both (academy + courses)</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Controls default menus and exam-prep modules (mocks, doubts, mistake diary). Re-login required for institute users to refresh session.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={tenant.liveClassesEnabled}
                onChange={(e) => setTenant({ ...tenant, liveClassesEnabled: e.target.checked })}
              />
              Live classes enabled
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={tenant.syllabusMentorEnabled}
                onChange={(e) => setTenant({ ...tenant, syllabusMentorEnabled: e.target.checked })}
              />
              Syllabus Mentor (AI) enabled
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={tenant.allowAdminCreateStudent}
                onChange={(e) => setTenant({ ...tenant, allowAdminCreateStudent: e.target.checked })}
              />
              Allow admin to create students
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={tenant.allowStudentSelfEnroll}
                onChange={(e) => setTenant({ ...tenant, allowStudentSelfEnroll: e.target.checked })}
              />
              Allow student self-enroll
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={tenant.bundlePriceEditEnabled}
                onChange={(e) =>
                  setTenant({ ...tenant, bundlePriceEditEnabled: e.target.checked })
                }
              />
              Bundle price edit (institute admin catalog)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={tenant.mcqBulkImportEnabled}
                onChange={(e) =>
                  setTenant({ ...tenant, mcqBulkImportEnabled: e.target.checked })
                }
              />
              MCQ bulk CSV import (teachers + institute admin)
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className={btn}>
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save flags"}
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          </form>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Palette className="h-5 w-5 text-indigo-400" /> White-label branding
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Initial branding for the institute. They can refine this in their own admin settings.
          </p>
          <form className="mt-5 space-y-4" onSubmit={saveBranding}>
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
              <label className={label}>Logo</label>
              <div className="flex flex-wrap items-center gap-3">
                {resolveAssetUrl(branding.logoUrl || null) && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveAssetUrl(branding.logoUrl || null)!}
                      alt="Logo"
                      className="h-14 w-14 rounded-lg border border-white/20 bg-white/10 object-contain p-1"
                    />
                    <button
                      type="button"
                      className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-0.5 text-white"
                      onClick={() => setBranding({ ...branding, logoUrl: "" })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
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
              <input
                value={branding.logoUrl}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                placeholder="Or paste logo URL"
                className={`${field} mt-2`}
              />
            </div>
            <div>
              <label className={label}>Primary color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                />
                <input
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className={field}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={savingBranding} className={btn}>
                <Save className="h-4 w-4" /> {savingBranding ? "Saving…" : "Save branding"}
              </button>
              {brandingSaved && (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          </form>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Users className="h-5 w-5 text-indigo-400" /> Institute admins
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          These accounts manage the institute LMS. SuperAdmin can reset passwords for institute admins only.
        </p>

        {admins.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.userId} className="border-t border-white/10 text-slate-200">
                    <td className="px-4 py-3">{a.fullName}</td>
                    <td className="px-4 py-3 font-mono text-indigo-200">{a.email}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={resettingUserId === a.userId || !a.isActive}
                        onClick={() => requestResetAdminPassword(a)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {resettingUserId === a.userId ? "Resetting…" : "Reset password"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No institute admins yet. Create one below.</p>
        )}

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={createAdmin}>
          <div>
            <label className={label}>Full name</label>
            <input required value={adminName} onChange={(e) => setAdminName(e.target.value)} className={field} />
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
            <button type="submit" disabled={creatingAdmin} className={btn}>
              <UserPlus className="h-4 w-4" /> {creatingAdmin ? "Creating…" : "Create institute admin"}
            </button>
          </div>
        </form>

        {resetAdmin && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-medium">Password reset for {resetAdmin.fullName}</p>
            <p className="mt-2 font-mono">Email: {resetAdmin.email}</p>
            <p className="font-mono">New temp password: {resetAdmin.tempPassword}</p>
            <p className="mt-2 text-xs text-amber-200/80">
              Share the new password. Admin must change it on next login at the institute login URL.
            </p>
            <button
              type="button"
              onClick={() =>
                copyCreds(
                  `Login: ${loginUrl}\nEmail: ${resetAdmin.email}\nPassword: ${resetAdmin.tempPassword}`
                )
              }
              className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-300 hover:underline"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy login + credentials"}
            </button>
          </div>
        )}

        {createdAdmin && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p className="font-medium">{createdAdmin.fullName} created</p>
            <p className="mt-2 font-mono">Email: {createdAdmin.email}</p>
            <p className="font-mono">Temp password: {createdAdmin.tempPassword}</p>
            <p className="mt-2 text-xs text-emerald-200/80">
              Share these credentials. Admin logs in at the institute login URL above and must change password on first login.
            </p>
            <button
              type="button"
              onClick={() =>
                copyCreds(
                  `Login: ${loginUrl}\nEmail: ${createdAdmin.email}\nPassword: ${createdAdmin.tempPassword}`
                )
              }
              className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-300 hover:underline"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy login + credentials"}
            </button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={resetConfirm !== null}
        variant="dark"
        title="Reset institute admin password?"
        description={
          resetConfirm
            ? `Generate a new temporary password for ${resetConfirm.fullName} (${resetConfirm.email}). They must change it on next login.`
            : ""
        }
        confirmLabel="Reset password"
        loading={resettingUserId !== null}
        onConfirm={() => void confirmResetAdminPassword()}
        onCancel={() => {
          if (!resettingUserId) setResetConfirm(null);
        }}
      />
    </SuperAdminShell>
  );
}
