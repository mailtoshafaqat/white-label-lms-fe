"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  text: string;
  className?: string;
  variant?: "light" | "dark";
  side?: "top" | "bottom";
};

export function InfoTooltip({
  text,
  className,
  variant = "light",
  side = "top",
}: InfoTooltipProps) {
  const dark = variant === "dark";

  return (
    <span className={cn("group relative inline-flex align-middle", className)}>
      <span
        tabIndex={0}
        className={cn(
          "inline-flex cursor-help rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
          dark ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
        )}
        aria-label={text}
      >
        <Info className="h-4 w-4" aria-hidden />
      </span>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-64 -translate-x-1/2 rounded-md border px-3 py-2 text-left text-xs leading-relaxed shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          dark
            ? "border-white/15 bg-slate-900 text-slate-200"
            : "border-slate-200 bg-white text-slate-700"
        )}
      >
        {text}
      </span>
    </span>
  );
}

type TooltipWrapProps = {
  label: string;
  children: React.ReactNode;
  variant?: "light" | "dark";
  side?: "top" | "bottom";
};

/** Wraps a control so hover shows a short explanatory tooltip. */
export function TooltipWrap({
  label,
  children,
  variant = "light",
  side = "top",
}: TooltipWrapProps) {
  const dark = variant === "dark";

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-left text-xs leading-relaxed shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          dark
            ? "border-white/15 bg-slate-900 text-slate-200"
            : "border-slate-200 bg-white text-slate-700"
        )}
      >
        {label}
      </span>
    </span>
  );
}
