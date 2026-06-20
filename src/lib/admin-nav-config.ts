import type { AuthSession } from "@/lib/auth";
import { canManageInstitute } from "@/lib/auth";
import {
  hasDoubts,
  hasMockExams,
  parseProductProfile,
} from "@/lib/product-profile";

export type AdminNavItem = {
  href: string;
  label: string;
  group?: "academy" | "courses" | "core";
};

function academyItems(session: AuthSession): AdminNavItem[] {
  const tenant = session.tenant;
  const items: AdminNavItem[] = [];
  if (hasMockExams(tenant)) {
    items.push({ href: "/admin/mock-exams", label: "Mock exams", group: "academy" });
  }
  if (hasDoubts(tenant)) {
    items.push({ href: "/admin/doubts", label: "Doubts", group: "academy" });
  }
  return items;
}

function liveClassNavItem(session: AuthSession): AdminNavItem | null {
  if (session.tenant?.liveClassesEnabled === false) return null;
  return { href: "/admin/live-classes", label: "Live classes", group: "academy" };
}

function showAcademy(session: AuthSession): boolean {
  const p = parseProductProfile(session.tenant?.productProfile);
  return p === "ExamPrep" || p === "Both";
}

export function getAdminNavItems(session: AuthSession): AdminNavItem[] {
  const institute = canManageInstitute(session);
  const academy = showAcademy(session) ? academyItems(session) : [];
  const liveClass = liveClassNavItem(session);
  const academyAndLive = liveClass ? [...academy, liveClass] : academy;

  if (institute) {
    const coreBefore: AdminNavItem[] = [
      { href: "/admin/home", label: "Home", group: "core" },
      { href: "/admin/checklist", label: "Checklist", group: "core" },
      { href: "/admin/help", label: "Help", group: "core" },
      { href: "/admin/setup", label: "Setup wizard", group: "core" },
      { href: "/admin/subjects", label: "Subject catalog", group: "courses" },
      { href: "/admin", label: "Content", group: "courses" },
      { href: "/admin/progress", label: "Progress", group: "courses" },
      { href: "/admin/analytics", label: "Analytics", group: "courses" },
      { href: "/admin/question-bank", label: "Question bank", group: "courses" },
      { href: "/admin/certificates", label: "Certificates", group: "courses" },
    ];
    const coreAfter: AdminNavItem[] = [
      { href: "/admin/teachers", label: "Teachers", group: "core" },
      { href: "/admin/students", label: "Students", group: "core" },
      { href: "/admin/payments", label: "Payments", group: "core" },
      { href: "/admin/settings", label: "Settings", group: "core" },
    ];
    return [...coreBefore, ...academyAndLive, ...coreAfter];
  }

  const items: AdminNavItem[] = [
    { href: "/admin/home", label: "Home", group: "core" },
    { href: "/admin/help", label: "Help", group: "core" },
    { href: "/admin", label: "Content", group: "courses" },
    { href: "/admin/progress", label: "Progress", group: "courses" },
    { href: "/admin/analytics", label: "Analytics", group: "courses" },
    { href: "/admin/question-bank", label: "Question bank", group: "courses" },
    { href: "/admin/certificates", label: "Certificates", group: "courses" },
    ...academyAndLive,
    { href: "/admin/profile", label: "Profile", group: "core" },
  ];
  return items;
}

export function showNavGroupLabels(session: AuthSession): boolean {
  return parseProductProfile(session.tenant?.productProfile) === "Both";
}
