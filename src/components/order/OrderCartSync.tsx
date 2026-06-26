'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/lib/store/cart';

/**
 * Clears the shopping bag exactly once, only when the order is confirmed paid.
 *
 * The bag is intentionally NOT cleared at checkout submit anymore — if a
 * payment fails or is abandoned, the customer returns with their bag intact and
 * can simply check out again (which creates a fresh order). We only empty the
 * bag here, on the confirmation page, after payment has actually succeeded.
 *
 * De-duplicated per order via sessionStorage so a refresh of a paid order page
 * doesn't wipe a new bag the customer may have started.
 */
export default function OrderCartSync({
  orderNumber,
  paid,
}: {
  orderNumber: string;
  paid: boolean;
}) {
  const clear = useCart((s) => s.clear);
  const done = useRef(false);

  useEffect(() => {
    if (!paid || done.current) return;
    const key = `delphine-cart-cleared-${orderNumber}`;
    try {
      if (sessionStorage.getItem(key)) {
        done.current = true;
        return;
      }
      sessionStorage.setItem(key, '1');
    } catch {
      /* sessionStorage unavailable — still clear once per mount */
    }
    done.current = true;
    clear();
  }, [paid, orderNumber, clear]);

  return null;
}
