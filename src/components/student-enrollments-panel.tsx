"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminApi,
  type BundleDto,
  type EnrollmentDto,
  type StudentListItemDto,
} from "@/lib/api";

function toDateInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function StudentEnrollmentsPanel({
  student,
  bundles,
  bundleLabel = "course",
  onClose,
}: {
  student: StudentListItemDto;
  bundles: BundleDto[];
  bundleLabel?: string;
  onClose: () => void;
}) {
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollBundleId, setEnrollBundleId] = useState("");
  const [enrollExpiry, setEnrollExpiry] = useState("");

  function reload() {
    return adminApi.listStudentEnrollments(student.userId).then(setEnrollments);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [student.userId]);

  const enrolledBundleIds = new Set(enrollments.map((e) => e.bundleId));
  const availableBundles = bundles.filter((b) => !enrolledBundleIds.has(b.id));

  async function handleExtend(bundleId: string) {
    const date = newExpiry[bundleId];
    if (!date) return;
    setBusy(true);
    setError(null);
    try {
      const expiresAt = new Date(`${date}T23:59:59`).toISOString();
      await adminApi.extendStudentEnrollment(student.userId, bundleId, expiresAt);
      setExtendingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not extend enrollment");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollBundleId) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.enrollStudent(student.userId, enrollBundleId);
      if (enrollExpiry) {
        const expiresAt = new Date(`${enrollExpiry}T23:59:59`).toISOString();
        await adminApi.extendStudentEnrollment(student.userId, enrollBundleId, expiresAt);
      }
      setShowEnrollForm(false);
      setEnrollBundleId("");
      setEnrollExpiry("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enroll student");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">
          Enrollments for {student.fullName}
        </p>
        <button type="button" className="text-xs text-slate-500 hover:text-slate-800" onClick={onClose}>
          Close
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3">
        {!showEnrollForm ? (
          <button
            type="button"
            disabled={availableBundles.length === 0 || busy}
            className="inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:underline disabled:text-slate-400 disabled:no-underline"
            onClick={() => setShowEnrollForm(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Enroll in {bundleLabel}
          </button>
        ) : (
          <form onSubmit={(ev) => void handleEnroll(ev)} className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium text-slate-700">Enroll in {bundleLabel}</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-600">
                {bundleLabel.charAt(0).toUpperCase() + bundleLabel.slice(1)}
                <select
                  value={enrollBundleId}
                  onChange={(ev) => setEnrollBundleId(ev.target.value)}
                  required
                  className="mt-1 block w-full min-w-[180px] rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="">Select…</option>
                  {availableBundles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Expiry (optional)
                <input
                  type="date"
                  value={enrollExpiry}
                  onChange={(ev) => setEnrollExpiry(ev.target.value)}
                  className="mt-1 block rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <Button type="submit" size="sm" disabled={busy || !enrollBundleId}>
                Enroll
              </Button>
              <button
                type="button"
                className="text-xs text-slate-500"
                onClick={() => {
                  setShowEnrollForm(false);
                  setEnrollBundleId("");
                  setEnrollExpiry("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      ) : enrollments.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No enrollments yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {enrollments.map((e) => (
            <li key={e.bundleId} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">{e.bundleTitle}</p>
                  <p className="text-xs text-slate-500">
                    Enrolled {new Date(e.enrolledAt).toLocaleDateString()} ·{" "}
                    <span className={e.isActive ? "text-emerald-700" : "text-amber-700"}>
                      {e.isActive ? "Active" : "Expired"} until{" "}
                      {new Date(e.expiresAt).toLocaleDateString()}
                    </span>
                  </p>
                </div>
                {extendingId === e.bundleId ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newExpiry[e.bundleId] ?? toDateInput(e.expiresAt)}
                      onChange={(ev) =>
                        setNewExpiry((prev) => ({ ...prev, [e.bundleId]: ev.target.value }))
                      }
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleExtend(e.bundleId)}
                    >
                      Save
                    </Button>
                    <button
                      type="button"
                      className="text-xs text-slate-500"
                      onClick={() => setExtendingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
                    onClick={() => {
                      setExtendingId(e.bundleId);
                      setNewExpiry((prev) => ({
                        ...prev,
                        [e.bundleId]: toDateInput(e.expiresAt),
                      }));
                    }}
                  >
                    <CalendarClock className="h-3.5 w-3.5" /> Extend access
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
