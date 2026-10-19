import * as React from "react";

/** In-card title (e.g. "Retirement Track" on the overview). */
export function CardHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold capitalize">{children}</p>;
}
