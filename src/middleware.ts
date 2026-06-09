import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SLUG_COOKIE = "lms.tenantSlug";
const DEFAULT_SLUG = "demo";
const BASE_HOST = process.env.TENANT_BASE_HOST ?? "localhost";

function slugFromHost(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  const suffix = `.${BASE_HOST}`;
  if (!hostname.endsWith(suffix) || hostname === BASE_HOST) return null;
  const sub = hostname.slice(0, -suffix.length);
  if (!sub || sub === "www" || sub.includes(".")) return null;
  return sub;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const querySlug = request.nextUrl.searchParams.get("tenant");
  const slug = (querySlug ?? slugFromHost(host) ?? DEFAULT_SLUG).toLowerCase();

  const response = NextResponse.next();
  response.cookies.set(SLUG_COOKIE, slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
