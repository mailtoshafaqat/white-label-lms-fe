"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { superAdminApi, type TenantListItemDto } from "@/lib/api";
import { getSession, isSuperAdmin } from "@/lib/auth";

const statusStyle: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Trial: "bg-blue-100 text-blue-700",
  Suspended: "bg-red-100 text-red-700",
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("MVP");
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
      const t = await superAdminApi.createTenant({ name, slug, plan });
      setTenants((prev) => [
        {
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          plan: t.plan,
          createdAt: t.createdAt,
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

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Building2 className="h-6 w-6" />
          <span>Platform · SuperAdmin</span>
        </div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
          Dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Institutes (tenants)</h1>
        <p className="mt-1 text-slate-600">
          Create institutes and set feature flags. Each tenant manages its own students, courses, Zoom, and payments (BYO).
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Onboard a new institute</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-3" onSubmit={handleCreate}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Institute name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ABC Academy"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Slug</label>
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="abc-academy"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="MVP">MVP</option>
                  <option value="Pro">Pro</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={submitting}>
                  <Plus className="h-4 w-4" /> {submitting ? "Creating…" : "Create institute"}
                </Button>
                <p className="mt-2 text-xs text-slate-500">
                  Defaults: BYO Zoom, BYO payments, admin-managed students (no self-enroll).
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">All institutes</h2>
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : tenants.length === 0 ? (
            <p className="text-slate-500">No institutes yet.</p>
          ) : (
            tenants.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{t.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyle[t.status] ?? "bg-slate-100"}`}>
                      {t.status}
                    </span>
                    <span className="text-xs text-slate-400">{t.plan}</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {t.slug} · created {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/superadmin/tenants/${t.id}`}
                  className="flex items-center gap-1 text-sm text-[var(--brand)] hover:underline"
                >
                  <Settings className="h-4 w-4" /> Manage
                </Link>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
