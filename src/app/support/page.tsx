"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Copy, RefreshCw, Search } from "lucide-react";
import { InfoTooltip, TooltipWrap } from "@/components/info-tooltip";
import { PlatformShell } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supportApi, type RequestIncidentDto } from "@/lib/api";
import { getSession, isPlatformStaff } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, rangeLabel } from "@/lib/paged-list";

function buildDeveloperReport(row: RequestIncidentDto): string {
  const lines = [
    `Trace id: ${row.traceId}`,
    `Time (UTC): ${new Date(row.createdAt).toISOString()}`,
    `Status: ${row.statusCode}`,
    `Request: ${row.method} ${row.path}`,
    `Institute: ${row.tenantSlug ?? "—"}`,
    `User: ${row.userEmail ?? "—"}`,
    `Error: ${row.errorMessage ?? "—"}`,
  ];
  if (row.exceptionType) lines.push(`Exception: ${row.exceptionType}`);
  if (row.exceptionDetail) {
    lines.push("", "Technical detail:", row.exceptionDetail);
  }
  return lines.join("\n");
}

export default function SupportPage() {
  const router = useRouter();
  const [traceId, setTraceId] = useState("");
  const [activeTraceId, setActiveTraceId] = useState("");
  const [rows, setRows] = useState<RequestIncidentDto[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(
    async (query: string, nextPage: number, nextPageSize: number) => {
      setLoading(true);
      setError(null);
      setExpandedId(null);
      try {
        const result = await supportApi.searchIncidents({
          traceId: query || undefined,
          page: nextPage,
          pageSize: nextPageSize,
        });
        setRows(result.data);
        setTotal(result.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const session = getSession();
    if (!isPlatformStaff(session)) {
      router.replace("/login/platform");
    }
  }, [router]);

  useEffect(() => {
    const session = getSession();
    if (!isPlatformStaff(session)) return;
    void load(activeTraceId, page, pageSize);
  }, [activeTraceId, page, pageSize, load]);

  function runSearch(query: string) {
    setActiveTraceId(query.trim());
    setPage(1);
  }

  async function copyReport(row: RequestIncidentDto) {
    await navigator.clipboard.writeText(buildDeveloperReport(row));
    setCopiedId(row.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PlatformShell
      title="Error incidents"
      subtitle="Look up API failures by trace id. Expand a row for technical detail to forward to developers."
    >
      <Card className="border-white/10 bg-white/5 text-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            Search by trace id
            <InfoTooltip
              variant="dark"
              text="Enter the trace id from an error message (shown as ref: …). Partial ids work. Leave empty and click Refresh to browse the newest failures."
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(traceId);
            }}
          >
            <input
              value={traceId}
              onChange={(e) => setTraceId(e.target.value)}
              placeholder="00-abc… or partial id"
              title="Trace id from the error screen or API response header X-Trace-Id"
              className="flex-1 rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            />
            <TooltipWrap
              variant="dark"
              label="Filter the list to incidents matching this trace id. Only the current page is fetched from the server."
            >
              <Button type="submit" disabled={loading} className="bg-indigo-500 text-white hover:bg-indigo-400">
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Searching…" : "Search"}
              </Button>
            </TooltipWrap>
            <TooltipWrap
              variant="dark"
              label="Clear the trace filter and reload the newest incidents from the server."
            >
              <Button
                type="button"
                variant="outline"
                className="border-white/25 bg-slate-800/90 text-slate-100 hover:bg-slate-700 hover:text-white"
                disabled={loading}
                onClick={() => {
                  setTraceId("");
                  runSearch("");
                }}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </TooltipWrap>
          </form>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <span className="flex items-center gap-2">
          {rangeLabel(page, pageSize, total)}
          {total > 0 && (
            <span className="text-slate-500">
              · Page {page} of {totalPages}
            </span>
          )}
          <InfoTooltip
            variant="dark"
            side="bottom"
            text="Results are paginated. Only one page loads at a time so large histories stay fast. Use Previous and Next to browse older incidents."
          />
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">Per page</span>
            <InfoTooltip
              variant="dark"
              side="bottom"
              text="Number of incidents loaded per request. Higher values mean fewer page clicks but slightly slower loads."
            />
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              title="Choose how many incidents to load per page"
              className="h-9 rounded-md border border-white/15 bg-slate-900 px-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page <= 1 || total === 0}
            className="border-white/25 bg-slate-800/90 text-slate-100 hover:bg-slate-700 hover:text-white"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages || total === 0}
            className="border-white/25 bg-slate-800/90 text-slate-100 hover:bg-slate-700 hover:text-white"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="scrollbar-slim-dark mt-3 overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3">Time (UTC)</th>
              <th className="px-4 py-3">Trace id</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Institute</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Error</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  {loading ? "Loading…" : "No incidents found."}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const expanded = expandedId === row.id;
              const hasDetail = !!(row.exceptionDetail || row.exceptionType);
              return (
                <Fragment key={row.id}>
                  <tr
                    className={`border-t border-white/10 ${hasDetail ? "cursor-pointer hover:bg-white/5" : ""}`}
                    title={
                      hasDetail
                        ? "Click the row to expand stack trace and exception details"
                        : undefined
                    }
                    onClick={() => hasDetail && setExpandedId(expanded ? null : row.id)}
                  >
                    <td className="px-4 py-3 text-slate-500">{hasDetail ? (expanded ? "▼" : "▶") : ""}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                      {new Date(row.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-xs text-indigo-200">
                      {row.traceId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          row.statusCode >= 500
                            ? "bg-red-500/20 text-red-300"
                            : "bg-amber-500/20 text-amber-200"
                        }`}
                      >
                        {row.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.method} {row.path}
                    </td>
                    <td className="px-4 py-3">{row.tenantSlug ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{row.userEmail ?? "—"}</td>
                    <td className="max-w-md px-4 py-3 text-xs text-slate-300">
                      {row.errorMessage ?? row.exceptionType ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <TooltipWrap
                        variant="dark"
                        label={
                          copiedId === row.id
                            ? "Copied to clipboard"
                            : "Copy trace id, request info, and stack trace for developers"
                        }
                      >
                        <button
                          type="button"
                          aria-label={
                            copiedId === row.id
                              ? "Copied to clipboard"
                              : "Copy incident report for developers"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            void copyReport(row);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 text-slate-200 hover:bg-white/10"
                        >
                          {copiedId === row.id ? (
                            <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                          ) : (
                            <Copy className="h-4 w-4" aria-hidden />
                          )}
                        </button>
                      </TooltipWrap>
                    </td>
                  </tr>
                  {expanded && hasDetail && (
                    <tr className="border-t border-white/5 bg-black/20">
                      <td colSpan={9} className="px-4 py-4">
                        {row.exceptionType && (
                          <p className="mb-2 text-xs font-medium text-amber-200">
                            Exception type: {row.exceptionType}
                          </p>
                        )}
                        {row.exceptionDetail ? (
                          <pre className="scrollbar-slim-dark max-h-64 overflow-auto rounded-md border border-white/10 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                            {row.exceptionDetail}
                          </pre>
                        ) : (
                          <p className="text-xs text-slate-400">
                            No stack trace stored (client or validation error).
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </PlatformShell>
  );
}
