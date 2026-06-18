"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Loader2, ArrowLeft } from "lucide-react";
import { StudentNav } from "@/components/student-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  coursesApi,
  paymentsApi,
  authApi,
  type AvailableGatewayDto,
  type BundleDto,
  type PaymentGateway,
} from "@/lib/api";
import { getSession } from "@/lib/auth";
import { COUNTRY_OPTIONS, countryLabel } from "@/lib/countries";

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const bundleId = params.bundleId as string;

  const [bundle, setBundle] = useState<BundleDto | null>(null);
  const [gateways, setGateways] = useState<AvailableGatewayDto[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [profileCountry, setProfileCountry] = useState<string | null>(null);
  const [editingCountry, setEditingCountry] = useState(false);
  const [selected, setSelected] = useState<PaymentGateway | null>(null);
  const [txnRef, setTxnRef] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    authApi
      .me()
      .then((profile) => {
        const resolved = profile.country ?? profile.tenantDefaultCountry ?? "PK";
        setProfileCountry(profile.country);
        setCountry(resolved);
        setEditingCountry(!profile.country);
      })
      .catch(() => {
        setCountry("PK");
        setEditingCountry(true);
      });
  }, [router]);

  useEffect(() => {
    if (!country) return;
    const session = getSession();
    if (!session) return;
    setLoading(true);
    Promise.all([coursesApi.bundles(), paymentsApi.availableGateways(bundleId, country)])
      .then(([bundles, gw]) => {
        const b = bundles.find((x) => x.id === bundleId) ?? null;
        setBundle(b);
        setGateways(gw);
        if (gw.length > 0) setSelected(gw[0].gateway);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router, bundleId, country]);

  async function payOnline() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await paymentsApi.checkout({
        bundleId,
        gateway: selected,
        studentCountry: country ?? undefined,
      });
      if (res.formPost) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = res.formPost.actionUrl;
        for (const [key, value] of Object.entries(res.formPost.fields)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setError("Checkout URL was not returned.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitManual() {
    setSubmitting(true);
    setError(null);
    try {
      await paymentsApi.submitManual({
        bundleId,
        transactionRef: txnRef,
        note: note || null,
        studentCountry: country ?? undefined,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const manualGw = gateways.find((g) => g.gateway === "Manual");
  const field = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

  return (
    <div className="min-h-screen bg-slate-50">
      <StudentNav />
      <main className="mx-auto max-w-lg px-6 py-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[var(--brand)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <CreditCard className="h-6 w-6 text-[var(--brand)]" /> Checkout
        </h1>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : !bundle ? (
          <p className="mt-6 text-slate-500">Course not found.</p>
        ) : submitted ? (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-slate-700">
                Your payment proof was submitted. An administrator will review it and enroll you once
                approved.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : gateways.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-slate-600">Online payment is not available for this course.</p>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/dashboard">Back</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">{bundle.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">
                  Rs. {bundle.price.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {profileCountry && !editingCountry ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <span className="text-slate-700">
                  <span className="font-medium text-slate-900">Billing country:</span>{" "}
                  {countryLabel(profileCountry)}
                </span>
                <button
                  type="button"
                  className="text-[var(--brand)] hover:underline"
                  onClick={() => setEditingCountry(true)}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Your country</label>
                <select
                  className={field}
                  value={country ?? "PK"}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  JazzCash and Easypaisa appear only for Pakistan.
                  {profileCountry ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="text-[var(--brand)] hover:underline"
                        onClick={() => {
                          setCountry(profileCountry);
                          setEditingCountry(false);
                        }}
                      >
                        Use profile country
                      </button>
                    </>
                  ) : null}
                </p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-700">Payment method</p>
              {gateways.map((g) => (
                <label
                  key={g.gateway}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="gateway"
                    checked={selected === g.gateway}
                    onChange={() => setSelected(g.gateway)}
                  />
                  <span>
                    <strong>{g.label}</strong>
                    {g.instructions && (
                      <span className="mt-1 block whitespace-pre-wrap text-slate-500">
                        {g.instructions}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            {selected === "Manual" ? (
              <div className="mt-4 space-y-3">
                {manualGw?.instructions && (
                  <div className="rounded-md bg-slate-100 p-3 text-sm whitespace-pre-wrap text-slate-700">
                    {manualGw.instructions}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">Transaction reference</label>
                  <input className={field} value={txnRef} onChange={(e) => setTxnRef(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Note (optional)</label>
                  <textarea className={field} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <Button disabled={submitting || !txnRef.trim()} onClick={submitManual}>
                  {submitting ? "Submitting…" : "Submit payment proof"}
                </Button>
              </div>
            ) : (
              <Button className="mt-6 w-full" disabled={submitting || !selected} onClick={payOnline}>
                {submitting ? "Redirecting…" : "Continue to payment"}
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
