"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Mail,
  Palette,
  Package,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import {
  canManageInstitute,
  getSession,
  markSetupWizardComplete,
} from "@/lib/auth";

const STEPS = [
  {
    title: "Branding",
    description: "Set your institute name, logo, and brand colors so learners see your identity.",
    href: "/admin/settings/branding",
    linkLabel: "Open branding settings",
    icon: Palette,
  },
  {
    title: "Email (SMTP)",
    description: "Configure outbound email so welcome messages and notifications reach students.",
    href: "/admin/settings/email",
    linkLabel: "Open email settings",
    icon: Mail,
  },
  {
    title: "First course bundle",
    description: "Create your first course bundle and add subjects, units, and topics.",
    href: "/admin",
    linkLabel: "Go to content admin",
    icon: Package,
  },
  {
    title: "First student",
    description: "Provision a student account and optionally enroll them in a course.",
    href: "/admin/students",
    linkLabel: "Add a student",
    icon: UserPlus,
  },
  {
    title: "Done",
    description: "You're ready to explore the full setup checklist and launch your institute.",
    href: null,
    linkLabel: null,
    icon: Sparkles,
  },
] as const;

export default function AdminSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canManageInstitute(session)) {
      router.replace("/admin");
    }
  }, [router]);

  function skipStep(index: number) {
    setSkipped((prev) => ({ ...prev, [index]: true }));
    if (index < STEPS.length - 1) {
      setStep(index + 1);
    }
  }

  function finish() {
    markSetupWizardComplete();
    router.replace("/admin/checklist");
  }

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Welcome — let&apos;s set up your institute</h1>
        <p className="mt-2 text-slate-600">
          A quick first-run tour. Steps you defer stay on your{" "}
          <Link href="/admin/checklist" className="text-[var(--brand)] hover:underline">
            setup checklist
          </Link>{" "}
          until configured — skipping here does not mark them complete.
        </p>

        <div className="mt-8 flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={`h-1.5 flex-1 rounded-full ${
                i < step || skipped[i] ? "bg-[var(--brand)]" : i === step ? "bg-slate-800" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-slate-100 p-3">
                <Icon className="h-6 w-6 text-[var(--brand)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{current.title}</h2>
                <p className="mt-2 text-slate-600">{current.description}</p>
                {!isLast && (
                  <p className="mt-3 text-xs text-slate-500">
                    Choose <strong className="font-medium text-slate-600">Set up later</strong> to
                    move on — this step will remain on your checklist until you configure it.
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {current.href && (
                    <Button asChild>
                      <Link href={current.href}>
                        {current.linkLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {!isLast && (
                    <Button type="button" variant="outline" onClick={() => skipStep(step)}>
                      Set up later
                    </Button>
                  )}
                  {isLast && (
                    <Button type="button" onClick={finish}>
                      <CheckCircle2 className="h-4 w-4" />
                      Go to checklist
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ul className="mt-8 space-y-2">
          {STEPS.map((s, i) => {
            const done = i < step || skipped[i] || (isLast && i === step);
            return (
              <li
                key={s.title}
                className={`flex items-center gap-2 text-sm ${
                  i === step ? "font-medium text-slate-900" : "text-slate-500"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                )}
                {s.title}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
