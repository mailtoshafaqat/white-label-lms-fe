"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Award, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicApi, type CertificateVerifyDto } from "@/lib/api";
import { getTenantSlug, loadAndApplyBranding, type BrandingDto } from "@/lib/branding";
import { BrandHeader } from "@/components/brand-header";

export default function VerifyCertificatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const number = decodeURIComponent(params.number as string);
  const tenant = searchParams.get("tenant") ?? getTenantSlug();

  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [result, setResult] = useState<CertificateVerifyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) void loadAndApplyBranding(tenant).then(setBranding);
    publicApi
      .verifyCertificate(number, tenant)
      .then(setResult)
      .catch((e) => setError(e instanceof Error ? e.message : "Verification failed"))
      .finally(() => setLoading(false));
  }, [number, tenant]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-white to-slate-50">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <BrandHeader branding={branding} />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Award className="h-6 w-6 text-[var(--brand)]" />
          Certificate verification
        </h1>
        <p className="mt-1 font-mono text-sm text-slate-500">{number}</p>

        {loading ? (
          <p className="mt-6 text-slate-500">Checking…</p>
        ) : error ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : result ? (
          <Card className={`mt-6 border-slate-200/80 ${result.valid ? "ring-1 ring-emerald-200" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {result.valid ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Valid certificate
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    Not found
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              {result.valid ? (
                <>
                  <p>
                    <span className="text-slate-500">Student:</span>{" "}
                    <strong>{result.studentName}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Course:</span> {result.courseName}
                  </p>
                  <p>
                    <span className="text-slate-500">Institute:</span> {result.instituteName}
                  </p>
                  <p>
                    <span className="text-slate-500">Issued:</span>{" "}
                    {new Date(result.issuedAt).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="text-slate-600">
                  This certificate number could not be verified for institute{" "}
                  <span className="font-mono">{tenant}</span>. It may be invalid or revoked.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
