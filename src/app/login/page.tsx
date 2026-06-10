"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandHeader } from "@/components/brand-header";
import { PasswordField } from "@/components/password-field";
import { authApi } from "@/lib/api";
import { saveSession, getPostLoginPath } from "@/lib/auth";
import { loadAndApplyBranding, setTenantSlug, type BrandingDto } from "@/lib/branding";
import { isBrandingPreview } from "@/lib/preview-session";
import { PreviewModeBanner } from "@/components/preview-mode-banner";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tenant = params.get("tenant") ?? "demo";
  const brandingPreview = isBrandingPreview(params);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingDto | null>(null);

  useEffect(() => {
    setTenantSlug(tenant);
    loadAndApplyBranding(tenant, { useDraftPreview: brandingPreview }).then(setBranding);
  }, [tenant, brandingPreview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.login({ email, password });
      if (session.tenant?.slug) setTenantSlug(session.tenant.slug);
      saveSession(session);
      router.push(getPostLoginPath(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {brandingPreview && (
        <PreviewModeBanner branding editorHref="/admin/settings/branding" />
      )}
      <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <BrandHeader branding={branding} />
          <CardTitle>Log in to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@academy.com"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <Link
                  href={`/forgot-password?tenant=${tenant}`}
                  className="text-xs text-[var(--brand)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordField
                label=""
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            Accounts are created by your institute. Contact your administrator for access.
          </p>
          <p className="mt-2 text-center text-xs text-slate-400">
            Platform operator?{" "}
            <Link href="/login/platform" className="text-[var(--brand)] hover:underline">
              SuperAdmin login
            </Link>
          </p>
        </CardContent>
      </Card>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
