import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const isDeployProd =
  process.env.VERCEL_ENV === 'production' ||
  process.env.TENON_DEPLOY_ENV === 'production';

function safeCspOrigin(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function buildCspHeader() {
  const connectSrc = new Set<string>(["'self'"]);
  const apiBase = safeCspOrigin(process.env.NEXT_PUBLIC_TENON_API_BASE_URL);
  if (apiBase) connectSrc.add(apiBase);
  const auth0Domain = process.env.TENON_AUTH0_DOMAIN;
  if (auth0Domain) {
    const auth0Origin = safeCspOrigin(
      auth0Domain.startsWith('http') ? auth0Domain : `https://${auth0Domain}`,
    );
    if (auth0Origin) connectSrc.add(auth0Origin);
  }

  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (!isProd) scriptSrc.push("'unsafe-eval'");

  const policy = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${Array.from(connectSrc).join(' ')}`,
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (isProd) policy.push('upgrade-insecure-requests');

  return policy.join('; ');
}

const securityHeaders = [
  { key: 'Content-Security-Policy-Report-Only', value: buildCspHeader() },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  ...(isDeployProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  transpilePackages: ['react-markdown', 'remark-gfm', 'remark-breaks'],
  async rewrites() {
    // API proxying is handled explicitly in /app/api/backend/[...path] to avoid
    // catch-all rewrites shadowing BFF route handlers.
    return [];
  },
  async headers() {
    return [
      {
        source:
          '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
