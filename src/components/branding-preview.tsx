"use client";

import { GraduationCap, BookOpen, LogIn } from "lucide-react";
import { resolveAssetUrl } from "@/lib/assets";
import { themeCssVars } from "@/lib/theme";

export type BrandingPreviewProps = {
  displayName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail?: string;
};

export function BrandingPreview({
  displayName,
  logoUrl,
  primaryColor,
  supportEmail,
}: BrandingPreviewProps) {
  const name = displayName.trim() || "Your Institute";
  const logo = resolveAssetUrl(logoUrl || null);
  const vars = themeCssVars(primaryColor) as React.CSSProperties;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview</p>

      {/* Login mockup */}
      <div
        className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 p-4 shadow-sm"
        style={vars}
      >
        <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Login screen
        </p>
        <div className="mx-auto max-w-[220px] rounded-lg border border-slate-200 bg-white p-4 shadow-md">
          <div className="mb-3 flex items-center gap-2 font-bold text-[var(--brand)]">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-7 w-7 rounded object-contain" />
            ) : (
              <GraduationCap className="h-5 w-5" />
            )}
            <span className="truncate text-sm">{name}</span>
          </div>
          <p className="text-xs font-semibold text-slate-800">Log in to your account</p>
          <div className="mt-3 space-y-2">
            <div className="h-7 rounded border border-slate-200 bg-slate-50" />
            <div className="h-7 rounded border border-slate-200 bg-slate-50" />
            <div
              className="flex h-8 items-center justify-center gap-1 rounded-md text-xs font-semibold text-[var(--brand-foreground)]"
              style={{ backgroundColor: "var(--brand)" }}
            >
              <LogIn className="h-3 w-3" />
              Log in
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard header mockup */}
      <div
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        style={vars}
      >
        <p className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Student dashboard header
        </p>
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2 font-bold text-[var(--brand)]">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-6 w-6 rounded object-contain" />
            ) : (
              <GraduationCap className="h-4 w-4" />
            )}
            <span className="truncate text-xs">{name}</span>
          </div>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-[var(--brand-foreground)]"
            style={{ backgroundColor: "var(--brand)" }}
          >
            S
          </div>
        </div>
        <div className="border-t border-slate-100 px-3 py-2">
          <div
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium text-[var(--brand-foreground)]"
            style={{ backgroundColor: "var(--brand)" }}
          >
            <BookOpen className="h-3 w-3" />
            My courses
          </div>
        </div>
      </div>

      {supportEmail ? (
        <p className="text-center text-[10px] text-slate-500">
          Support: {supportEmail}
        </p>
      ) : null}
    </div>
  );
}
