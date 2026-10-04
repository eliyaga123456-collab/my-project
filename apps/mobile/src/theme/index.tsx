import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { themes, radii, space, brand, palette, type ThemeName } from "@unsaid/tokens";

export type Colors = { [K in keyof (typeof themes)["dark"]]: string };
export const fontFamily = {
  display: "BricolageGrotesque_700Bold",
  displaySemi: "BricolageGrotesque_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold"
} as const;

interface ThemeValue { name: ThemeName; colors: Colors; radii: typeof radii; space: typeof space; brand: typeof brand; palette: typeof palette }
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const name: ThemeName = scheme === "light" ? "light" : "dark"; // dark by default
  const value = useMemo<ThemeValue>(() => ({ name, colors: themes[name], radii, space, brand, palette }), [name]);
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
