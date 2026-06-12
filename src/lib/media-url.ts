import { API_BASE_URL } from "@/lib/api";
import { getSession } from "@/lib/auth";

/** Storage-backed lecture/note files require a logged-in user. */
export function isProtectedStoragePath(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    normalized.includes("/api/v1/files/lectures/") ||
    normalized.includes("/api/v1/files/notes/") ||
    normalized.startsWith("lectures/") ||
    normalized.startsWith("notes/")
  );
}

export function absoluteMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Appends a short-lived JWT query param so &lt;video&gt; and download links can reach protected files. */
export function authenticatedMediaUrl(path: string | null | undefined): string | undefined {
  const full = absoluteMediaUrl(path);
  if (!full) return undefined;
  if (!isProtectedStoragePath(full)) return full;

  const token = getSession()?.accessToken;
  if (!token) return full;

  const sep = full.includes("?") ? "&" : "?";
  return `${full}${sep}access_token=${encodeURIComponent(token)}`;
}
