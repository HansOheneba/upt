import type { BrandConfig } from "@/config/brands";
import { brands } from "@/config/brands";

export type BrandCssVars = Record<`--${string}`, string>;

/** Celerey product colors — used only inside Celerey AI surfaces. */
export const celereyAiBrandVars: BrandCssVars = {
  "--brand-primary": brands.celerey.colors.primary,
  "--brand-accent": brands.celerey.colors.accent,
};

function fidelityTheme(colors: BrandConfig["colors"]): BrandCssVars {
  const orange = colors.primary;
  const brown = colors.accent;
  const cream = colors.background;
  const black = colors.foreground;
  const white = "#FFFFFF";
  const surface = colors.surface ?? cream;
  const mutedText = colors.muted ?? brown;

  return {
    "--brand-primary": orange,
    "--brand-accent": brown,
    "--brand-background": cream,
    "--brand-foreground": black,
    "--brand-muted": mutedText,
    "--brand-surface": surface,
    "--background": cream,
    "--foreground": black,
    "--card": white,
    "--card-foreground": black,
    "--popover": white,
    "--popover-foreground": black,
    "--primary": orange,
    "--primary-foreground": white,
    "--secondary": `color-mix(in srgb, ${brown} 14%, ${cream})`,
    "--secondary-foreground": black,
    "--muted": `color-mix(in srgb, ${brown} 10%, ${cream})`,
    "--muted-foreground": mutedText,
    "--accent": `color-mix(in srgb, ${orange} 14%, ${cream})`,
    "--accent-foreground": black,
    "--destructive": orange,
    "--border": `color-mix(in srgb, ${brown} 26%, ${white})`,
    "--input": `color-mix(in srgb, ${brown} 20%, ${white})`,
    "--ring": orange,
    "--chart-1": orange,
    "--chart-2": brown,
    "--chart-3": black,
    "--chart-4": `color-mix(in srgb, ${orange} 50%, ${brown})`,
    "--chart-5": `color-mix(in srgb, ${brown} 35%, ${cream})`,
    "--sidebar": colors.sidebar,
    "--sidebar-foreground": colors.sidebarForeground,
    "--sidebar-primary": white,
    "--sidebar-primary-foreground": colors.sidebar,
    "--sidebar-accent": "rgba(255, 255, 255, 0.12)",
    "--sidebar-accent-foreground": white,
    "--sidebar-border": "rgba(255, 255, 255, 0.12)",
    "--sidebar-ring": `color-mix(in srgb, ${orange} 50%, transparent)`,
  };
}

/** Inline CSS custom properties for the active tenant (applied on `<html>`). */
export function getBrandCssVars(brand: BrandConfig): BrandCssVars {
  if (brand.id === "fidelity") {
    return fidelityTheme(brand.colors);
  }

  const { colors } = brand;
  return {
    "--brand-primary": colors.primary,
    "--brand-accent": colors.accent,
    "--brand-background": colors.background,
    "--brand-foreground": colors.foreground,
    "--brand-surface": colors.surface ?? "rgb(247, 247, 247)",
    "--primary": colors.primary,
    "--sidebar": colors.sidebar,
    "--sidebar-foreground": colors.sidebarForeground,
    "--sidebar-primary-foreground": colors.sidebar,
  };
}
