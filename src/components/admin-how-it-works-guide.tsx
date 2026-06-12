"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  isExamPrepProfile,
  parseProductProfile,
  profileBundleLabel,
  profileBundleLabelPlural,
} from "@/lib/product-profile";

function everyBundlePhrase(tenant: Parameters<typeof profileBundleLabel>[0]) {
  const label = profileBundleLabel(tenant);
  return `every ${label}`;
}
import { useClientMounted } from "@/lib/use-auth-session";

function GuidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-slate-700">
      <div className="flex gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="font-medium text-slate-900">{title}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function SubjectCatalogHowItWorks() {
  const mounted = useClientMounted();
  if (!mounted) return null;

  const tenant = getSession()?.tenant;
  const profile = parseProductProfile(tenant?.productProfile);
  const academy = isExamPrepProfile(tenant);
  const bundlesLabel = profileBundleLabelPlural(tenant);

  const subjectExamples =
    profile === "GeneralLms"
      ? "Module 1, Module 2, or JavaScript Basics"
      : profile === "Both"
        ? "Physics, Chemistry, or Module 1"
        : "Physics, Chemistry, Biology";

  return (
    <GuidePanel title="How the subject catalog works">
      <p>
        This is your institute&apos;s <strong>master subject list</strong> ({subjectExamples}).
        You define subjects here once, then pick them when building courses on the{" "}
        <Link href="/admin" className="font-medium text-[var(--brand)] hover:underline">
          Content
        </Link>{" "}
        page.
      </p>
      <ul className="list-inside list-disc space-y-1 text-slate-600">
        <li>
          <strong>Shared library</strong> (optional) — add units here to reuse the same content in
          {everyBundlePhrase(tenant)} that includes this subject.
        </li>
        <li>
          <strong>Archive</strong> — hides a subject from new {bundlesLabel}. Existing placements and
          library
          content stay as they are.
        </li>
        <li>
          <strong>MCQs &amp; videos</strong> — added under Content → topic, for both academy and
          general courses (same engine).
        </li>
        {academy && (
          <li>
            <strong>Mock exams &amp; doubts</strong> — separate academy tools; not managed on this
            page.
          </li>
        )}
      </ul>
    </GuidePanel>
  );
}

export function ContentPageHowItWorks({ manageStructure }: { manageStructure: boolean }) {
  const mounted = useClientMounted();
  if (!mounted || !manageStructure) return null;

  const tenant = getSession()?.tenant;
  const profile = parseProductProfile(tenant?.productProfile);
  const academy = isExamPrepProfile(tenant);
  const bundleLabel = profileBundleLabel(tenant);

  const bundleExample =
    profile === "GeneralLms"
      ? "Web Development 101"
      : profile === "Both"
        ? "MDCAT July 2026 or Web Dev 101"
        : "MDCAT July 2026";

  const subjectExample =
    profile === "GeneralLms" ? "Module 1" : profile === "Both" ? "Physics or Module 1" : "Physics";

  return (
    <GuidePanel title="How content is organized">
      <p>
        Build your tree: <strong>{bundleLabel}</strong> ({bundleExample}) →{" "}
        <strong>subject</strong> (from{" "}
        <Link href="/admin/subjects" className="font-medium text-[var(--brand)] hover:underline">
          Subject catalog
        </Link>
        , e.g. {subjectExample}) → <strong>unit</strong> → <strong>topic</strong>.
      </p>
      <ul className="list-inside list-disc space-y-1 text-slate-600">
        <li>
          Pick subjects from the catalog dropdown — do not type ad-hoc names. Wrong subject?{" "}
          <strong>Remove</strong> and pick again.
        </li>
        <li>
          Open a topic to add <strong>lectures, notes, MCQs, and flashcards</strong>. General LMS
          courses use the same quiz flow as academy subjects.
        </li>
        {academy ? (
          <li>
            <strong>Mock exams</strong> and <strong>doubts</strong> are academy extras (separate
            menus), not part of this tree.
          </li>
        ) : (
          <li>
            Your institute uses <strong>general LMS</strong> mode — focus on courses, modules, and
            topic quizzes. Mock exams and doubts are not enabled.
          </li>
        )}
      </ul>
    </GuidePanel>
  );
}
