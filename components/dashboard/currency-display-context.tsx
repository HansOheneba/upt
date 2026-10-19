"use client";

import * as React from "react";
import { useFinancialStore } from "@/store/financialStore";
import {
  formatCurrency,
  getInvestmentCurrency,
  getNetWorthFx,
  type NetWorthFx,
} from "@/lib/client-data";
import { cn } from "@/lib/utils";

type DisplayChoice = "base" | "investment";

const STORAGE_KEY = "celerey-wealth-display-currency";

type CurrencyDisplayContextValue = {
  hasDualCurrency: boolean;
  baseCurrency: string;
  investmentCurrency: string;
  displayCurrency: string;
  choice: DisplayChoice;
  setChoice: (choice: DisplayChoice) => void;
  fx: NetWorthFx | undefined;
  convertAmount: (amount: number, sourceCurrency: string) => number;
  formatAmount: (amount: number, sourceCurrency: string) => string;
};

const CurrencyDisplayContext =
  React.createContext<CurrencyDisplayContextValue | null>(null);

function currencyToggleLabel(code: string): string {
  if (code === "GHS") return "Cedis";
  if (code === "USD") return "Dollars";
  return code;
}

export function CurrencyDisplayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useFinancialStore((s) => s.user);
  const baseCurrency = user?.currency ?? "USD";
  const investmentCurrency = getInvestmentCurrency(user);
  const fx = getNetWorthFx(user);
  const hasDualCurrency = Boolean(fx);

  const [choice, setChoiceState] = React.useState<DisplayChoice>("investment");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "base" || stored === "investment") {
      setChoiceState(stored);
    }
  }, []);

  const setChoice = React.useCallback((next: DisplayChoice) => {
    setChoiceState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const displayCurrency =
    choice === "base" ? baseCurrency : investmentCurrency;

  const convertAmount = React.useCallback(
    (amount: number, sourceCurrency: string) => {
      if (!fx || sourceCurrency === displayCurrency) return amount;
      if (
        sourceCurrency === fx.investmentCurrency &&
        displayCurrency === fx.baseCurrency
      ) {
        return amount * fx.basePerInvestment;
      }
      if (
        sourceCurrency === fx.baseCurrency &&
        displayCurrency === fx.investmentCurrency
      ) {
        return amount / fx.basePerInvestment;
      }
      return amount;
    },
    [fx, displayCurrency],
  );

  const formatAmount = React.useCallback(
    (amount: number, sourceCurrency: string) =>
      formatCurrency(convertAmount(amount, sourceCurrency), displayCurrency),
    [convertAmount, displayCurrency],
  );

  const value = React.useMemo(
    () => ({
      hasDualCurrency,
      baseCurrency,
      investmentCurrency,
      displayCurrency,
      choice,
      setChoice,
      fx,
      convertAmount,
      formatAmount,
    }),
    [
      hasDualCurrency,
      baseCurrency,
      investmentCurrency,
      displayCurrency,
      choice,
      setChoice,
      fx,
      convertAmount,
      formatAmount,
    ],
  );

  return (
    <CurrencyDisplayContext.Provider value={value}>
      {children}
    </CurrencyDisplayContext.Provider>
  );
}

export function useCurrencyDisplay(): CurrencyDisplayContextValue {
  const ctx = React.useContext(CurrencyDisplayContext);
  if (!ctx) {
    throw new Error(
      "useCurrencyDisplay must be used within CurrencyDisplayProvider",
    );
  }
  return ctx;
}

export function useOptionalCurrencyDisplay():
  | CurrencyDisplayContextValue
  | null {
  return React.useContext(CurrencyDisplayContext);
}

export function CurrencyDisplayToggle({ className }: { className?: string }) {
  const { hasDualCurrency, choice, setChoice, baseCurrency, investmentCurrency } =
    useCurrencyDisplay();

  if (!hasDualCurrency) return null;

  const options: { key: DisplayChoice; code: string }[] = [
    { key: "base", code: baseCurrency },
    { key: "investment", code: investmentCurrency },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5",
        className,
      )}
      role="group"
      aria-label="Display currency"
    >
      {options.map(({ key, code }) => {
        const active = choice === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setChoice(key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {currencyToggleLabel(code)}
          </button>
        );
      })}
    </div>
  );
}
