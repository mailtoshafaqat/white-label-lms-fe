"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, PlayCircle } from "lucide-react";
import { StudentNav } from "@/components/student-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { progressApi, type StudentProgramDto } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { loadAndApplyBranding, type BrandingDto } from "@/lib/branding";

const SUBJECT_BAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export default function ProgramPage() {
  const router = useRouter();
  const [program, setProgram] = useState<StudentProgramDto | null>(null);
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    loadAndApplyBranding().then(setBranding);
    progressApi
      .program()
      .then(setProgram)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-white to-slate-50">
      <StudentNav branding={branding} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Program</h1>
          <p className="mt-1 text-sm text-slate-600">Your enrolled courses and subject progress</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {loading && <p className="text-slate-500">Loading…</p>}

        {program?.continueTopic && (
          <Card className="mb-8 border-[var(--brand)]/30 bg-gradient-to-r from-[var(--brand)]/5 to-white shadow-sm">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                  Continue learning
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {program.continueTopic.topicTitle}
                </p>
                <p className="text-sm text-slate-600">
                  {program.continueTopic.subjectTitle} · {program.continueTopic.bundleTitle}
                </p>
              </div>
              <Button asChild>
                <Link href={`/topic/${program.continueTopic.topicId}`}>
                  <PlayCircle className="h-4 w-4" /> Resume
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {program?.bundles.map((bundle) => (
          <section key={bundle.bundleId} className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BookOpen className="h-5 w-5 text-[var(--brand)]" />
              {bundle.title}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bundle.subjects.map((subject, i) => (
                <Card key={subject.subjectId} className="border-slate-200/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{subject.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {subject.topicsCompleted}/{subject.topicsTotal} topics
                      </span>
                      <span className="font-semibold text-slate-800">{subject.percentComplete}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${SUBJECT_BAR_COLORS[i % SUBJECT_BAR_COLORS.length]}`}
                        style={{ width: `${Math.max(subject.percentComplete, 4)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

        {!loading && program?.bundles.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-slate-600">
              <p>You are not enrolled in any program yet.</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/dashboard">
                  Back to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
