import type { TenantFeatures } from "@/lib/auth";

export type ProductProfile = "ExamPrep" | "GeneralLms" | "Both";

export const PRODUCT_PROFILE_LABELS: Record<ProductProfile, string> = {
  ExamPrep: "Exam preparation (MDCAT / ECAT)",
  GeneralLms: "General LMS (courses & quizzes)",
  Both: "Both (academy + courses)",
};

export function parseProductProfile(value: string | undefined | null): ProductProfile {
  if (value === "GeneralLms" || value === "Both") return value;
  return "ExamPrep";
}

export function isExamPrepProfile(tenant?: TenantFeatures | null): boolean {
  const p = parseProductProfile(tenant?.productProfile);
  return p === "ExamPrep" || p === "Both";
}

export function hasMockExams(tenant?: TenantFeatures | null): boolean {
  return tenant?.mockExamsEnabled ?? true;
}

export function hasUnitPyqTests(tenant?: TenantFeatures | null): boolean {
  return tenant?.unitPyqTestsEnabled ?? true;
}

export function hasMistakeDiary(tenant?: TenantFeatures | null): boolean {
  return tenant?.mistakeDiaryEnabled ?? true;
}

export function hasDoubts(tenant?: TenantFeatures | null): boolean {
  return tenant?.doubtsEnabled ?? true;
}

export function hasSyllabusMentor(
  tenant?: TenantFeatures | null,
  brandingEnabled?: boolean
): boolean {
  if (brandingEnabled === false) return false;
  return tenant?.syllabusMentorEnabled ?? true;
}

export function profileBundleLabel(tenant?: TenantFeatures | null): string {
  const p = parseProductProfile(tenant?.productProfile);
  if (p === "GeneralLms") return "course";
  if (p === "Both") return "batch or course";
  return "batch";
}

export function profileBundleLabelPlural(tenant?: TenantFeatures | null): string {
  const p = parseProductProfile(tenant?.productProfile);
  if (p === "GeneralLms") return "courses";
  if (p === "Both") return "batches or courses";
  return "batches";
}

/** Examples for the content admin “Quick add topic” helper. */
export function quickAddTopicExamples(tenant?: TenantFeatures | null): {
  bundle: string;
  subject: string;
} {
  const p = parseProductProfile(tenant?.productProfile);
  if (p === "GeneralLms") {
    return { bundle: "Web Development 101", subject: "JavaScript Basics" };
  }
  if (p === "Both") {
    return {
      bundle: "MDCAT July session or Web Dev 101",
      subject: "Physics or a module inside the course",
    };
  }
  return { bundle: "MDCAT July session", subject: "Physics, Chemistry" };
}
