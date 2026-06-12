import type { EnrollmentDto } from "@/lib/api";

/** True when every active enrollment is a video-lectures-only plan. */
export function isVideosOnlyStudent(enrollments: EnrollmentDto[]): boolean {
  const active = enrollments.filter((e) => e.isActive);
  if (active.length === 0) return false;
  return active.every((e) => e.videosOnly);
}
