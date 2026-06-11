"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardList,
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
  type AuthSession,
} from "@/lib/auth";
import { getSetupSteps, type SetupStep } from "@/lib/setup-wizard-steps";

const ICONS = {
  Palette,
  Mail,
  Package,
  UserPlus,
  Sparkles,
  ClipboardList,
} as const;

function stepIcon(step: SetupStep) {
  const Icon = ICONS[step.iconName];
  return <Icon className="h-6 w-6 text-[var(--brand)]" />;
}

export default function AdminSetupPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [step, setStep] = useState(0);
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});

  const steps = useMemo(() => getSetupSteps(session), [session]);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    if (!canManageInstitute(s)) {
      router.replace("/admin");
      return;
    }
    setSession(s);
  }, [router]);

  function skipStep(index: number) {
    setSkipped((prev) => ({ ...prev, [index]: true }));
    if (index < steps.length - 1) {
      setStep(index + 1);
    }
  }

  function finish() {
    markSetupWizardComplete();
    router.replace("/admin/checklist");
  }

  if (!session) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

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
          {steps.map((s, i) => (
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
              <div className="rounded-lg bg-slate-100 p-3">{stepIcon(current)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Step {step + 1} of {steps.length}
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
                      {step === 0 ? "Continue" : "Set up later"}
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
          {steps.map((s, i) => {
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
