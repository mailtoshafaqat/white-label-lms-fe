"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Search } from "lucide-react";
import { PlatformShell } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supportApi, type RequestIncidentDto } from "@/lib/api";
import { getSession, isPlatformStaff } from "@/lib/auth";

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
  const [rows, setRows] = useState<RequestIncidentDto[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!isPlatformStaff(session)) {
      router.replace("/login/platform");
      return;
    }
    void search("");
  }, [router]);

  async function search(query: string) {
    setLoading(true);
    setError(null);
    setExpandedId(null);
    try {
      setRows(await supportApi.searchIncidents(query || undefined, 50));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyReport(row: RequestIncidentDto) {
    await navigator.clipboard.writeText(buildDeveloperReport(row));
    setCopiedId(row.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <PlatformShell
      title="Error incidents"
      subtitle="Look up API failures by trace id. Expand a row for technical detail to forward to developers."
    >
      <Card className="border-white/10 bg-white/5 text-slate-100">
        <CardHeader>
          <CardTitle className="text-lg text-white">Search by trace id</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void search(traceId);
            }}
          >
            <input
              value={traceId}
              onChange={(e) => setTraceId(e.target.value)}
              placeholder="00-abc… or partial id"
              className="flex-1 rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            />
            <Button type="submit" disabled={loading} className="bg-indigo-500 text-white hover:bg-indigo-400">
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Searching…" : "Search"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 text-slate-200 hover:bg-white/10"
              disabled={loading}
              onClick={() => {
                setTraceId("");
                void search("");
              }}
            >
              Recent
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyReport(row);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedId === row.id ? "Copied" : "Copy for dev"}
                      </button>
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
                          <pre className="max-h-64 overflow-auto rounded-md border border-white/10 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
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
