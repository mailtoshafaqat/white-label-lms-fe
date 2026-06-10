"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check, KeyRound, Ban, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AdminListToolbar } from "@/components/admin-list-toolbar";
import { AdminPagination } from "@/components/admin-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import {
  adminApi,
  coursesApi,
  type AssignedSubjectDto,
  type CreatedTeacherDto,
  type ResetTeacherPasswordDto,
  type TeacherListItemDto,
} from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";

function AdminTeachersContent() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<AssignedSubjectDto[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedTeacherDto | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<TeacherListItemDto | null>(null);
  const [resetConfirm, setResetConfirm] = useState<TeacherListItemDto | null>(null);
  const [resetResult, setResetResult] = useState<ResetTeacherPasswordDto | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const list = usePagedList({
    fetch: (params) => adminApi.listTeachers(params),
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

    async function loadMeta() {
      const [bundles, maps] = await Promise.all([
        coursesApi.bundles(),
        adminApi.listSubjectTeachers(),
      ]);
      const allSubjects: AssignedSubjectDto[] = [];
      for (const b of bundles) {
        const detail = await coursesApi.bundle(b.id);
        for (const s of detail.subjects) {
          allSubjects.push({
            subjectId: s.id,
            subjectTitle: s.title,
            bundleId: b.id,
            bundleTitle: b.title,
          });
        }
      }
      setSubjects(allSubjects);
      const map: Record<string, string[]> = {};
      for (const row of maps) map[row.userId] = row.subjectIds;
      setAssignments(map);
    }

    loadMeta()
      .catch((e) => setMetaError(e instanceof Error ? e.message : "Failed to load subjects"))
      .finally(() => setMetaLoading(false));
  }, [router]);

  useEffect(() => {
    if (list.data.length === 0) return;
    setAssignments((prev) => {
      const next = { ...prev };
      for (const t of list.data) {
        if (!next[t.userId]) next[t.userId] = [];
      }
      return next;
    });
  }, [list.data]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreated(null);
    setSubmitting(true);
    try {
      const result = await adminApi.createTeacher({ fullName, email });
      setCreated(result);
      setAssignments((prev) => ({ ...prev, [result.userId]: [] }));
      setFullName("");
      setEmail("");
      await list.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create teacher");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleSubject(teacherId: string, subjectId: string) {
    setAssignments((prev) => {
      const current = prev[teacherId] ?? [];
      const next = current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId];
      return { ...prev, [teacherId]: next };
    });
  }

  async function saveAssignments(teacherId: string) {
    setSavingId(teacherId);
    setFormError(null);
    try {
      await adminApi.setTeacherSubjects(teacherId, assignments[teacherId] ?? []);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save assignments");
    } finally {
      setSavingId(null);
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
      await adminApi.setTeacherStatus(statusConfirm.userId, !statusConfirm.isActive);
      setStatusConfirm(null);
      await list.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not update teacher status");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmResetPassword() {
    if (!resetConfirm) return;
    setActionBusy(true);
    setFormError(null);
    try {
      const result = await adminApi.resetTeacherPassword(resetConfirm.userId);
      setResetResult(result);
      setResetConfirm(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setActionBusy(false);
    }
  }

  const byBundle = subjects.reduce<Record<string, AssignedSubjectDto[]>>((acc, s) => {
    (acc[s.bundleTitle] ??= []).push(s);
    return acc;
  }, {});

  const emptyMessage =
    list.debouncedSearch.trim().length > 0
      ? "No teachers match your search."
      : "No teachers yet. Create one above.";

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Teachers</h1>
        <p className="mt-1 text-slate-600">
          Create teacher accounts and assign one or more subjects (e.g. Physics + Math for Sajid).
        </p>

        {(formError || metaError || list.error) && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {formError ?? metaError ?? list.error}
          </p>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Add teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="h-9 rounded-md border border-slate-300 px-2 text-sm"
              />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-9 rounded-md border border-slate-300 px-2 text-sm"
              />
              <Button type="submit" disabled={submitting} className="sm:col-span-2 w-fit">
                <Plus className="h-4 w-4" /> {submitting ? "Creating…" : "Create teacher"}
              </Button>
            </form>
            {created && (
              <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
                <p>
                  <strong>{created.fullName}</strong> — temp password:{" "}
                  <code className="rounded bg-white px-1">{created.tempPassword}</code>
                  {created.emailSent ? " (email sent)" : " (email not sent — share manually)"}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    copyCreds(`Email: ${created.email}\nPassword: ${created.tempPassword}`)
                  }
                  className="mt-2 flex items-center gap-1 text-emerald-800 hover:underline"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy credentials
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8">
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
                ? "New credentials emailed to the teacher."
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

        <div className="mt-4 space-y-4">
          {list.loading || metaLoading ? (
            <p className="text-slate-500">Loading…</p>
          ) : list.data.length === 0 ? (
            <p className="text-slate-500">{emptyMessage}</p>
          ) : (
            list.data.map((t) => (
              <Card key={t.userId}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="text-base">
                      {t.fullName}{" "}
                      <span className="text-sm font-normal text-slate-500">{t.email}</span>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          t.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {t.isActive ? "Active" : "Blocked"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setResetConfirm(t)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        <KeyRound className="h-3 w-3" /> Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusConfirm(t)}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${
                          t.isActive
                            ? "border-red-200 text-red-700 hover:bg-red-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {t.isActive ? (
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
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-sm font-medium text-slate-700">Assigned subjects</p>
                  <div className="space-y-3">
                    {Object.entries(byBundle).map(([bundleTitle, subs]) => (
                      <div key={bundleTitle}>
                        <p className="text-xs font-semibold uppercase text-slate-500">{bundleTitle}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {subs.map((s) => {
                            const checked = (assignments[t.userId] ?? []).includes(s.subjectId);
                            return (
                              <label
                                key={s.subjectId}
                                className={`cursor-pointer rounded-md border px-2 py-1 text-sm ${
                                  checked
                                    ? "border-[var(--brand)] bg-blue-50 text-[var(--brand)]"
                                    : "border-slate-200 text-slate-600"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="mr-1"
                                  checked={checked}
                                  onChange={() => toggleSubject(t.userId, s.subjectId)}
                                />
                                {s.subjectTitle}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-4"
                    disabled={savingId === t.userId}
                    onClick={() => saveAssignments(t.userId)}
                  >
                    {savingId === t.userId ? "Saving…" : "Save assignments"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
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
        title={statusConfirm?.isActive ? "Block teacher?" : "Activate teacher?"}
        description={
          statusConfirm
            ? statusConfirm.isActive
              ? `${statusConfirm.fullName} will not be able to sign in until reactivated.`
              : `${statusConfirm.fullName} will be able to sign in again.`
            : ""
        }
        confirmLabel={statusConfirm?.isActive ? "Block teacher" : "Activate teacher"}
        loading={actionBusy}
        onConfirm={() => void confirmToggleStatus()}
        onCancel={() => {
          if (!actionBusy) setStatusConfirm(null);
        }}
      />

      <ConfirmDialog
        open={resetConfirm !== null}
        title="Reset teacher password?"
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

export default function AdminTeachersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-slate-500">Loading…</div>}>
      <AdminTeachersContent />
    </Suspense>
  );
}
