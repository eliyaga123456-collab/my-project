import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { themes as baseThemes, radii, space, brand as baseBrand, palette, type ThemeName } from "@unsaid/tokens";

/** Mobile palette aligned with the glossy wordmark. Dark: deep purple-black with hot-pink and orange glow. Light: soft white-pink with lavender -> pink -> amber. */
const themes: { [N in ThemeName]: { [K in keyof (typeof baseThemes)["dark"]]: string } } = {
  dark: { ...baseThemes.dark, background: "#0b0614", surface: "#170c27", surfaceRaised: "#241238", border: "rgba(255,170,230,0.14)", text: "#faf5ff", muted: "#b3a6cf", primary: "#ff4fa3", primaryText: "#1c0612", secondary: "#ff8a3d" },
  light: { ...baseThemes.light, background: "#fff7fb", surface: "#ffffff", surfaceRaised: "#f6ecff", border: "rgba(110,60,170,0.16)", text: "#1d1230", muted: "#6a5a85", primary: "#c0278f", primaryText: "#ffffff", secondary: "#6b46d6" }
};
const brand = { ...baseBrand, gradient: ["#ff8a3d", "#ff4fa3", "#8a3dff"] as const, gradientLight: ["#8b6cf0", "#ff5fa8", "#ffb347"] as const };

export type Colors = { [K in keyof (typeof themes)["dark"]]: string };
let hebrewFonts = false;
/** Bricolage Grotesque and Inter have no Hebrew glyphs, so Hebrew uses Heebo (same weights). Read lazily at render time. */
export const setHebrewFonts = (v: boolean) => { hebrewFonts = v; };
export const fontFamily = {
  get display() { return hebrewFonts ? "Heebo_700Bold" : "BricolageGrotesque_700Bold"; },
  get displaySemi() { return hebrewFonts ? "Heebo_600SemiBold" : "BricolageGrotesque_600SemiBold"; },
  get body() { return hebrewFonts ? "Heebo_400Regular" : "Inter_400Regular"; },
  get bodyMedium() { return hebrewFonts ? "Heebo_500Medium" : "Inter_500Medium"; },
  get bodySemi() { return hebrewFonts ? "Heebo_600SemiBold" : "Inter_600SemiBold"; }
};

interface ThemeValue { name: ThemeName; colors: Colors; radii: typeof radii; space: typeof space; brand: Omit<typeof brand, "gradient"> & { gradient: readonly [string, string, string] }; palette: typeof palette }
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const name: ThemeName = scheme === "light" ? "light" : "dark"; // dark by default
  const value = useMemo<ThemeValue>(() => ({ name, colors: themes[name], radii, space, brand: name === "light" ? { ...brand, gradient: brand.gradientLight } : brand, palette }), [name]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}

export const withAlpha = (hex: string, alpha: number): string => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
};
