// config/brands.ts
//
// ─────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH FOR WHITE-LABEL BRAND CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────
//
// Each deployment of this app (one Vercel project per brand) sets
// NEXT_PUBLIC_TENANT to one of the keys in `brands` below. See
// lib/tenant.ts for how that value is resolved into a BrandConfig, and
// docs/architecture/WHITE_LABELING.md for how to add a new brand.
//
// Do NOT put secrets here (API keys, database credentials, etc). This file
// ships to the client bundle. Only public branding values belong here.

export type TenantId =
  | "upt"
  | "celerey"
  | "ecobank"
  | "stanbic"
  | "absa"
  | "gcb"
  | "fidelity"
  | "access"
  | "omnibsic"
  | "fnb"
  | "petra";

/**
 * Sans families loaded via next/font in app/layout.tsx.
 * Benton Sans (Stanbic's brand type) is commercial and not on Google Fonts;
 * `source-sans-3` is the closest free stand-in for headers and body.
 */
export type BrandFontId = "manrope" | "source-sans-3" | "poppins";

export interface BrandConfig {
  /** Must match the key this config is registered under in `brands`. */
  id: TenantId;
  /** Short product/company name, e.g. used in nav labels and alt text. */
  name: string;
  /** Full product name, e.g. used in <title> and applicationName metadata. */
  fullName: string;
  /** Metadata description (SEO / link preview). */
  description: string;
  /**
   * Name shown for the in-app AI assistant.
   * Always "Celerey AI" - Celerey is the product, not the bank brand.
   */
  aiAssistantName: string;
  supportEmail: string;
  marketingUrl: string;
  /** App-wide sans family (headers + body). Resolved in app/layout.tsx. */
  font: BrandFontId;
  logo: {
    /** Light-on-transparent wordmark, for dark surfaces (e.g. sidebar). */
    light: string;
    /** Dark-on-transparent wordmark, for light surfaces (e.g. login). */
    dark: string;
    /** Small square mark, for collapsed sidebar / AI avatar. */
    symbol: string;
  };
  /**
   * Display size when the shared slots are too large for a wide wordmark.
   * Call sites fall back to their own classes when this is omitted.
   */
  logoClassName?: {
    wordmark: string;
    symbol: string;
    /** Sidebar wordmark. Falls back to wordmark. */
    sidebarWordmark?: string;
  };
  /** Path under public/ served by app/icon.tsx. */
  favicon: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
    foreground: string;
    sidebar: string;
    sidebarForeground: string;
    /** Secondary text / borders (Fidelity brown). */
    muted?: string;
    /** Dashboard page wash behind cards (Fidelity cream). */
    surface?: string;
  };
}

export const DEFAULT_TENANT_ID: TenantId = "upt";

