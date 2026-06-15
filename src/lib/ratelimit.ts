// Rate limiting via Upstash Ratelimit. If Upstash isn't configured,
// every limiter becomes a no-op so dev environments still work.
//
// Configure on Vercel by adding:
//   UPSTASH_REDIS_REST_URL=…
//   UPSTASH_REDIS_REST_TOKEN=…
// (Free tier: 10,000 commands/day — far more than this site needs.)

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

interface LimiterLike {
  limit(key: string): Promise<{ success: boolean; remaining: number; reset: number }>;
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const noopLimiter: LimiterLike = {
  async limit() {
    return { success: true, remaining: Infinity, reset: 0 };
  },
};

function build(window: `${number} ${'s' | 'm' | 'h'}`, max: number, prefix: string): LimiterLike {
  if (!url || !token) return noopLimiter;
  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix: `delphine:${prefix}`,
    analytics: false,
  });
}

export const loginLimiter = build('15 m', 5, 'login');
export const contactLimiter = build('1 h', 3, 'contact');
export const newsletterLimiter = build('1 h', 3, 'newsletter');
export const orderLimiter = build('1 h', 10, 'order');
export const adminLimiter = build('1 m', 60, 'admin');

// Resolve a rough client IP from request headers. x-forwarded-for is
// set by Vercel's edge to the real client IP.
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

export function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

/** True when Upstash is configured (used by the admin status panel). */
export const RATE_LIMITING_ENABLED = Boolean(url && token);
