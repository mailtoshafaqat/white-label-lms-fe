"use client";

import { HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/format-bytes";
import type { TenantStorageUsageDto } from "@/lib/api";

type Props = {
  usage: TenantStorageUsageDto;
  compact?: boolean;
};

export function StorageUsageCard({ usage, compact }: Props) {
  const pct = Math.min(100, usage.usedPercent);
  const barColor =
    usage.warningLevel === "Blocked" || usage.warningLevel === "Full"
      ? "bg-red-500"
      : usage.warningLevel === "Warning"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const label = `Storage: ${formatBytes(usage.usedBytes)} / ${formatBytes(usage.quotaBytes)}`;

  if (compact) {
    return (
      <span className="text-sm text-slate-400">
        {label}
        {usage.quotaBypassEnabled && (
          <span className="ml-2 rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-200">
            bypass
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        usage.warningLevel === "Blocked" || usage.warningLevel === "Full"
          ? "border-red-200 bg-red-50"
          : usage.warningLevel === "Warning"
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <HardDrive
          className={`mt-0.5 h-5 w-5 shrink-0 ${
            usage.warningLevel === "Warning"
              ? "text-amber-600"
              : usage.warningLevel === "Blocked" || usage.warningLevel === "Full"
                ? "text-red-600"
                : "text-slate-500"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {usage.plan} plan · {pct}% used
            {usage.quotaBypassEnabled && " · quota bypass enabled"}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          {usage.warningLevel === "Warning" && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              You are nearing your storage limit. Delete old files or contact your platform provider to
              upgrade.
            </p>
          )}
          {(usage.warningLevel === "Full" || usage.warningLevel === "Blocked") && !usage.quotaBypassEnabled && (
            <p className="mt-2 text-xs font-medium text-red-800">
              Storage limit reached. Uploads are blocked until you free space or upgrade.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
