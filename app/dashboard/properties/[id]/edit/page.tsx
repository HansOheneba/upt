"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { findProperty } from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { PropertyForm } from "@/components/dashboard/properties/property-form";

function EditPropertyContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const storeProperties = useFinancialStore((s) => s.propertyAssets);
  const property = findProperty(params.id, storeProperties);

  // Read ?focus= without useSearchParams to avoid Suspense requirement
  const focusSection =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("focus") ?? undefined)
      : undefined;

  if (!property) {
    router.replace("/dashboard/properties");
    return null;
  }

  return (
    <PropertyForm editingProperty={property} focusSection={focusSection} />
  );
}

export default function EditPropertyPage() {
  return (
    <Suspense>
      <EditPropertyContent />
    </Suspense>
  );
}
