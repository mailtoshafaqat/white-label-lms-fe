const SLUG_KEY = "lms.tenantSlug";
const DEFAULT_SLUG = "demo";

/** Read tenant slug from cookie (set by Next.js middleware). */
export function getTenantSlugFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SLUG_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Resolve slug: query param → cookie → localStorage → default. */
export function resolveTenantSlug(searchParams?: URLSearchParams | null): string {
  if (typeof window === "undefined") return DEFAULT_SLUG;

  const fromQuery = searchParams?.get("tenant");
  if (fromQuery) return fromQuery.toLowerCase();

  const fromCookie = getTenantSlugFromCookie();
  const fromStorage = localStorage.getItem(SLUG_KEY);

  // Prefer a remembered institute slug over the middleware demo default cookie.
  if (fromCookie && fromCookie !== DEFAULT_SLUG) return fromCookie;
  if (fromStorage) return fromStorage;
  if (fromCookie) return fromCookie;

  return DEFAULT_SLUG;
}

export function persistTenantSlug(slug: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SLUG_KEY, slug);
  document.cookie = `${SLUG_KEY}=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`;
}
