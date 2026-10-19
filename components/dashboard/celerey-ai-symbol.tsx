import { cn } from "@/lib/utils";

const CELEREY_AI_GIF = "/logos/Celerey-glow.gif";

const SIZE_PX = {
  sm: 16,
  md: 20,
  lg: 32,
} as const;

type CelereyAiSymbolProps = {
  size?: keyof typeof SIZE_PX;
  className?: string;
};

/** Animated Celerey mark used on Copilot surfaces. */
export function CelereyAiSymbol({
  size = "md",
  className,
}: CelereyAiSymbolProps) {
  const px = SIZE_PX[size];

  return (
    // Native img so Next.js image optimization does not flatten the GIF.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CELEREY_AI_GIF}
      alt=""
      width={px}
      height={px}
      className={cn("shrink-0 object-contain", className)}
      aria-hidden
      decoding="async"
    />
  );
}
