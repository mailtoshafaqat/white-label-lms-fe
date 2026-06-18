"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, CreditCard, X } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminApi,
  coursesApi,
  type AdminPaymentOrderDto,
  type BundleDto,
  type StudentListItemDto,
} from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";
import { profileBundleLabel } from "@/lib/product-profile";

type FilterTab = "pending" | "all" | "paid" | "failed";

function studentLabel(o: AdminPaymentOrderDto, students: StudentListItemDto[]): string {
  if (o.studentFullName && o.studentEmail) return `${o.studentFullName} (${o.studentEmail})`;
  if (o.studentFullName) return o.studentFullName;
  const match = students.find((s) => s.userId === o.userId);
  if (match) return `${match.fullName} (${match.email})`;
  return o.studentEmail ?? o.userId;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const tenant = getSession()?.tenant;
  const bundleLabel = profileBundleLabel(tenant);
  const [orders, setOrders] = useState<AdminPaymentOrderDto[]>([]);
  const [students, setStudents] = useState<StudentListItemDto[]>([]);
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [recordUserId, setRecordUserId] = useState("");
  const [recordBundleId, setRecordBundleId] = useState("");
  const [recordTxnRef, setRecordTxnRef] = useState("");
  const [recordNote, setRecordNote] = useState("");
  const [recording, setRecording] = useState(false);

  function reload() {
    return adminApi.listPaymentOrders().then(setOrders);
  }

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
    Promise.all([
      reload(),
      adminApi.listStudents({ page: 1, pageSize: 200 }).then((r) => r.data),
      coursesApi.bundles().catch(() => [] as BundleDto[]),
    ])
      .then(([, studentRows, bundleRows]) => {
        setStudents(studentRows);
        setBundles(bundleRows);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "AwaitingApproval" && o.gateway === "Manual").length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    switch (filter) {
      case "pending":
        return orders.filter((o) => o.status === "AwaitingApproval");
      case "paid":
        return orders.filter((o) => o.status === "Paid");
      case "failed":
        return orders.filter((o) => o.status === "Failed" || o.status === "Cancelled");
      default:
        return orders;
    }
  }, [orders, filter]);

  async function approve(id: string) {
    setActing(id);
    setError(null);
    try {
      await adminApi.approvePayment(id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActing(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Rejection reason (optional):") ?? undefined;
    setActing(id);
    setError(null);
    try {
      await adminApi.rejectPayment(id, reason);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActing(null);
    }
  }

  async function handleRecordManual(e: React.FormEvent) {
    e.preventDefault();
    if (!recordUserId || !recordBundleId || !recordTxnRef.trim()) return;
    setRecording(true);
    setError(null);
    try {
      await adminApi.recordManualPayment({
        userId: recordUserId,
        bundleId: recordBundleId,
        transactionRef: recordTxnRef.trim(),
        note: recordNote.trim() || null,
      });
      setRecordTxnRef("");
      setRecordNote("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setRecording(false);
    }
  }

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "pending", label: "Awaiting review", count: pendingCount },
    { id: "all", label: "All" },
    { id: "paid", label: "Paid" },
    { id: "failed", label: "Rejected / failed" },
  ];

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <CreditCard className="h-6 w-6 text-[var(--brand)]" /> Payments
        </h1>
        <p className="mt-1 text-slate-600">
          Review student manual payment submissions (transaction ID + note) and approve or reject
          enrollments.
        </p>

        {pendingCount > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{pendingCount}</strong> manual payment
              {pendingCount === 1 ? "" : "s"} waiting for your review.
            </span>
          </div>
        )}

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                filter === t.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : filteredOrders.length === 0 ? (
          <p className="mt-6 text-slate-500">
            {filter === "pending"
              ? "No manual payments awaiting review."
              : "No payment orders in this view."}
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredOrders.map((o) => (
              <Card
                key={o.id}
                className={
                  o.status === "AwaitingApproval" ? "border-amber-200 bg-amber-50/40" : undefined
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">{o.bundleTitle}</CardTitle>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        o.status === "AwaitingApproval"
                          ? "bg-amber-200 text-amber-900"
                          : o.status === "Paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-700">
                  <p>
                    <strong>Student:</strong> {studentLabel(o, students)}
                  </p>
                  <p>
                    <strong>Amount:</strong> {o.currency} {o.amount.toLocaleString()} · {o.gateway}
                  </p>
                  {o.externalPaymentId && (
                    <p>
                      <strong>Transaction ref:</strong> {o.externalPaymentId}
                    </p>
                  )}
                  {o.note && (
                    <p className="rounded-md bg-white/80 p-2 text-slate-600">
                      <strong>Student note:</strong> {o.note}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Submitted {new Date(o.createdAt).toLocaleString()}
                    {o.paidAt && ` · Paid ${new Date(o.paidAt).toLocaleString()}`}
                  </p>
                  {o.status === "AwaitingApproval" && o.gateway === "Manual" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" disabled={acting === o.id} onClick={() => approve(o.id)}>
                        <Check className="h-4 w-4" /> Approve &amp; enroll
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acting === o.id}
                        onClick={() => reject(o.id)}
                      >
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Record offline payment &amp; enroll</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-slate-600">
              For students who paid at the desk or by bank — records payment, marks it paid, and
              enrolls immediately (no student submission required).
            </p>
            <form onSubmit={(ev) => void handleRecordManual(ev)} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  Student
                  <select
                    value={recordUserId}
                    onChange={(ev) => setRecordUserId(ev.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select student…</option>
                    {students.map((s) => (
                      <option key={s.userId} value={s.userId}>
                        {s.fullName} ({s.email})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-700">
                  {bundleLabel.charAt(0).toUpperCase() + bundleLabel.slice(1)}
                  <select
                    value={recordBundleId}
                    onChange={(ev) => setRecordBundleId(ev.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select {bundleLabel}…</option>
                    {bundles.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} {b.price > 0 ? `(PKR ${b.price.toLocaleString()})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm text-slate-700">
                Transaction reference
                <input
                  type="text"
                  value={recordTxnRef}
                  onChange={(ev) => setRecordTxnRef(ev.target.value)}
                  required
                  placeholder="Bank txn ID, receipt number, etc."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-700">
                Note (optional)
                <input
                  type="text"
                  value={recordNote}
                  onChange={(ev) => setRecordNote(ev.target.value)}
                  placeholder="e.g. Paid at front desk"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <Button type="submit" disabled={recording}>
                {recording ? "Recording…" : "Record payment & enroll"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
