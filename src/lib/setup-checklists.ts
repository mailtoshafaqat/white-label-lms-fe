import { adminApi, coursesApi, superAdminApi } from "@/lib/api";

export type ChecklistItemDef = {
  id: string;
  title: string;
  description: string;
  href?: string;
  optional?: boolean;
};

export type ChecklistSection = {
  id: string;
  title: string;
  items: ChecklistItemDef[];
};

export const SUPERADMIN_CHECKLIST_STORAGE_KEY = "lms_superadmin_setup_manual_v1";
export const INSTITUTE_CHECKLIST_STORAGE_KEY = "lms_institute_setup_manual_v1";

export const superAdminChecklistSections: ChecklistSection[] = [
  {
    id: "onboard",
    title: "1. Onboard institute",
    items: [
      {
        id: "tenant-created",
        title: "At least one institute exists",
        description: "Create the tenant with name, slug, and plan (MVP or Pro).",
        href: "/superadmin",
      },
      {
        id: "flags-set",
        title: "Feature flags reviewed",
        description:
          "Set AllowAdminCreateStudent, self-enroll, live classes, and Syllabus Mentor per institute needs.",
        href: "/superadmin",
      },
      {
        id: "institute-admin",
        title: "Institute admin provisioned",
        description: "Create an owner account and copy the temporary password.",
        href: "/superadmin",
      },
      {
        id: "login-url-shared",
        title: "Login URL shared with owner",
        description: "Send /login?tenant={slug} and credentials. Owner must change password on first login.",
      },
    ],
  },
  {
    id: "handoff",
    title: "2. Platform defaults & handoff",
    items: [
      {
        id: "default-branding",
        title: "Default branding set (optional)",
        description: "Logo and primary colour on the tenant page before handoff.",
        href: "/superadmin",
        optional: true,
      },
      {
        id: "owner-login-verified",
        title: "Owner login verified",
        description: "Confirm the institute admin can sign in and reach /admin.",
      },
      {
        id: "owner-checklist-started",
        title: "Owner started institute setup",
        description: "Institute admin should complete the Setup checklist at /admin/checklist.",
        href: "/admin/checklist",
      },
    ],
  },
];

