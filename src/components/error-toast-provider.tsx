"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Toast = {
  id: number;
  message: string;
  traceId?: string;
  variant: "error" | "success";
};

type ErrorToastContextValue = {
  showError: (message: string, traceId?: string) => void;
  showSuccess: (message: string) => void;
};

const ErrorToastContext = createContext<ErrorToastContextValue | null>(null);

export function ErrorToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissAfter = useCallback((id: number, ms: number) => {
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ms);
  }, []);

  const showError = useCallback(
    (message: string, traceId?: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, traceId, variant: "error" }]);
      dismissAfter(id, 9000);
    },
    [dismissAfter]
  );

  const showSuccess = useCallback(
    (message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant: "success" }]);
      dismissAfter(id, 4000);
    },
    [dismissAfter]
  );

  return (
    <ErrorToastContext.Provider value={{ showError, showSuccess }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              toast.variant === "success"
                ? "pointer-events-auto rounded-lg border border-emerald-500/30 bg-emerald-950/95 px-4 py-3 text-sm text-emerald-50 shadow-lg"
                : "pointer-events-auto rounded-lg border border-red-500/30 bg-red-950/95 px-4 py-3 text-sm text-red-50 shadow-lg"
            }
            role={toast.variant === "success" ? "status" : "alert"}
          >
            <p>{toast.message}</p>
            {toast.traceId && (
              <p className="mt-1 font-mono text-xs text-red-200/90">Ref: {toast.traceId}</p>
            )}
          </div>
        ))}
      </div>
    </ErrorToastContext.Provider>
  );
}

export function useErrorToast() {
  const ctx = useContext(ErrorToastContext);
  if (!ctx) throw new Error("useErrorToast must be used within ErrorToastProvider");
  return ctx;
}

/** Safe for api.ts — no-op when provider is not mounted (SSR). */
export function notifyApiError(message: string, traceId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("lms:api-error", { detail: { message, traceId } })
  );
}

export function ErrorToastListener() {
  const { showError } = useErrorToast();

  useEffect(() => {
    function onApiError(e: Event) {
      const detail = (e as CustomEvent<{ message: string; traceId?: string }>).detail;
      if (detail?.message) showError(detail.message, detail.traceId);
    }

    window.addEventListener("lms:api-error", onApiError);
    return () => window.removeEventListener("lms:api-error", onApiError);
  }, [showError]);

  return null;
}
