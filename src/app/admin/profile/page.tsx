"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Mail, User } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, type AdminProfileDto } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

export default function AdminProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || !isAdmin(session)) {
      router.replace("/dashboard");
      return;
    }

    adminApi
      .myProfile()
      .then(setProfile)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <User className="h-6 w-6 text-[var(--brand)]" />
          My profile
        </h1>
        <p className="mt-1 text-slate-600">Your account details and assigned subjects.</p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {loading ? (
          <p className="mt-8 text-slate-500">Loading…</p>
        ) : profile ? (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{profile.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{profile.email}</span>
                </div>
                <p className="text-slate-500">
                  Role: <span className="font-medium text-slate-700">{profile.role}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-[var(--brand)]" />
                  Assigned subjects
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.subjects.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No subjects assigned yet. Ask your institute admin to assign subjects.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {profile.subjects.map((s) => (
                      <li key={s.subjectId} className="py-3">
                        <p className="font-medium text-slate-800">{s.subjectTitle}</p>
                        <p className="text-xs text-slate-500">{s.bundleTitle}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}