export const instituteChecklistSections: ChecklistSection[] = [
  {
    id: "brand",
    title: "1. Brand & public site",
    items: [
      {
        id: "branding",
        title: "Branding configured",
        description: "Display name, logo, primary colour, and support email.",
        href: "/admin/settings/branding",
      },
      {
        id: "landing",
        title: "Landing page published",
        description: "Hero, features, and footer sections for the public site.",
        href: "/admin/settings/landing",
      },
      {
        id: "landing-preview",
        title: "Public site previewed",
        description: "Open the home page without logging in to confirm branding.",
        href: "/",
      },
    ],
  },
  {
    id: "integrations",
    title: "2. Email & live classes",
    items: [
      {
        id: "smtp",
        title: "SMTP configured (or dev-outbox accepted)",
        description: "Student welcome emails need SMTP. In dev, check backend/dev-emails/ if unset.",
        href: "/admin/settings/email",
      },
      {
        id: "zoom",
        title: "Zoom configured or manual URLs planned",
        description: "Server-to-Server OAuth auto-creates meetings; otherwise paste join URLs per class.",
        href: "/admin/settings/zoom",
        optional: true,
      },
    ],
  },
  {
    id: "catalog",
    title: "3. Subject catalog",
    items: [
      {
        id: "subject-catalog",
        title: "Subject catalog reviewed",
        description: "Institute-wide subjects (Physics, Chemistry, etc.) before batch/course trees.",
        href: "/admin/subjects",
      },
    ],
  },
  {
    id: "content",
    title: "4. Courses & content",
    items: [
      {
        id: "bundle",
        title: "Course bundle created",
        description: "Add at least one bundle (batch or course) for enrollments.",
        href: "/admin",
      },
      {
        id: "course-tree",
        title: "Subject → unit → topic tree built",
        description: "Expand the CMS tree with subjects, units, and topics.",
        href: "/admin",
      },
      {
        id: "topic-content",
        title: "Topic content added",
        description: "Upload video, notes, MCQs, or flashcards on at least one topic.",
        href: "/admin",
      },
      {
        id: "topic-quiz",
        title: "Topic quiz / MCQs added",
        description: "Daily practice MCQs on at least one topic (manual entry or CSV import).",
        href: "/admin",
      },
    ],
  },
  {
    id: "people",
    title: "5. People & classes",
    items: [
      {
        id: "teacher",
        title: "Teacher account created",
        description: "Provision teachers who will manage assigned subjects.",
        href: "/admin/teachers",
      },
      {
        id: "teacher-subjects",
        title: "Teacher assigned to subjects",
        description: "Teachers only see CMS and doubts for their subjects.",
        href: "/admin/teachers",
      },
      {
        id: "student",
        title: "Student account created",
        description: "All students are admin-provisioned — no public signup.",
        href: "/admin/students",
      },
      {
        id: "student-enrolled",
        title: "Student enrolled in a bundle",
        description: "Required when self-enroll is off. Select bundle at creation or use Enroll.",
        href: "/admin/students",
      },
      {
        id: "live-class",
        title: "Live class scheduled",
        description: "Pick subject and host teacher. Zoom auto-creates join link when configured.",
        href: "/admin/live-classes",
        optional: true,
      },
    ],
  },
  {
    id: "verify",
    title: "6. Verify student experience",
    items: [
      {
        id: "student-login",
        title: "Student login and dashboard tested",
        description: "Password change flow, enrolled courses, and topic access.",
      },
      {
        id: "doubt-flow",
        title: "Ask Teacher flow tested",
        description: "Student submits a doubt; teacher or admin replies from /admin/doubts.",
        href: "/admin/doubts",
        optional: true,
      },
    ],
  },
];

export type SuperAdminChecklistAutoState = {
  hasTenant: boolean;
  hasActiveTenant: boolean;
  hasInstituteAdmin: boolean;
  hasDefaultBranding: boolean;
};

export type InstituteChecklistAutoState = {
  brandingConfigured: boolean;
  landingConfigured: boolean;
  smtpConfigured: boolean;
  zoomConfigured: boolean;
  hasSubjectCatalog: boolean;
  hasBundle: boolean;
  hasCourseTree: boolean;
  hasTopicContent: boolean;
  hasTopicQuiz: boolean;
  hasTeacher: boolean;
  hasTeacherAssignments: boolean;
  hasStudent: boolean;
  hasLiveClass: boolean;
};

export function isSuperAdminItemAutoComplete(
  itemId: string,
  auto: SuperAdminChecklistAutoState
): boolean {
  switch (itemId) {
    case "tenant-created":
      return auto.hasTenant;
    case "flags-set":
      return auto.hasActiveTenant;
    case "institute-admin":
      return auto.hasInstituteAdmin;
    case "default-branding":
      return auto.hasDefaultBranding;
    default:
      return false;
  }
}

export function isInstituteItemAutoComplete(
  itemId: string,
  auto: InstituteChecklistAutoState
): boolean {
  switch (itemId) {
    case "branding":
      return auto.brandingConfigured;
    case "landing":
      return auto.landingConfigured;
    case "smtp":
      return auto.smtpConfigured;
    case "zoom":
      return auto.zoomConfigured;
    case "subject-catalog":
      return auto.hasSubjectCatalog;
    case "bundle":
      return auto.hasBundle;
    case "course-tree":
      return auto.hasCourseTree;
    case "topic-content":
      return auto.hasTopicContent;
    case "topic-quiz":
      return auto.hasTopicQuiz;
    case "teacher":
      return auto.hasTeacher;
    case "teacher-subjects":
      return auto.hasTeacherAssignments;
    case "student":
      return auto.hasStudent;
    case "live-class":
      return auto.hasLiveClass;
    default:
      return false;
  }
}

