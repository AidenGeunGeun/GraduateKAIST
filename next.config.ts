import type { NextConfig } from "next";

const cspHeader = [
  // Core fetch directives
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",

  // Block everything we don't use
  "frame-src 'none'",
  "object-src 'none'",
  "worker-src 'none'",
  "media-src 'none'",
  "manifest-src 'self'",
  "child-src 'none'",

  // Navigation / form restrictions
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",

  // Force HTTPS for all subresources
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // — Content Security Policy —
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },

          // — Transport security —
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },

          // — Clickjacking prevention (belt + suspenders with frame-ancestors) —
          {
            key: "X-Frame-Options",
            value: "DENY",
          },

          // — MIME sniffing prevention —
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },

          // — Referrer control —
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // — Cross-origin isolation —
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },

          // — Block all device APIs —
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=()",
              "ambient-light-sensor=()",
              "autoplay=()",
              "battery=()",
              "bluetooth=()",
              "camera=()",
              "display-capture=()",
              "geolocation=()",
              "gyroscope=()",
              "hid=()",
              "idle-detection=()",
              "magnetometer=()",
              "microphone=()",
              "midi=()",
              "payment=()",
              "picture-in-picture=()",
              "publickey-credentials-get=()",
              "screen-wake-lock=()",
              "serial=()",
              "usb=()",
              "xr-spatial-tracking=()",
            ].join(", "),
          },

          // — Prevent DNS prefetch information leaks —
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },

          // — Block Adobe cross-domain policy —
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
    ];
  },

  // Disable X-Powered-By header (leaks framework info)
  poweredByHeader: false,
};

export default nextConfig;
