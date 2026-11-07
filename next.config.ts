import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking — no browser may embed this app in a frame
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send origin in Referer header; strip path and query
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny browser features this app does not use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // CSP — restricts resource loading to known-safe origins.
  // script-src requires 'unsafe-inline' because Next.js injects inline hydration scripts.
  // img-src allows https: to cover external icon/image URLs stored in the database.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' https://accounts.google.com 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self'",
      "connect-src 'self' https://accounts.google.com",
      "frame-src https://accounts.google.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
