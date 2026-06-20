import type { ProductProfile } from "@/lib/product-profile";

export type AdminHelpLink = { href: string; label: string };

export type AdminHelpSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  links?: AdminHelpLink[];
  /** Omit = all profiles. */
  profiles?: ProductProfile[];
  /** Institute admin only (payments, enrollment policy, etc.). */
  instituteOnly?: boolean;
};

function bundleWord(profile: ProductProfile): string {
  if (profile === "GeneralLms") return "course";
  if (profile === "Both") return "batch or course";
  return "batch";
}

function bundleWordPlural(profile: ProductProfile): string {
  if (profile === "GeneralLms") return "courses";
  if (profile === "Both") return "batches or courses";
  return "batches";
}

export function getAdminHelpSections(profile: ProductProfile): AdminHelpSection[] {
  const bundle = bundleWord(profile);
  const bundles = bundleWordPlural(profile);
  const Bundle = bundle.charAt(0).toUpperCase() + bundle.slice(1);

  const sections: AdminHelpSection[] = [
    {
      id: "overview",
      title: "How this LMS is organized",
      paragraphs: [
        profile === "GeneralLms"
          ? "Your institute runs in General LMS mode: sell or assign courses, deliver videos and quizzes, and track progress."
          : profile === "Both"
            ? "Your institute supports exam-prep batches and general courses on the same platform. Labels change by offering type; the engine is shared."
            : "Your institute runs in exam-prep mode: batches (intakes), subject catalog, MCQs, mock exams, and batch caps match academy workflows.",
        "Most day-to-day work follows this order: configure the institute → build content → set batch/course rules → enroll students → take payments (if paid).",
      ],
      links: [
        { href: "/admin/checklist", label: "Setup checklist" },
        { href: "/admin/setup", label: "Setup wizard" },
      ],
    },
    {
      id: "content",
      title: "Content structure",
      paragraphs: [
        `Tree: ${Bundle} → subject (from catalog) → unit → topic. Topics hold lectures, notes, MCQs, and flashcards.`,
        profile === "GeneralLms"
          ? "Example: course “Web Development 101” → subject “Module 1” → unit “HTML Basics” → topic “Tags & attributes”."
          : profile === "Both"
            ? "Example: batch “MDCAT July 2026” or course “Web Dev 101” → Physics or Module 1 → units → topics."
            : "Example: batch “ECAT Crash Course” → Physics → Unit 1 → topic with video + MCQs.",
      ],
      bullets: [
        "Define subjects once in Subject catalog, then pick them when building content.",
        "Use SHARED units in the catalog to reuse the same unit across multiple batches/courses.",
        "Teachers only see subjects assigned at Teachers — scope them before handing out CMS access.",
      ],
      links: [
        { href: "/admin/subjects", label: "Subject catalog" },
        { href: "/admin", label: "Content (CMS)" },
      ],
    },
    {
      id: "batch-settings",
      title: `${Bundle.charAt(0).toUpperCase() + bundle.slice(1)} settings (seats & dates)`,
      paragraphs: [
        profile === "GeneralLms"
          ? `On the Content page, expand a course and open Course settings.`
          : `On the Content page, expand a ${bundle} and open ${Bundle} settings.`,
        "These controls apply per offering — not tenant-wide. Each intake or course can have its own cap and calendar.",
      ],
      bullets: [
        `Max enrollments — seat cap for this ${bundle}. Blank = unlimited.`,
        "Enrollment opens / closes — when students can self-enroll or checkout. Leave blank for always open (until full or ended).",
        "Content starts — when enrolled students can open lectures, quizzes, and flashcards. Admins and teachers are not blocked.",
        `${Bundle} ends — when the run ends; new enrollments stop and student expiry is capped to this date.`,
        "Admin enroll (Students page or Payments) always bypasses seat cap and enrollment window.",
      ],
      links: [{ href: "/admin", label: `Content — edit ${bundle} settings` }],
    },
    {
      id: "mid-cycle",
      title: profile === "GeneralLms" ? "Adding students after a course started" : "Joining mid-intake or migrating students",
      paragraphs: [
        `If the LMS goes live after a ${bundle} already started, use the same ${bundle} — do not split unless it is a new admission cycle.`,
        "Set Content starts to the past (or leave blank) so existing students get access immediately. Set enrollment dates to match real admissions.",
      ],
      bullets: [
        `Provision existing students via Admin → Students (create or Enroll in ${bundle}).`,
        "New admission cycle (e.g. January vs July intake) → create a new batch/course with fresh cap and dates.",
        "Illogical date order is allowed on save; fix warnings if students see the wrong Open / Closed status.",
      ],
      links: [{ href: "/admin/students", label: "Students" }],
      instituteOnly: true,
    },
    {
      id: "students",
      title: "Students & enrollment",
      paragraphs: [
        "Students are created by admins (no public signup unless you enable it). Welcome email includes login details when SMTP is configured.",
      ],
      bullets: [
        `Create student — pick a ${bundle} to enroll immediately (admin bypass).`,
        "Existing student — expand row → Enroll in course/batch, or extend expiry.",
        "Self-enroll — controlled under Settings → Enrollment and payment modes.",
        `Student dashboard shows Buy now only when the ${bundle} is Open, not full, and within the enrollment window.`,
      ],
      links: [
        { href: "/admin/students", label: "Students" },
        { href: "/admin/settings/enrollment", label: "Enrollment settings" },
      ],
      instituteOnly: true,
    },
    {
      id: "payments",
      title: "Payments",
      paragraphs: [
        "Configure which checkout paths are allowed: free self-enroll, manual payment (student uploads proof), and online gateways (JazzCash, Easypaisa, Stripe).",
        "Approve manual payments or record offline cash/bank payments to enroll immediately.",
      ],
      bullets: [
        `${Bundle} must be Open for student checkout — cap and enrollment window are enforced before payment.`,
        "Sandbox flags in appsettings are for development; production uses live gateway credentials.",
      ],
      links: [
        { href: "/admin/settings/payments", label: "Payment settings" },
        { href: "/admin/payments", label: "Payment inbox" },
      ],
      instituteOnly: true,
    },
    {
      id: "settings",
      title: "Institute settings",
      paragraphs: ["Branding, landing page, email, Zoom, enrollment policy, and payments live under Settings."],
      bullets: [
        "Branding — logo, colours, display name; applies to login and student dashboard.",
        "Landing page — public homepage sections for marketing.",
        "Email — SMTP for welcome mail and notifications; without SMTP, dev copies save to backend/dev-emails/.",
        "Zoom — optional; you can paste a manual join URL per live class instead.",
        profile === "GeneralLms"
          ? "Live classes — available under Admin → Live classes when enabled for your institute (typical for online schools)."
          : "Live classes — schedule under Admin → Live classes (Zoom or manual link).",
      ],
      links: [{ href: "/admin/settings", label: "All settings" }],
      instituteOnly: true,
    },
    {
      id: "academy",
      title: "Academy features (exam prep)",
      profiles: ["ExamPrep", "Both"],
      paragraphs: [
        "Mock exams, doubts, and unit PYQ tests are aimed at test-prep institutes — hidden for General LMS-only tenants.",
      ],
      bullets: [
        "Mock exams — publish per batch; students see them when enrolled and published.",
        "Doubts — in-app Q&A; teachers see assigned subjects only.",
      ],
      links: [
        { href: "/admin/mock-exams", label: "Mock exams" },
        { href: "/admin/doubts", label: "Doubts" },
      ],
    },
    {
      id: "live-classes",
      title: "Live classes",
      profiles: ["GeneralLms"],
      paragraphs: [
        "Schedule Zoom or manual-link sessions for enrolled students. Typical for online schools and cohort-based courses.",
      ],
      bullets: [
        "Admin → Live classes — create a session, pick subject, set time, share join link.",
        "Students see upcoming sessions on their dashboard.",
        "Optional: attach a recording URL to a topic after the class.",
        "Requires Live classes enabled on your tenant (SuperAdmin can turn off).",
      ],
      links: [
        { href: "/admin/live-classes", label: "Live classes" },
        { href: "/admin/settings/zoom", label: "Zoom settings" },
      ],
    },
    {
      id: "roadmap",
      title: "Coming later (school module)",
      paragraphs: [
        "Phase 3 will add school-specific pieces on top of batches/courses — not replace them: academic terms, sections, timetable, gradebook, and parent portal.",
        `Until then, online schools can use ${bundles} as class offerings with the same seat and date engine you use today.`,
      ],
    },
  ];

  return sections.filter((s) => !s.profiles || s.profiles.includes(profile));
}

export function getAdminHelpIntro(profile: ProductProfile): string {
  if (profile === "GeneralLms") {
    return "Configuration guide for General LMS — courses, enrollment, payments, and content.";
  }
  if (profile === "Both") {
    return "Configuration guide for institutes running exam-prep batches and general courses.";
  }
  return "Configuration guide for exam-prep academies — batches, caps, enrollment windows, and content.";
}
