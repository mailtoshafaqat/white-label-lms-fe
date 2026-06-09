import { API_BASE_URL } from "@/lib/api";

/** Turn API-relative file paths into absolute URLs for img/src/href. */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}
