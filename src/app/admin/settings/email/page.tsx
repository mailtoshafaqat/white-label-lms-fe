"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { AdminSettingsNav } from "@/components/admin-settings-nav";
import { adminApi, type EmailSettingsDto } from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";

export default function EmailSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);

  const [form, setForm] = useState<EmailSettingsDto>({
    enabled: false,
    fromEmail: "",
    fromName: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    hasPassword: false,
    useSsl: true,
  });
  const [password, setPassword] = useState("");

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
      .getEmailSettings()
      .then((s) => {
        setForm(s);
        setHasPassword(s.hasPassword);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  function update<K extends keyof EmailSettingsDto>(key: K, value: EmailSettingsDto[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const result = await adminApi.saveEmailSettings({
        enabled: form.enabled,
        fromEmail: form.fromEmail,
        fromName: form.fromName,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpUser: form.smtpUser,
        smtpPassword: password ? password : null,
        useSsl: form.useSsl,
      });
      setForm(result);
      setHasPassword(result.hasPassword);
      setPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]";
  const labelCls = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <AdminSettingsNav />
        <h1 className="text-2xl font-bold text-slate-900">Email settings</h1>
        <p className="mt-1 text-slate-600">
          Configure the SMTP account this institute sends from (welcome emails, credentials). Each
          tenant uses its own sender — this is part of your white-label setup. Until enabled, emails
          are written to a local dev outbox instead of being sent.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">SMTP configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSave}>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => update("enabled", e.target.checked)}
                  />
                  Enable email sending
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>From name</label>
                    <input
                      value={form.fromName}
                      onChange={(e) => update("fromName", e.target.value)}
                      placeholder="Your Academy"
                      className={field}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>From email</label>
                    <input
                      type="email"
                      value={form.fromEmail}
                      onChange={(e) => update("fromEmail", e.target.value)}
                      placeholder="no-reply@youracademy.com"
                      className={field}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>SMTP host</label>
                    <input
                      value={form.smtpHost}
                      onChange={(e) => update("smtpHost", e.target.value)}
                      placeholder="smtp.sendgrid.net"
                      className={field}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Port</label>
                    <input
                      type="number"
                      value={form.smtpPort}
                      onChange={(e) => update("smtpPort", Number(e.target.value))}
                      className={field}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>SMTP username</label>
                    <input
                      value={form.smtpUser}
                      onChange={(e) => update("smtpUser", e.target.value)}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      SMTP password {hasPassword && <span className="text-xs text-slate-400">(saved)</span>}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={hasPassword ? "Leave blank to keep current" : ""}
                      className={field}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.useSsl}
                    onChange={(e) => update("useSsl", e.target.checked)}
                  />
                  Use TLS/SSL (STARTTLS)
                </label>

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save settings"}
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
