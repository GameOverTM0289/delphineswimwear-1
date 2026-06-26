export function formatPrice(amount: number, currency = 'EUR'): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Math.round(amount)}`;
}

export function formatPriceCents(cents: number, currency = 'EUR'): string {
  return formatPrice(cents / 100, currency);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Build a DHL "Track & Trace" URL for a tracking number. */
export function dhlTrackingUrl(trackingNumber: string): string {
  const id = encodeURIComponent(trackingNumber.trim());
  return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${id}&submit=1`;
}

/**
 * The link to show a customer for a shipment: an explicit override URL if the
 * admin entered one, otherwise the DHL tracking URL built from the number.
 */
export function resolveTrackingUrl(
  trackingNumber?: string | null,
  trackingUrl?: string | null,
): string | null {
  if (trackingUrl && trackingUrl.trim()) return trackingUrl.trim();
  if (trackingNumber && trackingNumber.trim()) return dhlTrackingUrl(trackingNumber);
  return null;
}
