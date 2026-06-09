import { API_BASE_URL } from "@/lib/api";

export type PageSectionDto = {
  id: string | null;
  sectionType: string;
  sortOrder: number;
  contentJson: string;
  isEnabled: boolean;
};

export type LandingPageDto = {
  slug: string;
  sections: PageSectionDto[];
};

export type HeroContent = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl?: string | null;
};

export type FeatureCard = {
  title: string;
  description: string;
  icon?: string;
};

export type FeaturesContent = {
  cards: FeatureCard[];
};

export type FooterContent = {
  text: string;
  supportEmail?: string | null;
};

export type TestimonialItem = {
  name: string;
  role: string;
  quote: string;
  avatarUrl?: string | null;
};

export type TestimonialsContent = {
  title?: string;
  items: TestimonialItem[];
};

export type CoursesShowcaseContent = {
  title: string;
  subtitle?: string;
};

export type StatItem = {
  label: string;
  value: string;
};

export type StatsContent = {
  title?: string;
  items: StatItem[];
};

export const LandingSectionTypes = {
  Hero: "Hero",
  Features: "Features",
  Footer: "Footer",
  Testimonials: "Testimonials",
  CoursesShowcase: "CoursesShowcase",
  Stats: "Stats",
} as const;

export type LandingSectionType = (typeof LandingSectionTypes)[keyof typeof LandingSectionTypes];

export const ALL_LANDING_SECTION_TYPES: LandingSectionType[] = [
  LandingSectionTypes.Hero,
  LandingSectionTypes.Features,
  LandingSectionTypes.Testimonials,
  LandingSectionTypes.CoursesShowcase,
  LandingSectionTypes.Stats,
  LandingSectionTypes.Footer,
];

export function defaultSectionContent(type: LandingSectionType): string {
  switch (type) {
    case LandingSectionTypes.Hero:
      return JSON.stringify({
        title: "Your academy",
        subtitle: "",
        ctaLabel: "Log in",
        ctaHref: "/login",
      } satisfies HeroContent);
    case LandingSectionTypes.Features:
      return JSON.stringify({ cards: [] } satisfies FeaturesContent);
    case LandingSectionTypes.Testimonials:
      return JSON.stringify({
        title: "What students say",
        items: [{ name: "Student", role: "Class of 2025", quote: "Great learning experience!" }],
      } satisfies TestimonialsContent);
    case LandingSectionTypes.CoursesShowcase:
      return JSON.stringify({
        title: "Our courses",
        subtitle: "Explore what we offer",
      } satisfies CoursesShowcaseContent);
    case LandingSectionTypes.Stats:
      return JSON.stringify({
        title: "By the numbers",
        items: [
          { label: "Students", value: "1,000+" },
          { label: "Courses", value: "10+" },
        ],
      } satisfies StatsContent);
    case LandingSectionTypes.Footer:
      return JSON.stringify({ text: "" } satisfies FooterContent);
    default:
      return "{}";
  }
}

export async function fetchPublicLanding(slug: string): Promise<LandingPageDto | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/public/landing/${encodeURIComponent(slug)}`
    );
    if (!res.ok) return null;
    return (await res.json()) as LandingPageDto;
  } catch {
    return null;
  }
}

export function parseSection<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
