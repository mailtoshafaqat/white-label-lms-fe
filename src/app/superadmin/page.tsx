"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Settings, Sparkles, Users } from "lucide-react";
import { SuperAdminShell } from "@/components/superadmin-shell";
import { superAdminApi, type ProductProfile, type TenantListItemDto } from "@/lib/api";
import { formatBytes } from "@/lib/format-bytes";
import { PRODUCT_PROFILE_LABELS } from "@/lib/product-profile";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { trialListBadge } from "@/lib/trial";

const statusStyle: Record<string, string> = {
  Active: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  Trial: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
  Suspended: "bg-red-500/20 text-red-300 ring-red-500/30",
};

const planStyle: Record<string, string> = {
  MVP: "bg-violet-500/20 text-violet-200",
  Pro: "bg-amber-500/20 text-amber-200",
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("MVP");
  const [productProfile, setProductProfile] = useState<ProductProfile>("ExamPrep");
  const [submitting, setSubmitting] = useState(false);

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
    superAdminApi
      .listTenants()
      .then(setTenants)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const t = await superAdminApi.createTenant({ name, slug, plan, productProfile });
      setTenants((prev) => [
        {
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          plan: t.plan,
          trialEndsAt: t.trialEndsAt,
          createdAt: t.createdAt,
          storageUsedBytes: 0,
          storageQuotaBytes: t.plan === "Pro" ? 107374182400 : 21474836480,
          storageUsedPercent: 0,
          storageQuotaBypass: false,
        },
        ...prev,
      ]);
      setName("");
      setSlug("");
      router.push(`/superadmin/tenants/${t.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tenant");
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400";
  const selectField =
    "w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400";
  const label = "mb-1.5 block text-sm font-medium text-slate-300";

  return (
    <SuperAdminShell
      title="Institutes"
      subtitle="You configure tenants here. Each institute admin then runs their own branded LMS — courses, students, Zoom, and email are all tenant-managed (BYO)."
    >
      {error && (
        <p className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <p className="mt-2 text-sm font-medium text-white">You configure</p>
          <p className="mt-1 text-xs text-slate-400">Tenant flags, branding defaults, institute admins</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <Users className="h-5 w-5 text-indigo-400" />
          <p className="mt-2 text-sm font-medium text-white">They operate</p>
          <p className="mt-1 text-xs text-slate-400">Institute admin runs CMS, students, Zoom, email</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <Settings className="h-5 w-5 text-indigo-400" />
          <p className="mt-2 text-sm font-medium text-white">Per-tenant</p>
          <p className="mt-1 text-xs text-slate-400">Each institute has isolated data and branding</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:col-span-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Plus className="h-5 w-5 text-indigo-400" /> Onboard institute
          </h2>
          <form className="mt-5 space-y-4" onSubmit={handleCreate}>
            <div>
              <label className={label}>Institute name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ABC Academy"
                className={field}
              />
            </div>
            <div>
              <label className={label}>Slug (login URL)</label>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="abc-academy"
                className={field}
              />
              <p className="mt-1 text-xs text-slate-500">
                Login: /login?tenant={slug || "slug"}
              </p>
            </div>
            <div>
              <label className={label}>Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className={selectField}
              >
                <option value="MVP">MVP — core LMS</option>
                <option value="Pro">Pro — premium (reserved)</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Label for billing/ops. MVP = full current feature set. Pro reserved for future analytics & platform payments.
              </p>
            </div>
            <div>
              <label className={label}>Product profile</label>
              <select
                value={productProfile}
                onChange={(e) => setProductProfile(e.target.value as ProductProfile)}
                className={selectField}
              >
                {(Object.keys(PRODUCT_PROFILE_LABELS) as ProductProfile[]).map((key) => (
                  <option key={key} value={key}>
                    {PRODUCT_PROFILE_LABELS[key]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Sets menus and exam-prep modules. Institute can use feature flags for fine tuning.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create institute"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">All institutes ({tenants.length})</h2>
          </div>
          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : tenants.length === 0 ? (
            <p className="text-slate-400">No institutes yet. Create one to get started.</p>
          ) : (
            <div className="space-y-3">
              {tenants.map((t) => {
                const trialBadge = trialListBadge(t.status, t.trialEndsAt);
                return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-indigo-400/40 hover:bg-white/[0.07]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold text-white">{t.name}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyle[t.status] ?? "bg-slate-500/20 text-slate-300"}`}
                      >
                        {t.status}
                      </span>
                      {trialBadge && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            trialBadge === "Trial expired"
                              ? "bg-amber-500/20 text-amber-200 ring-amber-500/30"
                              : "bg-sky-500/20 text-sky-200 ring-sky-500/30"
                          }`}
                        >
                          {trialBadge}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${planStyle[t.plan] ?? "bg-slate-500/20 text-slate-300"}`}
                      >
                        {t.plan}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      <span className="font-mono text-indigo-300">{t.slug}</span> · created{" "}
                      {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Storage: {formatBytes(t.storageUsedBytes)} / {formatBytes(t.storageQuotaBytes)}
                      {t.storageUsedPercent >= 80 && (
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                            t.storageUsedPercent >= 100
                              ? "bg-red-500/20 text-red-200"
                              : "bg-amber-500/20 text-amber-200"
                          }`}
                        >
                          {t.storageUsedPercent}%
                        </span>
                      )}
                      {t.storageQuotaBypass && (
                        <span className="ml-2 rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-200">
                          bypass
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/superadmin/tenants/${t.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
                  >
                    <Settings className="h-4 w-4" /> Configure
                  </Link>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
