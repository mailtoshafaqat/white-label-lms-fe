"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi, type EnrollmentDto, type StudentListItemDto } from "@/lib/api";

function toDateInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function StudentEnrollmentsPanel({
  student,
  onClose,
}: {
  student: StudentListItemDto;
  onClose: () => void;
}) {
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function reload() {
    return adminApi.listStudentEnrollments(student.userId).then(setEnrollments);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [student.userId]);

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
