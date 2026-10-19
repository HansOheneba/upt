import { getInvestmentCurrency } from "@/lib/client-data";
import {
  useCurrencyDisplay,
  useOptionalCurrencyDisplay,
} from "@/components/dashboard/currency-display-context";
import { useFinancialStore } from "@/store/financialStore";

/** Day-to-day base currency from the user profile. */
export function useUserCurrency(): string {
  return useFinancialStore((s) => s.user?.currency ?? "USD");
}

/** Display currency for investments and property (respects GHS/USD toggle). */
export function useInvestmentCurrency(): string {
  const display = useOptionalCurrencyDisplay();
  const user = useFinancialStore((s) => s.user);
  if (display?.hasDualCurrency) return display.displayCurrency;
  return getInvestmentCurrency(user);
}

/** Format wealth and net worth amounts with the shared GHS/USD toggle. */
export function useWealthFormatting() {
  const ctx = useCurrencyDisplay();
  return {
    ...ctx,
    fmtWealth: (amount: number) =>
      ctx.formatAmount(amount, ctx.investmentCurrency),
    fmtNetWorth: (amount: number) =>
      ctx.formatAmount(amount, ctx.baseCurrency),
  };
}
