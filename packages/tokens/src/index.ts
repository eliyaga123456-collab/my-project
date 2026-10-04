/**
 * EAR design tokens — single source of truth for web, admin and mobile.
 * Direction: "after-dark confessional". Deep ink surfaces, a warm ember primary and a cool
 * mist secondary. Soft, blurry depth; sharp type. Mysterious but kind.
 */
export const palette = {
  ink: { 950: "#0b0a14", 900: "#11101e", 800: "#181730", 700: "#222143", 600: "#2e2c58", 500: "#4a477f" },
  ember: { 50: "#fff3ed", 100: "#ffe1d1", 200: "#ffc2a2", 300: "#ff9a6b", 400: "#ff7440", 500: "#f95b27", 600: "#d9421a", 700: "#b0331a" },
  mist: { 50: "#f3f2ff", 100: "#e6e4ff", 200: "#cbc7ff", 300: "#a9a2ff", 400: "#8a80ff", 500: "#6d62f2", 600: "#5648d4" },
  bone: { 50: "#faf8f5", 100: "#f2eee8", 200: "#e4ded4" },
  mint: { 400: "#4fd6a4", 500: "#2fbf8c" },
  amber: { 400: "#ffc247" },
  rose: { 400: "#ff5d73", 500: "#ec3d57" }
} as const;

export const themes = {
  dark: {
    background: palette.ink[950],
    surface: palette.ink[800],
    surfaceRaised: palette.ink[700],
    border: "rgba(255,255,255,0.09)",
    text: "#f6f4ff",
    muted: "#a6a3c7",
    primary: palette.ember[400],
    primaryText: "#1a0d07",
    secondary: palette.mist[400],
    success: palette.mint[400],
    warning: palette.amber[400],
    danger: palette.rose[400]
  },
  light: {
    background: "#fffafd",
    surface: "#ffffff",
    surfaceRaised: "#fdeaf3",
    border: "rgba(120,20,70,0.13)",
    text: "#1c1020",
    muted: "#6a5470",
    primary: palette.ember[600],
    primaryText: "#ffffff",
    secondary: "#c0267a",
    success: "#12805a",
    warning: "#9a6200",
    danger: "#c42540"
  }
} as const;

export const radii = { sm: 8, md: 14, lg: 22, xl: 32, pill: 999 } as const;
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const fonts = { display: "Bricolage Grotesque", body: "Inter" } as const;
export const brand = {
  name: "EAR",
  fullName: "Eliya's Anonymous Replies",
  tagline: "Say what you really think.",
  /** Shown next to the wordmark as "EAR*" with this footnote. */
  dedication: "* For Liron 💛",
  dedicationSr: "Dedicated to Liron", gradient: ["#ff7440", "#b24cff", "#6d62f2"] as const,
  /** Light theme: the violet stops turn pink. */
  gradientLight: ["#ff7440", "#ff4f9a", "#e02bd0"] as const
};
export type ThemeName = keyof typeof themes;
