import type { Metadata } from "next";
import { Manrope, Poppins, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import type { BrandFontId } from "@/config/brands";
import { getBrandCssVars } from "@/lib/brand-css-vars";
import { brand, tenantId } from "@/lib/tenant";

const manrope = Manrope({
  variable: "--font-app",
  subsets: ["latin"],
});

const sourceSans3 = Source_Sans_3({
  variable: "--font-app",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const brandFonts: Record<BrandFontId, typeof manrope> = {
  manrope,
  "source-sans-3": sourceSans3,
  poppins,
};

const appFont = brandFonts[brand.font];

export const metadata: Metadata = {
  title: {
    default: brand.fullName,
    template: `%s • ${brand.fullName}`,
  },
  description: brand.description,
  applicationName: brand.fullName,
  openGraph: {
    title: brand.fullName,
    description: brand.description,
  },
  robots: {
    index: false,
    follow: false,
  },
};

// Active tenant's colors, applied as CSS custom properties on <html> so they
// override the Celerey defaults in globals.css for every descendant element.
// Server-rendered, so there's no flash of the wrong brand.
const brandStyle = getBrandCssVars(brand);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={appFont.variable}
      data-tenant={tenantId}
      style={brandStyle as React.CSSProperties}
    >
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
