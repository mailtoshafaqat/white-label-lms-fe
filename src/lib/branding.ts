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
};

const DEFAULT_SLUG = "demo";

export function getTenantSlug(): string {
  if (typeof window === "undefined") return DEFAULT_SLUG;
  return resolveTenantSlug();
}

export function setTenantSlug(slug: string) {
  persistTenantSlug(slug);
}

export function applyBranding(b: BrandingDto) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--brand", b.primaryColor);

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

export async function loadAndApplyBranding(slug?: string): Promise<BrandingDto | null> {
  const s = slug ?? getTenantSlug();
  const b = await fetchBranding(s);
  if (b) applyBranding(b);
  return b;
}
