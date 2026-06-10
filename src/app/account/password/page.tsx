"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandHeader } from "@/components/brand-header";
import { PasswordField } from "@/components/password-field";
import { authApi } from "@/lib/api";
import { getSession, saveSession, getPostLoginPath, isSuperAdmin } from "@/lib/auth";
import { loadAndApplyBranding, setTenantSlug, type BrandingDto } from "@/lib/branding";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forced, setForced] = useState(false);
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [platformUser, setPlatformUser] = useState(false);
  const [backHref, setBackHref] = useState("/dashboard");

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setForced(!!session.mustChangePassword);
    setPlatformUser(isSuperAdmin(session));
    setBackHref(getPostLoginPath(session));

    const slug = session.tenant?.slug;
    if (slug) {
      setTenantSlug(slug);
      void loadAndApplyBranding(slug).then(setBranding);
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirmTrimmed = confirm.trim();

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirmTrimmed) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      const session = getSession();
      if (session) saveSession({ ...session, mustChangePassword: false });
      router.push(session ? getPostLoginPath({ ...session, mustChangePassword: false }) : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          {platformUser ? (
            <div className="mb-2 flex items-center gap-2 font-bold text-indigo-600">
              <Building2 className="h-6 w-6" />
              <span>Platform Console</span>
            </div>
          ) : (
            <BrandHeader branding={branding} />
          )}
          <CardTitle>{forced ? "Set a new password" : "Change your password"}</CardTitle>
          {forced && (
            <p className="text-sm text-slate-600">
              You signed in with a temporary password. Paste the exact temp password from your
              administrator, then choose a new one to continue.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <PasswordField
              id="current-password"
              label={forced ? "Temporary password" : "Current password"}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <PasswordField
              id="new-password"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Update password"}
            </Button>
            {!forced && (
              <p className="text-center text-sm text-slate-600">
                <Link href={backHref} className="text-[var(--brand)] hover:underline">
                  Back to app
                </Link>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
