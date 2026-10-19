import React from "react";
import {
  User,
  Banknote,
  CreditCard,
  Target,
  UmbrellaIcon,
  TrendingDown,
  PiggyBank,
  Briefcase,
  ShieldCheck,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  identity: User,
  income: Banknote,
  expenses: CreditCard,
  goals: Target,
  "retirement-basics": UmbrellaIcon,
  "risk-assessment": ShieldCheck,
  "retirement-detail": UmbrellaIcon,
  liabilities: TrendingDown,
  "emergency-fund": PiggyBank,
  assets: Briefcase,
  insurance: ShieldCheck,
};

export function getChecklistIcon(id: string, className: string): React.ReactNode {
  const Icon = ICONS[id] ?? CircleFallback;
  return <Icon className={className} />;
}

function CircleFallback({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border border-current ${className ?? ""}`}
      aria-hidden
    />
  );
}
