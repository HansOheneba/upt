"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { CelereyLoader } from "@/components/login/celerey-loader";
import { startPopulatedDemo } from "@/lib/pension/enter";

/** Opens the populated member, then the normal dashboard routes. */
export default function DemoEntryPage() {
  const router = useRouter();

  useLayoutEffect(() => {
    startPopulatedDemo();
    router.replace("/demo/dashboard");
  }, [router]);

  return <CelereyLoader />;
}
