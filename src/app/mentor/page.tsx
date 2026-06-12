"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { MentorPanel } from "@/components/mentor-panel";
import { loadAndApplyBranding, mentorLabel, type BrandingDto } from "@/lib/branding";
import { getSession } from "@/lib/auth";
import { coursesApi, type SubjectDto } from "@/lib/api";

export default function MentorPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    loadAndApplyBranding().then(setBranding);
    coursesApi
      .bundles()
      .then(async (bundles) => {
        if (bundles.length === 0) return;
        const detail = await coursesApi.bundle(bundles[0].id);
        setSubjects(detail.subjects);
        if (detail.subjects[0]) setSubjectId(detail.subjects[0].id);
      })
      .catch(() => {});
  }, [router]);

  if (branding && !branding.syllabusMentorEnabled) {
    return (
      <div className="min-h-screen p-8 text-center text-slate-600">
        Syllabus Mentor is not enabled for this institute.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandHeader branding={branding} />
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">{mentorLabel(branding)}</span>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8 space-y-4">
        {subjects.length > 0 && (
          <label className="block text-sm text-slate-600">
            Subject scope
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <MentorPanel subjectId={subjectId || undefined} branding={branding} />
      </main>
    </div>
  );
}
