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

// ── GA4 ecommerce helpers ──────────────────────────────────────────────
// These fire only when GA is loaded (i.e. after cookie consent). No-ops
// otherwise, so they're safe to call unconditionally from the UI.

export interface GaItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

export function trackAddToCart(item: GaItem) {
  trackEvent('add_to_cart', {
    currency: 'EUR',
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackBeginCheckout(items: GaItem[], value: number) {
  trackEvent('begin_checkout', { currency: 'EUR', value, items });
}

export function trackPurchase(transactionId: string, items: GaItem[], value: number) {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'EUR',
    value,
    items,
  });
}
