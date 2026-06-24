import type { NextConfig } from "next";

// Headers communs (sécurité) appliqués partout.
const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

// Routes applicatives : interdiction stricte d'embed (anti-clickjacking).
const appHeaders = [{ key: "X-Frame-Options", value: "DENY" }, ...baseHeaders];

// Widget public : doit pouvoir être embarqué en iframe sur n'importe quel site
// du commerçant → on retire X-Frame-Options et on autorise via CSP frame-ancestors.
const widgetHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors *" },
  ...baseHeaders,
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [
      // Tout sauf /widget* → headers applicatifs (X-Frame-Options: DENY).
      { source: "/((?!widget).*)", headers: appHeaders },
      // Page widget publique → embarquable partout.
      { source: "/widget/:path*", headers: widgetHeaders },
    ];
  },
};

export default nextConfig;
