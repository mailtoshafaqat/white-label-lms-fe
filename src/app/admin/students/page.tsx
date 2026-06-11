"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mail, Copy, Check, KeyRound, Ban, UserCheck, Users, CalendarClock } from "lucide-react";
import { StudentGuardiansPanel } from "@/components/student-guardians-panel";
import { StudentEnrollmentsPanel } from "@/components/student-enrollments-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AdminListToolbar } from "@/components/admin-list-toolbar";
import { AdminPagination } from "@/components/admin-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import {
  coursesApi,
  adminApi,
  type BundleDto,
  type CreatedStudentDto,
  type ResetStudentPasswordDto,
  type StudentListItemDto,
} from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";

function AdminStudentsContent() {
  const router = useRouter();
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bundleId, setBundleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedStudentDto | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<StudentListItemDto | null>(null);
  const [resetConfirm, setResetConfirm] = useState<StudentListItemDto | null>(null);
  const [resetResult, setResetResult] = useState<ResetStudentPasswordDto | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [guardianStudent, setGuardianStudent] = useState<StudentListItemDto | null>(null);
  const [enrollmentStudent, setEnrollmentStudent] = useState<StudentListItemDto | null>(null);

  const list = usePagedList({
    fetch: (params) => adminApi.listStudents(params),
    syncUrl: true,
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
    coursesApi
      .bundles()
      .then(setBundles)
      .catch(() => setBundles([]))
      .finally(() => setBundlesLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreated(null);
    setSubmitting(true);
    try {
      const result = await adminApi.createStudent({
        fullName,
        email,
        bundleId: bundleId || null,
      });
      setCreated(result);
      setFullName("");
      setEmail("");
      setBundleId("");
      await list.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create student");
    } finally {
      setSubmitting(false);
    }
  }

  function copyCreds(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function confirmToggleStatus() {
    if (!statusConfirm) return;
    setActionBusy(true);
    setFormError(null);
    try {
      await adminApi.setStudentStatus(statusConfirm.userId, !statusConfirm.isActive);
      setStatusConfirm(null);
      await list.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not update student status");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmResetPassword() {
    if (!resetConfirm) return;
    setActionBusy(true);
    setFormError(null);
    try {
      const result = await adminApi.resetStudentPassword(resetConfirm.userId);
      setResetResult(result);
      setResetConfirm(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setActionBusy(false);
    }
  }

  const emptyMessage =
    list.debouncedSearch.trim().length > 0
      ? "No students match your search."
      : "No students yet. Create one above.";

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="mt-1 text-slate-600">
          Create accounts and enroll students into a course. Credentials are emailed automatically.
        </p>

        {formError && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</p>
        )}
        {list.error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{list.error}</p>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Add a student</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Enroll in course (optional)
                </label>
                <select
                  value={bundleId}
                  onChange={(e) => setBundleId(e.target.value)}
                  disabled={bundlesLoading}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                >
                  <option value="">No course</option>
                  {bundles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Access duration follows the course&apos;s own validity period.
                </p>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting}>
                  <Plus className="h-4 w-4" /> {submitting ? "Creating…" : "Create student"}
                </Button>
              </div>
            </form>

            {created && (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium text-emerald-800">
                  <Check className="h-4 w-4" /> {created.fullName} created
                </div>
                <div className="mt-2 grid gap-1 text-slate-700">
                  <div>
                    Email: <span className="font-mono">{created.email}</span>
                  </div>
                  <div>
                    Temporary password:{" "}
                    <span className="font-mono">{created.tempPassword}</span>
                  </div>
                  {created.bundleTitle && (
                    <div>
                      Enrolled in <strong>{created.bundleTitle}</strong>
                      {created.expiresAt &&
                        ` until ${new Date(created.expiresAt).toLocaleDateString()}`}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span className={created.emailSent ? "text-emerald-700" : "text-amber-700"}>
                      <Mail className="mr-1 inline h-3.5 w-3.5" />
                      {created.emailSent
                        ? "Credentials emailed"
                        : "Email not sent (configure SMTP) — share credentials manually"}
                    </span>
                    <button
                      onClick={() =>
                        copyCreds(`Email: ${created.email}\nPassword: ${created.tempPassword}`)
                      }
                      type="button"
                      className="ml-auto flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {resetResult && (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-900">
              Password reset for {resetResult.fullName}
            </p>
            <p className="mt-2 text-slate-700">
              Temp password: <span className="font-mono">{resetResult.tempPassword}</span>
            </p>
            <p className="mt-1 text-slate-600">
              {resetResult.emailSent
                ? "New credentials emailed to the student."
                : "Email not sent — share the password manually (configure SMTP)."}
            </p>
            <button
              type="button"
              onClick={() =>
                copyCreds(`Email: ${resetResult.email}\nPassword: ${resetResult.tempPassword}`)
              }
              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy credentials"}
            </button>
          </div>
        )}

        <h2 className="mt-8 text-lg font-semibold text-slate-900">All students</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-3">
            <AdminListToolbar
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              pageSize={list.pageSize}
              onPageSizeChange={list.setPageSize}
              page={list.page}
              total={list.total}
              searchPlaceholder="Search by name or email…"
            />
          </div>
          {list.loading ? (
            <p className="p-4 text-slate-500">Loading…</p>
          ) : list.data.length === 0 ? (
            <p className="p-4 text-slate-500">{emptyMessage}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((s) => (
                  <Fragment key={s.userId}>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-800">{s.fullName}</td>
                    <td className="px-4 py-2 text-slate-600">{s.email}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          s.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s.isActive ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEnrollmentStudent(null);
                            setGuardianStudent((prev) =>
                              prev?.userId === s.userId ? null : s
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          <Users className="h-3 w-3" /> Guardians
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGuardianStudent(null);
                            setEnrollmentStudent((prev) =>
                              prev?.userId === s.userId ? null : s
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          <CalendarClock className="h-3 w-3" /> Enrollments
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetConfirm(s)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          <KeyRound className="h-3 w-3" /> Reset password
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusConfirm(s)}
                          className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${
                            s.isActive
                              ? "border-red-200 text-red-700 hover:bg-red-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {s.isActive ? (
                            <>
                              <Ban className="h-3 w-3" /> Block
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3" /> Activate
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {guardianStudent?.userId === s.userId && (
                    <tr key={`${s.userId}-guardians`}>
                      <td colSpan={5} className="p-0">
                        <StudentGuardiansPanel
                          student={s}
                          onClose={() => setGuardianStudent(null)}
                        />
                      </td>
                    </tr>
                  )}
                  {enrollmentStudent?.userId === s.userId && (
                    <tr key={`${s.userId}-enrollments`}>
                      <td colSpan={5} className="p-0">
                        <StudentEnrollmentsPanel
                          student={s}
                          onClose={() => setEnrollmentStudent(null)}
                        />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
          <AdminPagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            onPageChange={list.setPage}
          />
        </div>
      </main>

      <ConfirmDialog
        open={statusConfirm !== null}
        title={statusConfirm?.isActive ? "Block student?" : "Activate student?"}
        description={
          statusConfirm
            ? statusConfirm.isActive
              ? `${statusConfirm.fullName} will not be able to sign in until reactivated.`
              : `${statusConfirm.fullName} will be able to sign in again.`
            : ""
        }
        confirmLabel={statusConfirm?.isActive ? "Block student" : "Activate student"}
        loading={actionBusy}
        onConfirm={() => void confirmToggleStatus()}
        onCancel={() => {
          if (!actionBusy) setStatusConfirm(null);
        }}
      />

      <ConfirmDialog
        open={resetConfirm !== null}
        title="Reset student password?"
        description={
          resetConfirm
            ? `Generate a new temporary password for ${resetConfirm.fullName}. They must change it on next login.`
            : ""
        }
        confirmLabel="Reset password"
        loading={actionBusy}
        onConfirm={() => void confirmResetPassword()}
        onCancel={() => {
          if (!actionBusy) setResetConfirm(null);
        }}
      />
    </div>
  );
}

export default function AdminStudentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-slate-500">Loading…</div>}>
      <AdminStudentsContent />
    </Suspense>
  );
}
