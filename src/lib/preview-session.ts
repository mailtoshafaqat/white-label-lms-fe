import type { BrandingDto } from "@/lib/branding";
import type { LandingPageDto } from "@/lib/landing";

const BRANDING_KEY = "lms.preview.branding";
const LANDING_KEY = "lms.preview.landing";
const TTL_MS = 30 * 60 * 1000;

type Stored<T> = {
  slug: string;
  data: T;
  expiresAt: number;
};

function readStored<T>(key: string, slug: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored<T>;
    if (parsed.slug !== slug || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeStored<T>(key: string, slug: string, data: T) {
  if (typeof window === "undefined") return;
  const payload: Stored<T> = {
    slug,
    data,
    expiresAt: Date.now() + TTL_MS,
  };
  sessionStorage.setItem(key, JSON.stringify(payload));
}

export function isBrandingPreview(searchParams: URLSearchParams | null): boolean {
  return searchParams?.get("brandingPreview") === "1";
}

export function isLandingPreview(searchParams: URLSearchParams | null): boolean {
  return searchParams?.get("landingPreview") === "1";
}

export function saveBrandingPreview(slug: string, branding: BrandingDto) {
  writeStored(BRANDING_KEY, slug, branding);
}

export function clearBrandingPreview() {
  if (typeof window !== "undefined") sessionStorage.removeItem(BRANDING_KEY);
}

export function loadBrandingPreview(slug: string): BrandingDto | null {
  return readStored<BrandingDto>(BRANDING_KEY, slug);
}

export function saveLandingPreview(slug: string, landing: LandingPageDto) {
  writeStored(LANDING_KEY, slug, landing);
}

export function clearLandingPreview() {
  if (typeof window !== "undefined") sessionStorage.removeItem(LANDING_KEY);
}

export function loadLandingPreview(slug: string): LandingPageDto | null {
  return readStored<LandingPageDto>(LANDING_KEY, slug);
}

export function previewUrl(
  path: "/" | "/login",
  slug: string,
  options: { branding?: boolean; landing?: boolean },
): string {
  const params = new URLSearchParams({ tenant: slug });
  if (options.branding) params.set("brandingPreview", "1");
  if (options.landing) params.set("landingPreview", "1");
  return `${path}?${params.toString()}`;
}

export function openPreview(
  path: "/" | "/login",
  slug: string,
  options: { branding?: boolean; landing?: boolean },
) {
  window.open(previewUrl(path, slug, options), "_blank", "noopener,noreferrer");
}
