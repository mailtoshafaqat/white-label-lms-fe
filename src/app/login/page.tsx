"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandHeader } from "@/components/brand-header";
import { authApi } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { loadAndApplyBranding, setTenantSlug, type BrandingDto } from "@/lib/branding";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tenant = params.get("tenant") ?? "demo";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingDto | null>(null);

  useEffect(() => {
    setTenantSlug(tenant);
    loadAndApplyBranding(tenant).then(setBranding);
  }, [tenant]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.login({ email, password });
      if (session.tenant?.slug) setTenantSlug(session.tenant.slug);
      saveSession(session);
      router.push(session.mustChangePassword ? "/account/password" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
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
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Link
                  href={`/forgot-password?tenant=${tenant}`}
                  className="text-xs text-[var(--brand)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
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
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
