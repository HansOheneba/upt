// app/icon.tsx
//
// Next.js App Router dynamic icon. Serves the active tenant's favicon
// (config/brands.ts -> BrandConfig.favicon). next.config.js rewrites
// /favicon.ico here so the automatic browser request follows the tenant
// too, instead of a static Celerey file.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { brand } from "@/lib/tenant";

export const size = { width: 32, height: 32 };
export const contentType = brand.favicon.endsWith(".svg")
  ? "image/svg+xml"
  : brand.favicon.endsWith(".ico")
    ? "image/x-icon"
    : "image/png";

export default async function Icon() {
  // brand.favicon is a public URL path ("/brands/..."); strip the leading
  // slash so path.join does not treat it as an absolute filesystem path.
  const filePath = path.join(
    process.cwd(),
    "public",
    brand.favicon.replace(/^\//, ""),
  );
  const file = await readFile(filePath);
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": contentType },
  });
}