export const brands: Record<TenantId, BrandConfig> = {
  upt: {
    id: "upt",
    name: "United Pension Trustees",
    fullName: "United Pension Trustees",
    description:
      "United Pension Trustees gives members a clear view of their pension, contributions, and retirement plan. Track your progress and stay aligned with your long-term goals.",
    aiAssistantName: "Celerey AI",
    supportEmail: "info@upt.com.gh",
    marketingUrl: "https://upt.com.gh",
    // Poppins is the body face on upt.com.gh. theMix / Avenir there are licensed.
    font: "poppins",
    logo: {
      // White knockout of the official lockup, for the dark sidebar.
      light: "/brands/upt/logo-light.png",
      // Official wordmark from upt.com.gh (silver type, navy mark).
      dark: "/brands/upt/logo-dark.png",
      symbol: "/brands/upt/symbol.png",
    },
    // Wide lockup (wordmark + "united we build" + mark).
    logoClassName: {
      wordmark: "h-12 w-auto max-w-full object-contain",
      sidebarWordmark: "h-10 w-auto max-w-full object-contain",
      symbol: "size-9 object-contain",
    },
    favicon: "/brands/upt/favicon.png",
    colors: {
      // From upt.com.gh: --primary-upt and the navy mark. Accent is the
      // silver of the wordmark.
      primary: "#1E3059",
      accent: "#8D95A3",
      background: "#FFFFFF",
      foreground: "#000000",
      muted: "#5C5C5C",
      sidebar: "#1E3059",
      sidebarForeground: "rgba(255, 255, 255, 0.88)",
    },
  },
  celerey: {
    id: "celerey",
    name: "Celerey",
    fullName: "Celerey Financial Dashboard",
    description:
      "Celerey Financial Dashboard provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "support@celerey.com",
    marketingUrl: "https://celerey.co",
    font: "manrope",
    logo: {
      light: "/brands/celerey/logo-light.png",
      dark: "/brands/celerey/logo-dark.png",
      symbol: "/brands/celerey/symbol.png",
    },
    favicon: "/brands/celerey/favicon.png",
    colors: {
      primary: "#151339",
      accent: "#8c80f8",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      sidebar: "#18163f",
      sidebarForeground: "rgba(255, 255, 255, 0.8)",
    },
  },
  ecobank: {
    id: "ecobank",
    name: "Ecobank",
    fullName: "Ecobank Client Dashboard",
    description:
      "Ecobank Client Dashboard provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "support@ecobank.com",
    marketingUrl: "https://www.ecobank.com",
    font: "manrope",
    logo: {
      light: "/brands/ecobank/ecobank-light.png",
      dark: "/brands/ecobank/ecobank-dark.png",
      symbol: "/brands/ecobank/ecobank-dark.png",
    },
    favicon: "/brands/ecobank/favicon.ico",
    colors: {
      // Placeholder palette approximating Ecobank red/blue identity.
      // Swap for official brand tokens when final assets are provided.
      primary: "#003366",
      accent: "#ED1C24",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      sidebar: "#003366",
      sidebarForeground: "rgba(255, 255, 255, 0.8)",
    },
  },
  // Stanbic Investment Management Services (not the retail bank brand).
  stanbic: {
    id: "stanbic",
    name: "Stanbic Investment Management Services",
    fullName: "Stanbic Investment Management Services",
    description:
      "Stanbic Investment Management Services provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "support@stanbic.com",
    marketingUrl: "https://www.stanbicbank.com",
    // Benton Sans Regular is licensed; Source Sans 3 is the Google Fonts stand-in.
    font: "source-sans-3",
    logo: {
      // Full lockup: shield + stacked "Stanbic / Investment Management / Services".
      light: "/brands/stanbic/stanbic-light.png",
      dark: "/brands/stanbic/stanbic-dark.png",
      symbol: "/brands/stanbic/symbol.png",
    },
    favicon: "/brands/stanbic/favicon.ico",
    colors: {
      primary: "#0033A0",
      accent: "#00AEEF",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      sidebar: "#0033A0",
      sidebarForeground: "rgba(255, 255, 255, 0.8)",
    },
  },
  absa: {
    id: "absa",
    name: "Absa Bank Ghana",
    fullName: "Absa Bank Ghana Client Dashboard",
    description:
      "Absa Bank Ghana Client Dashboard provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "support@absa.com.gh",
    marketingUrl: "https://www.absa.com.gh",
    font: "manrope",
    logo: {
      // Single circular mark; reused for light, dark, and symbol.
      light: "/brands/absa/absa-logo.png",
      dark: "/brands/absa/absa-logo.png",
      symbol: "/brands/absa/absa-logo.png",
    },
    favicon: "/brands/absa/favicon.ico",
    colors: {
      // Placeholder palette approximating Absa red identity.
      // Swap for official brand tokens when final assets are provided.
      primary: "#AF0C3E",
      accent: "#ED1C24",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      sidebar: "#AF0C3E",
      sidebarForeground: "rgba(255, 255, 255, 0.8)",
    },
  },
  gcb: {
    id: "gcb",
    name: "GCB Bank PLC",
    fullName: "GCB Bank PLC Client Dashboard",
    description:
      "GCB Bank PLC Client Dashboard provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "support@gcbbank.com.gh",
    marketingUrl: "https://www.gcbbank.com.gh",
    font: "manrope",
    logo: {
      light: "/brands/gcb/gcb-logo-light.png",
      dark: "/brands/gcb/gcb-logo-dark.png",
      // No dedicated symbol; light logo doubles as the mark.
      symbol: "/brands/gcb/gcb-logo-light.png",
    },
    // Generated from gcb-logo-light.png (used as symbol).
    favicon: "/brands/gcb/favicon.png",
    colors: {
      // Slate grey + gold from GCB brand surfaces (sampled from logo plate).
      primary: "#475560",
      accent: "#FFBF35",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      sidebar: "#475560",
      sidebarForeground: "rgba(255, 255, 255, 0.8)",
    },
  },
  fidelity: {
    id: "fidelity",
    name: "Fidelity Bank Ghana",
    fullName: "Fidelity Bank Ghana Client Dashboard",
    description:
      "Fidelity Bank Ghana Client Dashboard provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "support@fidelitybank.com.gh",
    marketingUrl: "https://www.fidelitybank.com.gh",
    font: "manrope",
    logo: {
      light: "/brands/fidelity/fidelity-light.svg",
      dark: "/brands/fidelity/fidelity-dark.svg",
      symbol: "/brands/fidelity/fidelity-symbol.png",
    },
    // Generated from fidelity-symbol.png.
    favicon: "/brands/fidelity/favicon.ico",
    colors: {
      // Fidelity Bank Ghana: orange, brown, cream, white, and black only.
      primary: "#F58220",
      accent: "#977B66",
      background: "#FCF8F2",
      foreground: "#000000",
      muted: "#977B66",
      surface: "#FCF8F2",
      sidebar: "#000000",
      sidebarForeground: "rgba(255, 255, 255, 0.85)",
    },
  },
  access: {
    id: "access",
    name: "Access Bank Ghana",
    fullName: "Access Bank Ghana Client Dashboard",
    description:
      "Access Bank Ghana Client Dashboard provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "support@ghana.accessbankplc.com",
    marketingUrl: "https://www.ghana.accessbankplc.com",
    font: "manrope",
    logo: {
      light: "/brands/access/access-logo-light.png",
      dark: "/brands/access/access-logo-dark.png",
      symbol: "/brands/access/access-symbol.png",
    },
    // Regenerated from access-symbol.png (previous .ico was a broken 15x16 PNG).
    favicon: "/brands/access/favicon.ico",
    colors: {
      // Placeholder palette approximating Access orange/navy identity.
      // Swap for official brand tokens when final assets are provided.
      primary: "#00205B",
      accent: "#F37021",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      sidebar: "#00205B",
      sidebarForeground: "rgba(255, 255, 255, 0.8)",
    },
  },
  omnibsic: {
    id: "omnibsic",
    name: "OmniBSIC Bank",
    fullName: "OmniBSIC Bank Client Dashboard",
    description:
      "OmniBSIC Bank Client Dashboard provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "support@omnibsic.com",
    marketingUrl: "https://www.omnibsic.com",
    font: "manrope",
    logo: {
      light: "/brands/omnibsic/omni-logo-light.png",
      dark: "/brands/omnibsic/omni-logo-dark.png",
      symbol: "/brands/omnibsic/omni-symbol.png",
    },
    // Generated from omni-symbol.png.
    favicon: "/brands/omnibsic/favicon.png",
    colors: {
      // Placeholder palette approximating OmniBSIC navy/blue identity.
      // Swap for official brand tokens when final assets are provided.
      primary: "#0B1F4A",
      accent: "#5BA4D9",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      sidebar: "#0B1F4A",
      sidebarForeground: "rgba(255, 255, 255, 0.8)",
    },
  },
  // First National Bank Ghana (FirstRand / South Africa). Not FBNBank Ghana
  // (First Bank of Nigeria) and not a US First National Bank.
  fnb: {
    id: "fnb",
    name: "FNB Ghana",
    fullName: "FNB Ghana Client Dashboard",
    description:
      "FNB Ghana Client Dashboard provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "info@firstnationalbank.com.gh",
    marketingUrl: "https://www.firstnationalbank.com.gh",
    font: "manrope",
    logo: {
      light: "/brands/fnb/fnb-logo.svg",
      dark: "/brands/fnb/fnb-logo.svg",
      symbol: "/brands/fnb/fnb-logo.svg",
    },
    // Generated from fnb-logo-light.png.
    favicon: "/brands/fnb/favicon.png",
    colors: {
      // Teal + orange from the official FNB mark.
      // Sidebar navy sampled from FNB brand collateral.
      primary: "#00A9AC",
      accent: "#FA9D1E",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      sidebar: "#082836",
      sidebarForeground: "rgba(255, 255, 255, 0.8)",
    },
  },
  petra: {
    id: "petra",
    name: "Petra",
    fullName: "Petra Client Dashboard",
    description:
      "Petra Client Dashboard provides clients with a clear overview of their financial health, assets, and long-term goals. Track your progress, monitor key metrics, and stay aligned with your financial plan.",
    aiAssistantName: "Celerey AI",
    supportEmail: "info@petraonline.com",
    marketingUrl: "https://petraonline.com",
    font: "manrope",
    logo: {
      light: "/brands/petra/petra-light.png",
      dark: "/brands/petra/petra-dark.png",
      symbol: "/brands/petra/petra-symbol.png",
    },
    // Wide wordmark. Shared slots (h-12 / h-14) make it dominate the header.
    // The file is cropped tight, so the sidebar slot gets a shorter mark
    // and the header padding reads as space around it.
    logoClassName: {
      wordmark: "h-8 w-auto max-w-full object-contain",
      sidebarWordmark: "h-6 w-auto max-w-full object-contain",
      symbol: "size-7 object-contain",
    },
    favicon: "/brands/petra/favicon.png",
    colors: {
      // Navy wordmark + orange triangle from the official mark.
      // Sidebar is the deeper navy from petraonline.com.
      primary: "#1D3865",
      accent: "#F89722",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      sidebar: "#142B51",
      sidebarForeground: "rgba(255, 255, 255, 0.8)",
    },
  },
};
