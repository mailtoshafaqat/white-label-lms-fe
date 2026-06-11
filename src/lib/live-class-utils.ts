import type { LiveClassState } from "@/lib/api";

/** Hosts may open Zoom this many minutes before the scheduled start. */
export const LIVE_CLASS_EARLY_HOST_MINUTES = 15;

export function canStudentJoinLiveClass(state: LiveClassState): boolean {
  return state === "Live";
}

export function canHostStartLiveClass(state: LiveClassState, scheduledStartUtc: string): boolean {
  if (state === "Live") return true;
  if (state !== "Upcoming") return false;
  const opensAt =
    new Date(scheduledStartUtc).getTime() - LIVE_CLASS_EARLY_HOST_MINUTES * 60_000;
  return Date.now() >= opensAt;
}

export function liveClassJoinHint(state: LiveClassState, scheduledStartUtc: string): string {
  if (state === "Live") return "Join the live session";
  if (state !== "Upcoming") return "";
  return `Join opens at ${new Date(scheduledStartUtc).toLocaleString()} when the class is live`;
}

export function liveClassHostStartHint(state: LiveClassState, scheduledStartUtc: string): string {
  if (state === "Live") return "Open host controls";
  if (state !== "Upcoming") return "";
  const opensAt = new Date(scheduledStartUtc).getTime() - LIVE_CLASS_EARLY_HOST_MINUTES * 60_000;
  if (Date.now() >= opensAt) return "Start the meeting for students";
  return `Host start opens ${LIVE_CLASS_EARLY_HOST_MINUTES} min before class (${new Date(opensAt).toLocaleString()})`;
}
