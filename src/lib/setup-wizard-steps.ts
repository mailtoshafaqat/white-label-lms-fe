import type { AuthSession } from "@/lib/auth";
import { hasMockExams, parseProductProfile, PRODUCT_PROFILE_LABELS, profileBundleLabel } from "@/lib/product-profile";

export type SetupStep = {
  title: string;
  description: string;
  href: string | null;
  linkLabel: string | null;
  iconName: "Palette" | "Mail" | "Package" | "UserPlus" | "Sparkles" | "ClipboardList";
};

export function getSetupSteps(session: AuthSession | null): SetupStep[] {
  const profile = parseProductProfile(session?.tenant?.productProfile);
  const bundleWord = profileBundleLabel(session?.tenant);
  const profileLabel = PRODUCT_PROFILE_LABELS[profile];

  const bundleStep: SetupStep = {
    title: profile === "GeneralLms" ? "First course" : `First ${bundleWord}`,
    description:
      profile === "GeneralLms"
        ? "Create your first course bundle and add subjects, units, and topics."
        : profile === "Both"
          ? "Create your first batch or course bundle with subjects, units, and topics."
          : "Create your first batch (bundle) and add subjects, units, and topics for your session.",
    href: "/admin",
    linkLabel: "Go to content admin",
    iconName: "Package",
  };

  const steps: SetupStep[] = [
    {
      title: "Your institute type",
      description: `This tenant is configured as “${profileLabel}”. Menus and modules follow this profile. Contact platform support to change it.`,
      href: null,
      linkLabel: null,
      iconName: "ClipboardList",
    },
    {
      title: "Branding",
      description: "Set your institute name, logo, and brand colors so learners see your identity.",
      href: "/admin/settings/branding",
      linkLabel: "Open branding settings",
      iconName: "Palette",
    },
    {
      title: "Email (SMTP)",
      description: "Configure outbound email so welcome messages and notifications reach students.",
      href: "/admin/settings/email",
      linkLabel: "Open email settings",
      iconName: "Mail",
    },
    bundleStep,
    {
      title: "First student",
      description: `Provision a student account and enroll them in your ${bundleWord}.`,
      href: "/admin/students",
      linkLabel: "Add a student",
      iconName: "UserPlus",
    },
  ];

  if (hasMockExams(session?.tenant)) {
    steps.push({
      title: "First mock exam (optional)",
      description: "Publish a practice mock when your topics have MCQs. Skip if you are still building content.",
      href: "/admin/mock-exams",
      linkLabel: "Open mock exams",
      iconName: "ClipboardList",
    });
  }

  steps.push({
    title: "Done",
    description: "You're ready to explore the full setup checklist and launch your institute.",
    href: null,
    linkLabel: null,
    iconName: "Sparkles",
  });

  return steps;
}
