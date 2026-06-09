"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import {
  coursesApi,
  adminApi,
  type BundleDto,
  type StudentListItemDto,
  type CreatedStudentDto,
} from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";

export default function AdminStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentListItemDto[]>([]);
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bundleId, setBundleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedStudentDto | null>(null);
  const [copied, setCopied] = useState(false);

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
    Promise.all([adminApi.listStudents(), coursesApi.bundles()])
      .then(([s, b]) => {
        setStudents(s);
        setBundles(b);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setSubmitting(true);
    try {
      const result = await adminApi.createStudent({
        fullName,
        email,
        bundleId: bundleId || null,
      });
      setCreated(result);
      setStudents((prev) => [
        {
          userId: result.userId,
          fullName: result.fullName,
          email: result.email,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setFullName("");
      setEmail("");
      setBundleId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create student");
    } finally {
      setSubmitting(false);
    }
  }

  function copyCreds() {
    if (!created) return;
    navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="mt-1 text-slate-600">
          Create accounts and enroll students into a course. Credentials are emailed automatically.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

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
                  <div>Email: <span className="font-mono">{created.email}</span></div>
                  <div>Temporary password: <span className="font-mono">{created.tempPassword}</span></div>
                  {created.bundleTitle && (
                    <div>
                      Enrolled in <strong>{created.bundleTitle}</strong>
                      {created.expiresAt && ` until ${new Date(created.expiresAt).toLocaleDateString()}`}
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
                      onClick={copyCreds}
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

        <h2 className="mt-8 text-lg font-semibold text-slate-900">
          All students {!loading && `(${students.length})`}
        </h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {loading ? (
            <p className="p-4 text-slate-500">Loading…</p>
          ) : students.length === 0 ? (
            <p className="p-4 text-slate-500">No students yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.userId} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-800">{s.fullName}</td>
                    <td className="px-4 py-2 text-slate-600">{s.email}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
