export type BundleCalendarFields = {
  enrollmentOpensAt: string | null;
  enrollmentClosesAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

function parse(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Soft warnings only — save is still allowed (migration / legacy batches). */
export function validateBundleCalendarDates(fields: BundleCalendarFields): string[] {
  const opens = parse(fields.enrollmentOpensAt);
  const closes = parse(fields.enrollmentClosesAt);
  const starts = parse(fields.startsAt);
  const ends = parse(fields.endsAt);
  const warnings: string[] = [];

  if (opens && closes && opens >= closes) {
    warnings.push("Enrollment opens is after enrollment closes — students may always see Closed.");
  }
  if (starts && ends && starts > ends) {
    warnings.push("Content starts is after the end date — content may never unlock.");
  }
  if (closes && ends && closes > ends) {
    warnings.push("Enrollment closes after the end date — confusing for late sign-ups.");
  }
  if (opens && ends && opens > ends) {
    warnings.push("Enrollment opens after the end date — no one can enroll.");
  }
  if (closes && starts && closes > starts) {
    warnings.push("Enrollment closes after content starts — students can enroll after classes begin.");
  }

  return warnings;
}
