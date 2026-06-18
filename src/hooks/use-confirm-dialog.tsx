"use client";

import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireTypedConfirm?: string;
  onConfirm: () => void | Promise<void>;
};

export function useConfirmDialog() {
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((request: ConfirmRequest) => {
    setPending(request);
  }, []);

  const cancel = useCallback(() => {
    if (!loading) setPending(null);
  }, [loading]);

  const handleConfirm = useCallback(async () => {
    if (!pending) return;
    setLoading(true);
    try {
      await pending.onConfirm();
      setPending(null);
    } finally {
      setLoading(false);
    }
  }, [pending]);

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title={pending?.title ?? ""}
      description={pending?.description ?? ""}
      confirmLabel={pending?.confirmLabel ?? "Confirm"}
      cancelLabel={pending?.cancelLabel}
      requireTypedConfirm={pending?.requireTypedConfirm}
      loading={loading}
      onConfirm={() => void handleConfirm()}
      onCancel={cancel}
    />
  );

  return { confirm, dialog };
}
