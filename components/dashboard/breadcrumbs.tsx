"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { brand } from "@/lib/tenant";

export default function Breadcrumbs() {
  const pathname = usePathname();

  const segments = React.useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, index) => {
      const href = "/" + parts.slice(0, index + 1).join("/");
      // Format the label: capitalize and replace hyphens with spaces
      const label =
        brand.id === "upt" && part === "dashboard"
          ? "Overview"
          : part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");
      const isLast = index === parts.length - 1;
      return { href, label, isLast };
    });
  }, [pathname]);

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
