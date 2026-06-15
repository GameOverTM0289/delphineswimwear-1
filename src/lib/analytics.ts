// Analytics initialization. Only loads scripts when the env vars are
// configured — no hidden tracking. The GA4 tag is injected client-side.

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params ?? {});
}
