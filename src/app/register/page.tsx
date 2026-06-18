"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandHeader } from "@/components/brand-header";
import { PasswordField } from "@/components/password-field";
import { authApi } from "@/lib/api";
import { saveSession, getPostLoginPath } from "@/lib/auth";
import { loadAndApplyBranding, setTenantSlug, type BrandingDto } from "@/lib/branding";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tenant = params.get("tenant") ?? "demo";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  useEffect(() => {
    setTenantSlug(tenant);
    loadAndApplyBranding(tenant)
      .then((b) => {
        setBranding(b);
        if (b && !b.allowStudentSelfEnroll) {
          router.replace(`/login?tenant=${tenant}`);
        }
      })
      .finally(() => setBrandingLoaded(true));
  }, [tenant, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.register({ email, password, fullName });
      if (session.tenant?.slug) setTenantSlug(session.tenant.slug);
      saveSession(session);
      router.push(getPostLoginPath(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (!brandingLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </main>
    );
  }

  if (branding && !branding.allowStudentSelfEnroll) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <BrandHeader branding={branding} />
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
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
                placeholder="student@academy.com"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <PasswordField
                label=""
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href={`/login?tenant=${tenant}`} className="text-[var(--brand)] hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading…</main>}>
      <RegisterForm />
    </Suspense>
  );
}
