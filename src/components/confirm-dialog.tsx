"use client";

import { useEffect, useId } from "react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "dark" | "light";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  variant = "light",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const dark = variant === "dark";

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const panel = dark
    ? "rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl shadow-black/40"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-xl";
  const titleCls = dark ? "text-lg font-semibold text-white" : "text-lg font-semibold text-slate-900";
  const descCls = dark ? "mt-2 text-sm text-slate-300" : "mt-2 text-sm text-slate-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`relative w-full max-w-md ${panel}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={titleCls}>
          {title}
        </h2>
        <p id={descId} className={descCls}>
          {description}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className={
              dark
                ? "border-white/25 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={loading}
            className={dark ? "bg-indigo-500 text-white hover:bg-indigo-400" : undefined}
            onClick={onConfirm}
          >
            {loading ? "Please wait…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