export async function fetchSuperAdminChecklistAuto(): Promise<SuperAdminChecklistAutoState> {
  const tenants = await superAdminApi.listTenants().catch(() => []);

  if (tenants.length === 0) {
    return {
      hasTenant: false,
      hasActiveTenant: false,
      hasInstituteAdmin: false,
      hasDefaultBranding: false,
    };
  }

  const [adminLists, brandingList] = await Promise.all([
    Promise.all(tenants.map((t) => superAdminApi.listInstituteAdmins(t.id).catch(() => []))),
    Promise.all(tenants.map((t) => superAdminApi.getTenantBranding(t.id).catch(() => null))),
  ]);

  return {
    hasTenant: true,
    hasActiveTenant: tenants.some((t) => t.status === "Active"),
    hasInstituteAdmin: adminLists.some((admins) => admins.length > 0),
    hasDefaultBranding: brandingList.some(
      (b) => b && Boolean(b.displayName?.trim() || b.logoUrl)
    ),
  };
}

export async function fetchInstituteChecklistAuto(): Promise<InstituteChecklistAutoState> {
  const [branding, landing, email, zoom, catalog, bundles, teachers, assignments, students, liveClasses] =
    await Promise.all([
      adminApi.getBranding().catch(() => null),
      adminApi.getLanding().catch(() => null),
      adminApi.getEmailSettings().catch(() => null),
      adminApi.zoomStatus().catch(() => ({ configured: false })),
      adminApi.listSubjectDefinitions().catch(() => []),
      coursesApi.bundles().catch(() => []),
      adminApi.listTeachers({ page: 1, pageSize: 1 }).catch(() => ({ total: 0, data: [] })),
      adminApi.listSubjectTeachers().catch(() => []),
      adminApi.listStudents({ page: 1, pageSize: 1 }).catch(() => ({ total: 0, data: [] })),
      adminApi.listLiveClasses({ page: 1, pageSize: 1 }).catch(() => ({ total: 0, data: [] })),
    ]);

  let hasTopics = false;
  let hasTopicContent = false;
  let hasTopicQuiz = false;

  const bundleWithSubjects = bundles.find((b) => b.subjectCount > 0) ?? bundles[0];
  if (bundleWithSubjects) {
    const detail = await coursesApi.bundle(bundleWithSubjects.id).catch(() => null);
    const subject = detail?.subjects[0];
    if (subject) {
      const units = await coursesApi.units(subject.id).catch(() => []);
      const unit = units[0];
      if (unit) {
        const topics = await coursesApi.topics(unit.id).catch(() => []);
        hasTopics = topics.length > 0;
        hasTopicContent = topics.some(
          (t) => t.hasVideo || t.mcqCount > 0 || t.flashcardCount > 0
        );
        hasTopicQuiz = topics.some((t) => t.mcqCount > 0);
      }
    }
  }

  return {
    brandingConfigured: Boolean(branding?.displayName?.trim()),
    landingConfigured: (landing?.sections?.length ?? 0) > 0,
    smtpConfigured: Boolean(email?.enabled && email?.smtpHost?.trim()),
    zoomConfigured: zoom.configured,
    hasSubjectCatalog: catalog.length > 0,
    hasBundle: bundles.length > 0,
    hasCourseTree: bundles.some((b) => b.subjectCount > 0) && hasTopics,
    hasTopicContent,
    hasTopicQuiz,
    hasTeacher: teachers.total > 0,
    hasTeacherAssignments: assignments.some(
      (a) => a.subjectIds.length > 0 || (a.subjectDefinitionIds?.length ?? 0) > 0
    ),
    hasStudent: students.total > 0,
    hasLiveClass: liveClasses.total > 0,
  };
}

export function loadManualChecks(storageKey: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function saveManualChecks(storageKey: string, next: Record<string, boolean>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
