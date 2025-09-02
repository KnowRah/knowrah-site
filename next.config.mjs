// next.config.mjs

/** @type {import('next').NextConfig} */
const ALLOW = "microphone=(self), camera=(self), geolocation=(self)";

const nextConfig = {
  // Don’t fail builds on ESLint warnings in CI
  eslint: { ignoreDuringBuilds: true },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: ALLOW },
        ],
      },
    ];
  },
};

export default nextConfig;
