import type { NextConfig } from "next";

function normalizeOrigin(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const BACKEND_BASE_URL = normalizeOrigin(
  process.env.BACKEND_BASE_URL || "http://localhost:8000"
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: `${BACKEND_BASE_URL}/health`,
      },
      {
        source: "/api/:path*",
        destination: `${BACKEND_BASE_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
