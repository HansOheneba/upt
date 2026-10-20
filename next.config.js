/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  // Legacy OTP URLs still used by older deploys/bookmarks.
  async rewrites() {
    return [
      // Browsers request /favicon.ico on their own. Send that to the
      // tenant icon route so the tab mark follows NEXT_PUBLIC_TENANT.
      {
        source: "/favicon.ico",
        destination: "/icon",
      },
      {
        source: "/demo/dashboard",
        destination: "/dashboard",
      },
      {
        source: "/demo/dashboard/:path*",
        destination: "/dashboard/:path*",
      },
      {
        source: "/api/proxy/onboarding.generate-otp",
        destination: "/api/otp-proxy/onboarding.generate-otp",
      },
      {
        source: "/api/proxy/onboarding.verify-otp",
        destination: "/api/otp-proxy/onboarding.verify-otp",
      },
      {
        source: "/api/proxy/auth.request-otp",
        destination: "/api/otp-proxy/auth.request-otp",
      },
      {
        source: "/api/proxy/auth.verify-otp",
        destination: "/api/otp-proxy/auth.verify-otp",
      },
    ];
  },
  // OTP auth used to rely on a /api/proxy/:path* rewrite here. That baked
  // NEXT_PUBLIC_BASE_API_URL in at build time, so Preview deploys (or any build
  // without the env var) proxied to "undefined/..." and users saw errors like
  // "Cannot GET /415.shtml". Use app/api/otp-proxy/[...path]/route.ts instead.
  // Fidelity (and future brands) ship SVG wordmarks under public/brands/.
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
