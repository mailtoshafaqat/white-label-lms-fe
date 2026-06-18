"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { AdminSettingsNav } from "@/components/admin-settings-nav";
import {
  adminApi,
  ENROLLMENT_MODE_FLAGS,
  type PaymentSettingsDto,
} from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";

function hasMode(flags: number, bit: number) {
  return (flags & bit) === bit;
}

function toggleMode(flags: number, bit: number, on: boolean) {
  return on ? flags | bit : flags & ~bit;
}

export default function PaymentSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PaymentSettingsDto | null>(null);
  const [stripeSecret, setStripeSecret] = useState("");
  const [stripeWebhook, setStripeWebhook] = useState("");
  const [jazzPassword, setJazzPassword] = useState("");
  const [jazzHash, setJazzHash] = useState("");
  const [easypaisaHash, setEasypaisaHash] = useState("");
  const [easypaisaCreds, setEasypaisaCreds] = useState("");

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
      .getPaymentSettings()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const result = await adminApi.savePaymentSettings({
        enrollmentModes: form.enrollmentModes,
        manualPaymentInstructions: form.manualPaymentInstructions,
        manualEnabled: form.manual.enabled,
        stripeEnabled: form.stripe.enabled,
        stripePublishableKey: form.stripe.publishableKey,
        stripeSecretKey: stripeSecret ? stripeSecret : null,
        stripeWebhookSecret: stripeWebhook ? stripeWebhook : null,
        jazzCashEnabled: form.jazzCash.enabled,
        jazzCashMerchantId: form.jazzCash.merchantId,
        jazzCashPassword: jazzPassword ? jazzPassword : null,
        jazzCashHashKey: jazzHash ? jazzHash : null,
        jazzCashReturnUrl: form.jazzCash.returnUrl,
        easypaisaEnabled: form.easypaisa.enabled,
        easypaisaStoreId: form.easypaisa.storeId,
        easypaisaHashKey: easypaisaHash ? easypaisaHash : null,
        easypaisaCredentials: easypaisaCreds ? easypaisaCreds : null,
      });
      setForm(result);
      setStripeSecret("");
      setStripeWebhook("");
      setJazzPassword("");
      setJazzHash("");
      setEasypaisaHash("");
      setEasypaisaCreds("");
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

  if (!form && !loading) return null;

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <AdminSettingsNav />
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <CreditCard className="h-6 w-6 text-[var(--brand)]" /> Payments
        </h1>
        <p className="mt-1 text-slate-600">
          Configure how students pay for paid courses. SuperAdmin must allow gateways for your institute
          first. Secrets are stored per tenant; leave blank to keep existing values.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enrollment modes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasMode(form!.enrollmentModes, ENROLLMENT_MODE_FLAGS.SelfEnrollFree)}
                    onChange={(e) =>
                      setForm({
                        ...form!,
                        enrollmentModes: toggleMode(
                          form!.enrollmentModes,
                          ENROLLMENT_MODE_FLAGS.SelfEnrollFree,
                          e.target.checked
                        ),
                      })
                    }
                  />
                  Free self-enroll (price = 0)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasMode(form!.enrollmentModes, ENROLLMENT_MODE_FLAGS.ManualPayment)}
                    onChange={(e) =>
                      setForm({
                        ...form!,
                        enrollmentModes: toggleMode(
                          form!.enrollmentModes,
                          ENROLLMENT_MODE_FLAGS.ManualPayment,
                          e.target.checked
                        ),
                      })
                    }
                  />
                  Manual payment (bank transfer, admin approval)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasMode(form!.enrollmentModes, ENROLLMENT_MODE_FLAGS.OnlineCheckout)}
                    onChange={(e) =>
                      setForm({
                        ...form!,
                        enrollmentModes: toggleMode(
                          form!.enrollmentModes,
                          ENROLLMENT_MODE_FLAGS.OnlineCheckout,
                          e.target.checked
                        ),
                      })
                    }
                  />
                  Online checkout (Stripe / JazzCash)
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manual payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form!.manual.enabled}
                    onChange={(e) =>
                      setForm({ ...form!, manual: { enabled: e.target.checked } })
                    }
                  />
                  Enable manual payments
                </label>
                <div>
                  <label className={labelCls}>Instructions for students</label>
                  <textarea
                    rows={4}
                    className={field}
                    value={form!.manualPaymentInstructions ?? ""}
                    onChange={(e) =>
                      setForm({ ...form!, manualPaymentInstructions: e.target.value })
                    }
                    placeholder="Bank name, account title, account number, etc."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stripe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form!.stripe.enabled}
                    onChange={(e) =>
                      setForm({
                        ...form!,
                        stripe: { ...form!.stripe, enabled: e.target.checked },
                      })
                    }
                  />
                  Enable Stripe checkout
                </label>
                <div>
                  <label className={labelCls}>Publishable key</label>
                  <input
                    className={field}
                    value={form!.stripe.publishableKey}
                    onChange={(e) =>
                      setForm({
                        ...form!,
                        stripe: { ...form!.stripe, publishableKey: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Secret key{" "}
                    {form!.stripe.hasSecretKey && (
                      <span className="text-xs text-slate-400">(saved)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    className={field}
                    value={stripeSecret}
                    onChange={(e) => setStripeSecret(e.target.value)}
                    placeholder={form!.stripe.hasSecretKey ? "Leave blank to keep current" : ""}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Webhook secret{" "}
                    {form!.stripe.hasWebhookSecret && (
                      <span className="text-xs text-slate-400">(saved)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    className={field}
                    value={stripeWebhook}
                    onChange={(e) => setStripeWebhook(e.target.value)}
                    placeholder={form!.stripe.hasWebhookSecret ? "Leave blank to keep current" : ""}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">JazzCash (sandbox)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form!.jazzCash.enabled}
                    onChange={(e) =>
                      setForm({
                        ...form!,
                        jazzCash: { ...form!.jazzCash, enabled: e.target.checked },
                      })
                    }
                  />
                  Enable JazzCash
                </label>
                <div>
                  <label className={labelCls}>Merchant ID</label>
                  <input
                    className={field}
                    value={form!.jazzCash.merchantId}
                    onChange={(e) =>
                      setForm({
                        ...form!,
                        jazzCash: { ...form!.jazzCash, merchantId: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Password{" "}
                    {form!.jazzCash.hasPassword && (
                      <span className="text-xs text-slate-400">(saved)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    className={field}
                    value={jazzPassword}
                    onChange={(e) => setJazzPassword(e.target.value)}
                    placeholder={form!.jazzCash.hasPassword ? "Leave blank to keep current" : ""}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Hash key{" "}
                    {form!.jazzCash.hasHashKey && (
                      <span className="text-xs text-slate-400">(saved)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    className={field}
                    value={jazzHash}
                    onChange={(e) => setJazzHash(e.target.value)}
                    placeholder={form!.jazzCash.hasHashKey ? "Leave blank to keep current" : ""}
                  />
                </div>
                <div>
                  <label className={labelCls}>Return URL (optional)</label>
                  <input
                    className={field}
                    value={form!.jazzCash.returnUrl ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form!,
                        jazzCash: { ...form!.jazzCash, returnUrl: e.target.value || null },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

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
        )}
      </main>
    </div>
  );
}
