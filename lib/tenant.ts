// lib/tenant.ts
//
// Resolves the active brand for this deployment from NEXT_PUBLIC_TENANT.
// Import `brand` anywhere (Server or Client Components) to read the active
// brand's config. See config/brands.ts for the brand data itself and
// docs/architecture/WHITE_LABELING.md for how deployments are configured.

import { brands, DEFAULT_TENANT_ID, type BrandConfig, type TenantId } from "@/config/brands";

function isTenantId(value: string): value is TenantId {
  return Object.prototype.hasOwnProperty.call(brands, value);
}

function resolveTenantId(): TenantId {
  const raw = process.env.NEXT_PUBLIC_TENANT;

  if (raw && isTenantId(raw)) {
    return raw;
  }

  if (process.env.NODE_ENV !== "production") {
    if (raw) {
      // eslint-disable-next-line no-console
      console.warn(
        `[tenant] Unknown NEXT_PUBLIC_TENANT "${raw}". Falling back to "${DEFAULT_TENANT_ID}" for local development.`,
      );
    }
    return DEFAULT_TENANT_ID;
  }

  // Fail loudly in production rather than silently serving the wrong
  // client's brand from a misconfigured deployment.
  throw new Error(
    `[tenant] NEXT_PUBLIC_TENANT is missing or invalid (${JSON.stringify(raw)}). ` +
      `Set it to one of: ${Object.keys(brands).join(", ")}.`,
  );
}

export const tenantId: TenantId = resolveTenantId();
export const brand: BrandConfig = brands[tenantId];

export type { BrandConfig, TenantId };
