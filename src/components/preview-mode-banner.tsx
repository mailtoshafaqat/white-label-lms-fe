"use client";

import Link from "next/link";
import { Eye, X } from "lucide-react";

type Props = {
  branding?: boolean;
  landing?: boolean;
  editorHref?: string;
};

export function PreviewModeBanner({ branding, landing, editorHref }: Props) {
  const label =
    branding && landing
      ? "Branding and landing preview"
      : branding
        ? "Branding preview"
        : landing
          ? "Landing page preview"
          : "Preview mode";

  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-sm text-amber-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 font-medium">
          <Eye className="h-4 w-4" />
          {label} — not published yet
        </span>
        {editorHref && (
          <Link href={editorHref} className="font-medium underline hover:no-underline">
            Back to editor
          </Link>
        )}
        <button
          type="button"
          className="inline-flex items-center gap-1 font-medium hover:underline"
          onClick={() => window.close()}
        >
          <X className="h-3.5 w-3.5" />
          Close tab
        </button>
      </div>
    </div>
  );
}
