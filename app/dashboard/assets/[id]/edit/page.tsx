"use client";

import { useParams, useRouter } from "next/navigation";
import { findHolding } from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { HoldingForm } from "@/components/dashboard/assets/holding-form";

export default function EditHoldingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const storeHoldings = useFinancialStore((s) => s.holdings);
  const holding = findHolding(params.id, storeHoldings);

  if (!holding) {
    // Holding not found - redirect back
    router.replace("/dashboard/assets");
    return null;
  }

  return <HoldingForm editingHolding={holding} />;
}
