"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isDemoPath, toDemoPath } from "@/lib/demo-mode";

/** Legacy route: /dashboard/advisor?tab=… → new sidebar destinations. */
export default function LegacyAdvisorRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    const base = isDemoPath(pathname) ? toDemoPath("/dashboard") : "/dashboard";

    if (tab === "messages") {
      router.replace(`${base}/messages`);
      return;
    }
    if (tab === "documents") {
      router.replace(`${base}/documents`);
      return;
    }
    if (tab === "tasks") {
      router.replace(`${base}/tasks`);
      return;
    }
    router.replace(`${base}/appointments`);
  }, [pathname, router, searchParams]);

  return null;
}
