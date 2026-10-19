"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isDemoPath } from "@/lib/demo-mode";

export function cashFlowHref(pathname: string): string {
  const base = isDemoPath(pathname) ? "/dashboard/demo" : "/dashboard";
  return `${base}/cash-flow`;
}

export function CashFlowLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Link href={cashFlowHref(pathname)} className={className}>
      {children}
    </Link>
  );
}
