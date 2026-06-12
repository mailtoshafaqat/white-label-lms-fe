"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookmarksApi } from "@/lib/api";

type Props = {
  targetType: "Topic" | "Question";
  targetId: string;
  title: string;
  subtitle?: string | null;
  topicId?: string | null;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
};

export function BookmarkButton({
  targetType,
  targetId,
  title,
  subtitle,
  topicId,
  variant = "outline",
  size = "sm",
}: Props) {
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bookmarksApi
      .status(targetType, targetId)
      .then((s) => {
        if (!cancelled) setBookmarkId(s.bookmarkId);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  async function toggle() {
    setBusy(true);
    try {
      if (bookmarkId) {
        await bookmarksApi.remove(bookmarkId);
        setBookmarkId(null);
      } else {
        const created = await bookmarksApi.create({
          targetType,
          targetId,
          title,
          subtitle: subtitle ?? null,
          topicId: topicId ?? null,
        });
        setBookmarkId(created.id);
      }
    } finally {
      setBusy(false);
    }
  }

  const saved = bookmarkId !== null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={loading || busy}
      onClick={() => void toggle()}
      className={saved ? "border-[var(--brand)] text-[var(--brand)]" : undefined}
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
