import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const statusPillVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center rounded-md border px-2 py-0.5 text-xs font-normal",
  {
    variants: {
      tone: {
        neutral: "border-border bg-secondary text-foreground",
        success: "border-success/20 bg-surface-success text-success",
        warning: "border-warning/20 bg-surface-warning text-warning",
        danger: "border-destructive/20 bg-destructive/10 text-destructive",
        info: "border-accent-blue/20 bg-surface-info text-accent-blue",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type StatusPillTone = NonNullable<
  VariantProps<typeof statusPillVariants>["tone"]
>;

type StatusPillProps = {
  label: string;
  tone?: StatusPillTone;
  className?: string;
};

export function StatusPill({
  label,
  tone = "neutral",
  className,
}: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ tone }), className)}>{label}</span>
  );
}
