"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Copy,
  Check,
  KeyRound,
  Ban,
  UserCheck,
  ChevronDown,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AdminListToolbar } from "@/components/admin-list-toolbar";
import { AdminPagination } from "@/components/admin-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import {
  adminApi,
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

  const fetchTeachers = useCallback(
    (params: Parameters<typeof adminApi.listTeachers>[0]) => adminApi.listTeachers(params),
    []
  );

  const list = usePagedList({
    fetch: fetchTeachers,
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
      const [allSubjects, maps] = await Promise.all([
        adminApi.listAssignableSubjects(),
        adminApi.listSubjectTeachers(),
      ]);
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

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.subjectId, s])),
    [subjects]
  );

  const byBundle = useMemo(
    () =>
      subjects.reduce<Record<string, AssignedSubjectDto[]>>((acc, s) => {
        (acc[s.bundleTitle] ??= []).push(s);
        return acc;
      }, {}),
    [subjects]
  );

  const emptyMessage =
    list.debouncedSearch.trim().length > 0
      ? "No teachers match your search."
      : "No teachers yet. Create one above.";

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-6 py-8">
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

        <div className="mt-4 space-y-3">
          {list.loading || metaLoading ? (
            <p className="text-slate-500">Loading…</p>
          ) : list.data.length === 0 ? (
            <p className="text-slate-500">{emptyMessage}</p>
          ) : (
            list.data.map((t) => (
              <TeacherCard
                key={t.userId}
                teacher={t}
                byBundle={byBundle}
                subjectById={subjectById}
                assignedIds={assignments[t.userId] ?? []}
                saving={savingId === t.userId}
                onToggleSubject={(subjectId) => toggleSubject(t.userId, subjectId)}
                onSave={() => saveAssignments(t.userId)}
                onResetPassword={() => setResetConfirm(t)}
                onToggleStatus={() => setStatusConfirm(t)}
              />
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

function teacherInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type TeacherCardProps = {
  teacher: TeacherListItemDto;
  byBundle: Record<string, AssignedSubjectDto[]>;
  subjectById: Map<string, AssignedSubjectDto>;
  assignedIds: string[];
  saving: boolean;
  onToggleSubject: (subjectId: string) => void;
  onSave: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
};

function TeacherCard({
  teacher,
  byBundle,
  subjectById,
  assignedIds,
  saving,
  onToggleSubject,
  onSave,
  onResetPassword,
  onToggleStatus,
}: TeacherCardProps) {
  const [editing, setEditing] = useState(false);
  const assignedSubjects = assignedIds
    .map((id) => subjectById.get(id))
    .filter((s): s is AssignedSubjectDto => Boolean(s));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600"
            aria-hidden
          >
            {teacherInitials(teacher.fullName) || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">{teacher.fullName}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  teacher.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {teacher.isActive ? "Active" : "Blocked"}
              </span>
            </div>
            <p className="truncate text-sm text-slate-500">{teacher.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onResetPassword}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Reset password
          </button>
          <button
            type="button"
            onClick={onToggleStatus}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
              teacher.isActive
                ? "border-red-200 text-red-700 hover:bg-red-50"
                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            {teacher.isActive ? (
              <>
                <Ban className="h-3.5 w-3.5" />
                Block
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                Activate
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {assignedSubjects.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {assignedSubjects.map((s) => (
                  <span
                    key={s.subjectId}
                    className="inline-flex items-center rounded-full border border-[var(--brand)]/20 bg-white px-2.5 py-0.5 text-xs font-medium text-[var(--brand)]"
                    title={s.bundleTitle}
                  >
                    {s.subjectTitle}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No subjects assigned yet</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {editing ? (
              <>
                <X className="h-3.5 w-3.5" />
                Close
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" />
                Edit subjects
              </>
            )}
          </button>
        </div>
      </div>

      {editing && (
        <CardContent className="border-t border-slate-100 pt-4">
          <div className="space-y-2">
            {Object.entries(byBundle).map(([bundleTitle, subs]) => {
              const selectedInBundle = subs.filter((s) => assignedIds.includes(s.subjectId)).length;
              return (
                <details
                  key={bundleTitle}
                  className="group rounded-lg border border-slate-200 bg-white"
                  open={selectedInBundle > 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 truncate">{bundleTitle}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                      {selectedInBundle > 0 ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-[var(--brand)]">
                          {selectedInBundle} selected
                        </span>
                      ) : (
                        <span>{subs.length} subjects</span>
                      )}
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-3">
                    {subs.map((s) => {
                      const checked = assignedIds.includes(s.subjectId);
                      return (
                        <label
                          key={s.subjectId}
                          className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${
                            checked
                              ? "border-[var(--brand)] bg-blue-50 text-[var(--brand)]"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => onToggleSubject(s.subjectId)}
                          />
                          {s.subjectTitle}
                        </label>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" size="sm" disabled={saving} onClick={onSave}>
              {saving ? "Saving…" : "Save assignments"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function AdminTeachersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-slate-500">Loading…</div>}>
      <AdminTeachersContent />
    </Suspense>
  );
}
