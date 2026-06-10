"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type ChecklistItemDef,
  type ChecklistSection,
  loadManualChecks,
  saveManualChecks,
} from "@/lib/setup-checklists";

type SetupChecklistProps<TAuto> = {
  title: string;
  description: string;
  storageKey: string;
  sections: ChecklistSection[];
  fetchAuto: () => Promise<TAuto>;
  isItemAutoComplete: (itemId: string, auto: TAuto) => boolean;
  variant?: "dark" | "light";
  tips?: { title: string; body: string }[];
};

export function SetupChecklist<TAuto>({
  title,
  description,
  storageKey,
  sections,
  fetchAuto,
  isItemAutoComplete,
  variant = "light",
  tips,
}: SetupChecklistProps<TAuto>) {
  const [auto, setAuto] = useState<TAuto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<string, boolean>>({});

  const dark = variant === "dark";

  useEffect(() => {
    setManual(loadManualChecks(storageKey));
  }, [storageKey]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAuto(await fetchAuto());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load checklist status");
    } finally {
      setLoading(false);
    }
  }, [fetchAuto]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const allItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  function isComplete(item: ChecklistItemDef): boolean {
    if (auto && isItemAutoComplete(item.id, auto)) return true;
    return Boolean(manual[item.id]);
  }

  const completedCount = allItems.filter(isComplete).length;
  const totalCount = allItems.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function toggleManual(id: string) {
    if (auto && isItemAutoComplete(id, auto)) return;
    setManual((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveManualChecks(storageKey, next);
      return next;
    });
  }

  const card = dark
    ? "rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
    : "rounded-2xl border border-slate-200 bg-white p-5";
  const itemCard = dark
    ? "flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
    : "flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const titleCls = dark ? "text-white" : "text-slate-900";
  const linkCls = dark
    ? "text-indigo-300 hover:underline"
    : "text-[var(--brand)] hover:underline";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className={`text-2xl font-bold ${titleCls}`}>{title}</h2>
        <p className={`mt-2 text-sm ${muted}`}>{description}</p>
      </div>

      {error ? (
        <p
          className={
            dark
              ? "rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
              : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          }
        >
          {error}
        </p>
      ) : null}

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-sm font-semibold ${titleCls}`}>
              {loading ? "Checking status…" : `${completedCount} of ${totalCount} complete`}
            </p>
            <p className={`mt-1 text-xs ${muted}`}>
              Green checks update automatically when we detect progress. Tap the circle to mark
              manual steps done.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            className={
              dark
                ? "border-white/25 bg-slate-800/90 text-slate-100 hover:bg-slate-700 hover:text-white"
                : undefined
            }
            onClick={() => void loadStatus()}
          >
            Refresh
          </Button>
        </div>
        <div
          className={`mt-4 h-2 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-slate-200"}`}
        >
          <div
            className={`h-full rounded-full transition-all ${dark ? "bg-indigo-400" : "bg-[var(--brand)]"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.id} className={card}>
          <h3 className={`text-sm font-semibold ${titleCls}`}>{section.title}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {section.items.map((item) => {
              const done = isComplete(item);
              const autoDone = auto ? isItemAutoComplete(item.id, auto) : false;
              return (
                <li key={item.id}>
                  <div className={itemCard}>
                    <button
                      type="button"
                      className="mt-0.5 shrink-0 disabled:cursor-default"
                      disabled={autoDone}
                      onClick={() => toggleManual(item.id)}
                      aria-label={done ? `${item.title} complete` : `Mark ${item.title} complete`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />
                      ) : (
                        <Circle className={`h-5 w-5 ${muted}`} aria-hidden />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${titleCls}`}>
                        {item.title}
                        {item.optional ? (
                          <span className={`ml-2 text-xs font-normal ${muted}`}>(optional)</span>
                        ) : null}
                      </p>
                      <p className={`mt-0.5 text-xs ${muted}`}>{item.description}</p>
                      {autoDone ? (
                        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                          Detected automatically
                        </p>
                      ) : null}
                    </div>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={`flex shrink-0 items-center gap-1 self-start text-xs ${linkCls}`}
                        target={item.href === "/" ? "_blank" : undefined}
                        rel={item.href === "/" ? "noreferrer" : undefined}
                      >
                        Open
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {tips && tips.length > 0 ? (
        <div className={card}>
          <p className={`text-sm font-semibold ${titleCls}`}>Tips</p>
          <ul className={`mt-2 list-disc space-y-2 pl-5 text-xs ${muted}`}>
            {tips.map((tip) => (
              <li key={tip.title}>
                <strong className={titleCls}>{tip.title}</strong> — {tip.body}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
