"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { saveSession, getPostLoginPath } from "@/lib/auth";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.login({ email, password });
      if (session.role !== "SuperAdmin" && session.role !== "Support") {
        setError("This login is for platform staff only. Use your institute login page.");
        return;
      }
      saveSession(session);
      router.push(getPostLoginPath(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-900/90 text-slate-100 shadow-2xl shadow-black/40">
        <CardHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-200">Platform Console</p>
              <p className="text-xs text-slate-400">SuperAdmin / Support</p>
            </div>
          </div>
          <CardTitle className="text-white">Sign in to manage institutes</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@platform.com"
                className="w-full rounded-md border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-md border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-indigo-500 text-white hover:bg-indigo-400"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in to platform"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-400">
            Institute admin, teacher, or student?{" "}
            <Link href="/login?tenant=demo" className="text-indigo-300 hover:underline">
              Institute login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
