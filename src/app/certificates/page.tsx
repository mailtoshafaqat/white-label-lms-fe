"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, Download, ExternalLink } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { progressApi, type CertificateDto } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getTenantSlug, loadAndApplyBranding, type BrandingDto } from "@/lib/branding";

export default function CertificatesPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [items, setItems] = useState<CertificateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    loadAndApplyBranding(getTenantSlug()).then(setBranding);
    progressApi
      .myCertificates()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load certificates"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-white to-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandHeader branding={branding} />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Award className="h-7 w-7 text-[var(--brand)]" />
          My certificates
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Issued when you complete every topic in a course — by watching lectures or completing quizzes.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No certificates yet. Finish all topics in your enrolled course to earn one.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((c) => (
              <Card key={c.id} className="border-slate-200/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.bundleTitle}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  <p>
                    Certificate no.{" "}
                    <span className="font-mono font-medium text-slate-800">{c.certificateNumber}</span>
                  </p>
                  <p className="mt-1">Issued {new Date(c.issuedAt).toLocaleDateString()}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void progressApi.downloadMyCertificatePdf(c.id)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                    {c.verifyUrl && (
                      <a
                        href={c.verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-[var(--brand)]"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Verify link
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
