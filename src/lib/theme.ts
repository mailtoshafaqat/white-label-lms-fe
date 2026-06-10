/** Shared theme helpers for white-label branding. */

export type ThemePreset = {
  id: string;
  name: string;
  primary: string;
  description: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "classic-blue", name: "Classic Blue", primary: "#0b3d91", description: "Trust & academia" },
  { id: "ocean-teal", name: "Ocean Teal", primary: "#0d9488", description: "Modern & calm" },
  { id: "royal-violet", name: "Royal Violet", primary: "#6d28d9", description: "Creative institutes" },
  { id: "scholar-crimson", name: "Scholar Crimson", primary: "#be123c", description: "Bold & energetic" },
  { id: "forest-green", name: "Forest Green", primary: "#166534", description: "Growth & focus" },
  { id: "golden-amber", name: "Golden Amber", primary: "#b45309", description: "Warm & welcoming" },
  { id: "midnight-slate", name: "Midnight Slate", primary: "#334155", description: "Professional" },
  { id: "deep-indigo", name: "Deep Indigo", primary: "#4338ca", description: "Tech-forward" },
];

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(color: string, fallback = "#0b3d91"): string {
  const trimmed = color.trim();
  if (!HEX_RE.test(trimmed)) return fallback;
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!HEX_RE.test(n)) return null;
  const h = n.slice(1);
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** WCAG relative luminance — pick light or dark text on brand buttons. */
export function brandForegroundFor(primaryHex: string): string {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return "#ffffff";
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#0f172a" : "#ffffff";
}

export function themeCssVars(primaryHex: string): Record<string, string> {
  const brand = normalizeHex(primaryHex);
  return {
    "--brand": brand,
    "--brand-foreground": brandForegroundFor(brand),
  };
}

export function applyThemeVars(primaryHex: string, target: HTMLElement = document.documentElement) {
  const vars = themeCssVars(primaryHex);
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value);
  }
}
