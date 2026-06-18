import { API_BASE_URL } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import { persistTenantSlug, resolveTenantSlug } from "@/lib/tenant";

export type BrandingDto = {
  slug: string;
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  supportEmail: string | null;
  mentorDisplayName: string;
  syllabusMentorEnabled: boolean;
  bundlePriceEditEnabled: boolean;
  mcqBulkImportEnabled: boolean;
  allowStudentSelfEnroll: boolean;
};

export function mentorLabel(b: BrandingDto | null): string {
  if (!b) return "Syllabus Mentor";
  return b.mentorDisplayName || `${b.displayName} Mentor`;
}

const DEFAULT_SLUG = "demo";

export function getTenantSlug(): string {
  if (typeof window === "undefined") return DEFAULT_SLUG;
  return resolveTenantSlug();
}

export function setTenantSlug(slug: string) {
  persistTenantSlug(slug);
}

import { applyThemeVars, normalizeHex } from "@/lib/theme";

export function applyBranding(b: BrandingDto) {
  if (typeof document === "undefined") return;
  applyThemeVars(normalizeHex(b.primaryColor));

  const faviconHref = resolveAssetUrl(b.faviconUrl);
  if (faviconHref) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconHref;
  }
}

export async function fetchBranding(slug: string): Promise<BrandingDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/branding/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as BrandingDto;
  } catch {
    return null;
  }
}

export type BrandingFormInput = {
  displayName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  supportEmail: string;
  mentorDisplayName: string;
};

export function brandingFromForm(
  form: BrandingFormInput,
  saved: BrandingDto | null,
  slug?: string,
): BrandingDto {
  const s = slug ?? saved?.slug ?? getTenantSlug();
  return {
    slug: s,
    displayName: form.displayName.trim() || saved?.displayName || "Your Academy",
    logoUrl: form.logoUrl || null,
    faviconUrl: form.faviconUrl || null,
    primaryColor: form.primaryColor,
    supportEmail: form.supportEmail || null,
    mentorDisplayName: form.mentorDisplayName || "",
    syllabusMentorEnabled: saved?.syllabusMentorEnabled ?? true,
    bundlePriceEditEnabled: saved?.bundlePriceEditEnabled ?? true,
    mcqBulkImportEnabled: saved?.mcqBulkImportEnabled ?? true,
    allowStudentSelfEnroll: saved?.allowStudentSelfEnroll ?? false,
  };
}

export async function loadAndApplyBranding(
  slug?: string,
  options?: { useDraftPreview?: boolean },
): Promise<BrandingDto | null> {
  const s = slug ?? getTenantSlug();

  if (options?.useDraftPreview && typeof window !== "undefined") {
    const { loadBrandingPreview } = await import("@/lib/preview-session");
    const draft = loadBrandingPreview(s);
    if (draft) {
      applyBranding(draft);
      return draft;
    }
  }

  const b = await fetchBranding(s);
  if (b) applyBranding(b);
  return b;
}
