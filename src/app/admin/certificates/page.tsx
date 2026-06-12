"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Award, Download, Settings2 } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, coursesApi, type AdminCertificateDto, type BundleDto } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";
import { rangeLabel } from "@/lib/paged-list";

export default function AdminCertificatesPage() {
  const router = useRouter();
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [bundleId, setBundleId] = useState("");
  const [rows, setRows] = useState<AdminCertificateDto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/login");
      return;
    }
    coursesApi.bundles().then(setBundles).catch(() => setBundles([]));
  }, [router]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listCertificates(bundleId || undefined, page, pageSize)
      .then((r) => {
        setRows(r.data);
        setTotal(r.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [bundleId, page, pageSize]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Award className="h-7 w-7 text-[var(--brand)]" />
              Completion certificates
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Auto-issued when a student completes all topics (video watch ≥90% or quiz submitted per topic).
            </p>
          </div>
          <Link
            href="/admin/certificates/template"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Settings2 className="h-4 w-4" />
            Certificate template
          </Link>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-slate-700">Filter by course</label>
          <select
            value={bundleId}
            onChange={(e) => {
              setBundleId(e.target.value);
              setPage(1);
            }}
            className="mt-1 h-10 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All courses</option>
            {bundles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <Card className="mt-6 border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{rangeLabel(page, pageSize, total)}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-500">No certificates issued yet.</p>
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="pb-2 pr-4">Student</th>
                    <th className="pb-2 pr-4">Course</th>
                    <th className="pb-2 pr-4">Certificate #</th>
                    <th className="pb-2 pr-4">Issued</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{r.studentName}</td>
                      <td className="py-2.5 pr-4">{r.bundleTitle}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{r.certificateNumber}</td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {new Date(r.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => void adminApi.downloadCertificatePdf(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[var(--brand)]/40 hover:text-[var(--brand)]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {total > pageSize && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page * pageSize >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
