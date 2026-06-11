"use client";

import { PlatformShell } from "@/components/platform-shell";

export function SuperAdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <PlatformShell title={title} subtitle={subtitle}>
      {children}
    </PlatformShell>
  );
}
