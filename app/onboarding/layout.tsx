// app/onboarding/layout.tsx
import type { Metadata } from "next";
import { brand } from "@/lib/tenant";

export const metadata: Metadata = {
  title: `Get Started • ${brand.name}`,
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50/20">
      {children}
    </div>
  );
}
