"use client";

import { authenticatedMediaUrl } from "@/lib/media-url";

type Props = {
  src: string | null | undefined;
  className?: string;
  title?: string;
};

/** Streams tenant-uploaded lectures with download discouraged and auth required on the API. */
export function ProtectedVideo({ src, className, title }: Props) {
  const playUrl = authenticatedMediaUrl(src);

  if (!playUrl) {
    return (
      <div className={className ?? "aspect-video w-full rounded-md bg-slate-100"} />
    );
  }

  return (
    <video
      key={playUrl}
      controls
      controlsList="nodownload"
      disablePictureInPicture
      playsInline
      title={title}
      className={className ?? "aspect-video w-full rounded-md bg-black"}
      src={playUrl}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
