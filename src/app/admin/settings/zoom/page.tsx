"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { AdminSettingsNav } from "@/components/admin-settings-nav";
import { adminApi, type ZoomSettingsDto } from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";

export default function ZoomSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSecret, setHasSecret] = useState(false);

  const [form, setForm] = useState<ZoomSettingsDto>({
    enabled: false,
    accountId: "",
    clientId: "",
    hasClientSecret: false,
  });
  const [secret, setSecret] = useState("");

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
      .getZoomSettings()
      .then((s) => {
        setForm(s);
        setHasSecret(s.hasClientSecret);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  function update<K extends keyof ZoomSettingsDto>(key: K, value: ZoomSettingsDto[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const result = await adminApi.saveZoomSettings({
        enabled: form.enabled,
        accountId: form.accountId,
        clientId: form.clientId,
        clientSecret: secret ? secret : null,
      });
      setForm(result);
      setHasSecret(result.hasClientSecret);
      setSecret("");
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
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Video className="h-6 w-6 text-[var(--brand)]" /> Zoom integration
        </h1>
        <p className="mt-1 text-slate-600">
          Connect this institute&apos;s Zoom account so live classes create real meetings
          automatically. Uses Zoom <strong>Server-to-Server OAuth</strong> — create an app in the Zoom
          Marketplace and paste its Account ID, Client ID and Client Secret. Until enabled, you can
          still schedule classes by pasting a join link manually.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Server-to-Server OAuth credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSave}>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => update("enabled", e.target.checked)}
                  />
                  Enable Zoom auto-create
                </label>

                <div>
                  <label className={labelCls}>Account ID</label>
                  <input
                    value={form.accountId}
                    onChange={(e) => update("accountId", e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={labelCls}>Client ID</label>
                  <input
                    value={form.clientId}
                    onChange={(e) => update("clientId", e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Client Secret {hasSecret && <span className="text-xs text-slate-400">(saved)</span>}
                  </label>
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder={hasSecret ? "Leave blank to keep current" : ""}
                    className={field}
                  />
                </div>

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
