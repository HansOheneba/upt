"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdvisorySectionPage } from "@/components/dashboard/advisor/advisory-section-page";
import { isDemoPath } from "@/lib/demo-mode";

export default function AppointmentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("tab") !== "tasks") return;
    const base = isDemoPath(pathname) ? "/dashboard/demo" : "/dashboard";
    router.replace(`${base}/tasks`);
  }, [pathname, router, searchParams]);

  return <AdvisorySectionPage section="appointments" />;
}
