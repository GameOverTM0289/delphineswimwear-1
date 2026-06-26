'use client';

import { useEffect, useRef } from 'react';
import { trackPurchase, type GaItem } from '@/lib/analytics';

interface Props {
  orderNumber: string;
  value: number;
  items: GaItem[];
  enabled: boolean;
}

/**
 * Fires a GA4 `purchase` event once when the order-confirmation page is shown
 * after a successful payment. De-duplicated per order via sessionStorage so a
 * refresh doesn't double-count. No-op until GA is loaded (cookie consent).
 */
export default function PurchaseTracker({ orderNumber, value, items, enabled }: Props) {
  const fired = useRef(false);
  useEffect(() => {
    if (!enabled || fired.current) return;
    const key = `delphine-purchase-${orderNumber}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    fired.current = true;
    trackPurchase(orderNumber, items, value);
  }, [enabled, orderNumber, value, items]);
  return null;
}
