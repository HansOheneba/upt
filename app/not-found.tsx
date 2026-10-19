import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/tenant";

export const metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-[#f9f9fb] px-6 text-center">
      {/* Logo */}
      <Link href="/" className="mb-10 inline-block">
        <Image
          src={brand.logo.dark}
          alt={brand.name}
          width={220}
          height={68}
          className={brand.logoClassName?.wordmark ?? "h-12 w-auto object-contain"}
          priority
        />
      </Link>

      {/* 404 indicator */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]/40 mb-4">
        404 - Page not found
      </p>

      {/* Heading */}
      <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--brand-primary)] leading-tight max-w-md">
        We couldn&apos;t find that page
      </h1>

      {/* Body */}
      <p className="mt-4 text-sm sm:text-base text-slate-500 max-w-sm leading-relaxed">
        The page you are looking for may have been moved, renamed, or no longer
        exists. Double-check the URL and try again.
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand-primary)] px-6 text-sm font-medium text-white hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] transition-colors"
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to home
        </Link>
      </div>

      {/* Support note */}
      <p className="mt-10 text-xs text-slate-400">
        Think this is a mistake?{" "}
        <a
          href={`mailto:${brand.supportEmail}`}
          className="underline underline-offset-2 hover:text-slate-600 transition-colors"
        >
          Contact support
        </a>
      </p>
    </div>
  );
}
