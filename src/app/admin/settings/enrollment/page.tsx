"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { AdminSettingsNav } from "@/components/admin-settings-nav";
import { adminApi, type EnrollmentSettingsDto } from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";

export default function EnrollmentSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EnrollmentSettingsDto>({ allowStudentSelfEnroll: false });

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
    adminApi
      .getEnrollmentSettings()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const result = await adminApi.saveEnrollmentSettings({
        allowStudentSelfEnroll: form.allowStudentSelfEnroll,
      });
      setForm(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <AdminSettingsNav />
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <UserPlus className="h-6 w-6 text-[var(--brand)]" /> Enrollment
        </h1>
        <p className="mt-1 text-slate-600">
          Control whether students can enroll themselves without admin provisioning. When disabled,
          only institute admins can create student accounts.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Self signup</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave}>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.allowStudentSelfEnroll}
                    onChange={(e) =>
                      setForm({ allowStudentSelfEnroll: e.target.checked })
                    }
                  />
                  <span>
                    <strong>Allow student self-enrollment</strong>
                    <span className="mt-1 block text-slate-500">
                      When enabled, students may sign up and enroll on their own (subject to payment
                      and enrollment mode settings). Useful for open courses; keep off for
                      invite-only institutes.
                    </span>
                  </span>
                </label>

                <div className="mt-6 flex items-center gap-3">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                  </Button>
                  {saved && (
                    <span className="flex items-center gap-1 text-sm text-emerald-700">
                      <Check className="h-4 w-4" /> Saved
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
