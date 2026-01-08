import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    // API proxying is handled explicitly in /app/api/backend/[...path] to avoid
    // catch-all rewrites shadowing BFF route handlers.
    return [];
  },
};

export default nextConfig;
