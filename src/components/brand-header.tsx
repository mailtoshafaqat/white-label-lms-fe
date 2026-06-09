"use client";

import { GraduationCap } from "lucide-react";
import type { BrandingDto } from "@/lib/branding";
import { resolveAssetUrl } from "@/lib/assets";

export function BrandHeader({ branding }: { branding: BrandingDto | null }) {
  const name = branding?.displayName ?? "YourAcademy LMS";
  const logoUrl = resolveAssetUrl(branding?.logoUrl);
  return (
    <div className="mb-2 flex items-center gap-2 font-bold text-[var(--brand)]">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
      ) : (
        <GraduationCap className="h-6 w-6" />
      )}
      <span>{name}</span>
    </div>
  );
}
