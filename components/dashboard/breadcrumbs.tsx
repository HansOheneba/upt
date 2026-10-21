"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { brand } from "@/lib/tenant";
import { usePensionStore } from "@/store/pensionStore";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const memberships = usePensionStore((state) => state.memberships);

  const segments = React.useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const skip = parts[0] === "demo" ? 1 : 0;
    const visible = parts.slice(skip);
    return visible.map((part, index) => {
      const href = "/" + parts.slice(0, skip + index + 1).join("/");
      const membership = memberships.find((row) => row.id === part);
      const label = membership
        ? membership.schemeName
        : brand.id === "upt" && part === "dashboard"
          ? "Overview"
          : part === "schemes"
            ? "My Schemes"
            : part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");
      const isLast = index === visible.length - 1;
      return { href, label, isLast };
    });
  }, [pathname, memberships]);

  return (
    <nav className="flex items-center text-sm min-w-0">
      {segments.map((segment, index) => (
        <React.Fragment key={segment.href}>
          {index > 0 && (
            <ChevronRight className="hidden sm:block h-4 w-4 mx-2 text-muted-foreground shrink-0" />
          )}
          {segment.isLast ? (
            <span className="font-medium text-foreground truncate">
              {segment.label}
            </span>
          ) : (
            <Link
              href={segment.href}
              className="hidden sm:inline text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              {segment.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
