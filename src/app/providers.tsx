"use client";

import { ErrorToastListener, ErrorToastProvider } from "@/components/error-toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorToastProvider>
      <ErrorToastListener />
      {children}
    </ErrorToastProvider>
  );
}
