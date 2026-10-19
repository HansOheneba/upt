function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function ProgressBar({ value }: { value: number }) {
  const safe = clamp(value, 0, 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}
