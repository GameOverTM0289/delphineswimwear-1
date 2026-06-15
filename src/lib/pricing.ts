// Shipping & tax engine.
//
// Single source of truth for what a customer pays. The order API calls
// `quote()` to recompute totals server-side — never trust client-sent
// totals. Update rates here when business rules change.

import { findCountry, type ShippingZone } from '@/lib/data/countries';
import type { ShippingMethod } from '@/lib/types';

interface Rate {
  cents: number;
  label: string;
  /** Approximate transit time, shown to the customer. */
  eta: string;
}

// Table of shipping rates per zone × method. Match the /shipping page copy.
const SHIPPING_RATES: Record<ShippingZone, Record<ShippingMethod, Rate>> = {
  AL: {
    standard: { cents: 0,    label: 'Standard',           eta: '2 – 4 business days' },
    express:  { cents: 800,  label: 'Express',            eta: '1 – 2 business days' },
  },
  EU: {
    standard: { cents: 0,    label: 'Standard',           eta: '4 – 7 business days' },
    express:  { cents: 1500, label: 'Express',            eta: '1 – 3 business days' },
  },
  NA: {
    standard: { cents: 0,    label: 'Standard',           eta: '7 – 12 business days' },
    express:  { cents: 2500, label: 'Express',            eta: '3 – 5 business days' },
  },
  WORLD: {
    standard: { cents: 0,    label: 'Standard',           eta: '7 – 14 business days' },
    express:  { cents: 3000, label: 'Express',            eta: '4 – 7 business days' },
  },
};

// Free standard shipping on orders ≥ this much (everywhere).
const FREE_STANDARD_THRESHOLD_CENTS = 0; // already free worldwide; raise if rates change

export function shippingRate(
  countryCode: string,
  method: ShippingMethod,
  subtotalCents: number,
): Rate {
  const c = findCountry(countryCode);
  const zone: ShippingZone = c?.zone ?? 'WORLD';
  const rate = SHIPPING_RATES[zone][method];

  if (
    method === 'standard' &&
    FREE_STANDARD_THRESHOLD_CENTS > 0 &&
    subtotalCents >= FREE_STANDARD_THRESHOLD_CENTS
  ) {
    return { ...rate, cents: 0 };
  }
  return rate;
}

export function listShippingOptions(
  countryCode: string,
  subtotalCents: number,
): Array<Rate & { method: ShippingMethod }> {
  return (['standard', 'express'] as ShippingMethod[]).map((method) => ({
    method,
    ...shippingRate(countryCode, method, subtotalCents),
  }));
}

export function vatRate(countryCode: string): number {
  return findCountry(countryCode)?.vat ?? 0;
}

export interface QuoteInput {
  itemsSubtotalCents: number;
  countryCode: string;
  shippingMethod: ShippingMethod;
}

export interface Quote {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  taxRate: number;
  totalCents: number;
  shippingLabel: string;
  shippingEta: string;
}

/**
 * Authoritative price calculation. Always run on the server before charging.
 *
 * VAT is NOT added to customer-facing totals — per the launch spec the
 * displayed sticker price IS the final amount the customer pays. The
 * brand absorbs VAT into the headline price rather than itemizing it.
 * `taxCents` is therefore always 0 and the total is simply
 * subtotal + shipping. Stored on the order for historical traceability
 * but never shown to customers.
 */
export function quote(input: QuoteInput): Quote {
  const sub = Math.max(0, Math.round(input.itemsSubtotalCents));
  const ship = shippingRate(input.countryCode, input.shippingMethod, sub);
  return {
    subtotalCents: sub,
    shippingCents: ship.cents,
    taxCents: 0,
    taxRate: 0,
    totalCents: sub + ship.cents,
    shippingLabel: ship.label,
    shippingEta: ship.eta,
  };
}
