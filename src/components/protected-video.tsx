"use client";

import { useCallback, useEffect, useRef } from "react";
import { authenticatedMediaUrl } from "@/lib/media-url";
import { progressApi } from "@/lib/api";

type Props = {
  src: string | null | undefined;
  className?: string;
  title?: string;
  lectureId?: string;
  topicId?: string;
  initialPositionSec?: number;
  onProgressChange?: (percent: number) => void;
};

/** Streams tenant-uploaded lectures with download discouraged and auth required on the API. */
export function ProtectedVideo({
  src,
  className,
  title,
  lectureId,
  topicId,
  initialPositionSec = 0,
  onProgressChange,
}: Props) {
  const playUrl = authenticatedMediaUrl(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef(0);
  const maxPercentRef = useRef(0);

  const saveProgress = useCallback(
    async (video: HTMLVideoElement) => {
      if (!lectureId || !topicId || !video.duration || !Number.isFinite(video.duration)) return;
      const percent = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
      maxPercentRef.current = Math.max(maxPercentRef.current, percent);
      onProgressChange?.(maxPercentRef.current);
      const now = Date.now();
      if (now - lastSavedRef.current < 8000 && percent < 100) return;
      lastSavedRef.current = now;
      try {
        await progressApi.saveLectureProgress(lectureId, {
          progressPercent: maxPercentRef.current,
          positionSec: Math.floor(video.currentTime),
          topicId,
        });
      } catch {
        /* ignore transient save errors */
      }
    },
    [lectureId, topicId, onProgressChange]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playUrl) return;
    const onTimeUpdate = () => void saveProgress(video);
    const onPause = () => void saveProgress(video);
    const onEnded = () => void saveProgress(video);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [playUrl, saveProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || initialPositionSec <= 0) return;
    const seek = () => {
      if (video.duration && initialPositionSec < video.duration - 5) {
        video.currentTime = initialPositionSec;
      }
    };
    video.addEventListener("loadedmetadata", seek);
    return () => video.removeEventListener("loadedmetadata", seek);
  }, [playUrl, initialPositionSec]);

  if (!playUrl) {
    return (
      <div className={className ?? "aspect-video w-full rounded-md bg-slate-100"} />
    );
  }

  return (
    <video
      ref={videoRef}
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
