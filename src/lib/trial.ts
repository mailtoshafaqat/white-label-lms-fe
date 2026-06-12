export function trialDaysRemaining(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  const days = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export function isTrialExpired(
  status: string | undefined,
  trialEndsAt: string | null | undefined,
  trialExpired?: boolean | null
): boolean {
  if (trialExpired === true) return true;
  if (status !== "Trial" || !trialEndsAt) return false;
  const days = trialDaysRemaining(trialEndsAt);
  return days !== null && days <= 0;
}

export function trialListBadge(
  status: string,
  trialEndsAt: string | null | undefined
): string | null {
  if (status !== "Trial") return null;
  if (isTrialExpired(status, trialEndsAt)) return "Trial expired";
  const days = trialDaysRemaining(trialEndsAt);
  if (days === null) return "Trial";
  return `Trial · ${days}d`;
}
