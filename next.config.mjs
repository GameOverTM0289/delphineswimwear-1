/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

// Content-Security-Policy. Kept permissive enough not to break the live site
// (self-hosted JS/CSS, Google Fonts, Vercel Analytics and the optional Google
// Analytics tag) while locking down framing, plugins and base-uri.
//   - 'unsafe-inline' on scripts is required because Next.js and the GA
//     snippet inject inline bootstrap scripts (no nonce in use).
//   - In development only, Next.js' fast-refresh uses eval() and a websocket,
//     so we relax script-src/connect-src for localhost. Production stays tight.
const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDev ? "'unsafe-eval'" : '',
  'https://www.googletagmanager.com',
  'https://va.vercel-scripts.com',
]
  .filter(Boolean)
  .join(' ');

const connectSrc = [
  "connect-src 'self'",
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://vitals.vercel-insights.com',
  isDev ? 'ws://localhost:* http://localhost:*' : '',
]
  .filter(Boolean)
  .join(' ');

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  connectSrc,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // Only upgrade to HTTPS in production; on http://localhost this would break
  // same-origin dev requests.
  isDev ? '' : 'upgrade-insecure-requests',
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
