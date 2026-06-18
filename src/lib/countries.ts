/** ISO 3166-1 alpha-2 options used in student profile and checkout. */
export const COUNTRY_OPTIONS = [
  { code: "PK", label: "Pakistan" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "AE", label: "UAE" },
] as const;

export function countryLabel(code: string): string {
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.label ?? code;
}
