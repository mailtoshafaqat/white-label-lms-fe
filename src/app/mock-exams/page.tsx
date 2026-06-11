"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAndApplyBranding, type BrandingDto } from "@/lib/branding";
import { enrollmentApi, mockExamsApi, type EnrollmentDto, type MockExamSummaryDto } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function MockExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<MockExamSummaryDto[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const slug = session.tenant?.slug ?? "demo";
    loadAndApplyBranding(slug).then(setBranding);
    Promise.all([mockExamsApi.list(), enrollmentApi.myEnrollments()])
      .then(([examList, enrollmentList]) => {
        setExams(examList);
        setEnrollments(enrollmentList.filter((e) => e.isActive));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <BrandHeader branding={branding} />
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ClipboardList className="h-6 w-6 text-[var(--brand)]" />
          Mock exams
        </h1>
        <p className="mt-1 text-slate-600">Timed multi-topic practice exams.</p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!loading && enrollments.length > 0 && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {enrollments.map((e) => (
              <p key={e.bundleId}>
                <strong>{e.bundleTitle}</strong> — access until{" "}
                {new Date(e.expiresAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            ))}
          </div>
        )}
        {loading ? (
          <p className="mt-8 text-slate-500">Loading…</p>
        ) : exams.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No mock exams available yet.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {exams.map((exam) => (
              <Card key={exam.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{exam.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">
                    {exam.subjectTitle} · {exam.totalQuestions} questions · {exam.timeLimitMinutes}{" "}
                    min · {exam.availabilityStatus}
                    {exam.accessExpiresAtUtc && (
                      <>
                        {" "}
                        · Access until{" "}
                        {new Date(exam.accessExpiresAtUtc).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </>
                    )}
                  </p>
                  <Button size="sm" asChild disabled={exam.availabilityStatus !== "Open"}>
                    <Link href={`/mock-exams/${exam.id}`}>
                      {exam.activeAttempt ? "Resume" : "Start"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <Link href="/dashboard" className="mt-8 inline-block text-sm text-slate-500 hover:text-slate-800">
          ← Back to dashboard
        </Link>
      </main>
    </div>
  );
}
