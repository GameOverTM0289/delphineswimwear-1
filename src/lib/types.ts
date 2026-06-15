// Public-facing types. Mirrors Prisma models but uses friendly shapes
// (price as euros, not cents) so the UI doesn't sprinkle /100 everywhere.

export type Category = 'one-pieces' | 'bikinis';

export interface ProductVariant {
  size: string;
  stock: number;
}

/**
 * A color a product is offered in. The product gallery + detail page
 * swap their imagery when a swatch is selected. `closeUpImage` is
 * optional — not every color has a close-up shot.
 */
export interface ColorOption {
  /** Human-readable name shown next to the swatch — e.g. "Blue". */
  name: string;
  /** URL-safe slug — e.g. "blue". */
  slug: string;
  /** Hex color rendered in the swatch button. */
  hex: string;
  /** Default card / detail image (front view). */
  frontImage: string;
  /** Card-hover + second gallery image (back view). */
  backImage: string;
  /** Optional third gallery image. */
  closeUpImage?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  category: Category;
  description: string;
  price: number;
  priceCents: number;
  currency: string;
  badge: string | null;
  mainImage: string;
  altImage: string;
  swatchHex: string;
  sizes: string[];
  /** Per-size stock. Empty array means stock isn't being tracked yet. */
  variants: ProductVariant[];
  featured: boolean;
  /**
   * Available colors. When present, the product detail page swaps
   * images per selected swatch and the cart records the chosen color.
   * When absent (legacy products), the single swatchHex is used.
   */
  colors?: ColorOption[];
}

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountry: string; // ISO-2 of the dial code
  phone: string; // local digits only
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string; // ISO-2
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type ShippingMethod = 'standard' | 'express';

export interface OrderSummary {
  id: string;
  orderNumber: string;
  email: string;
  customerName: string;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  itemCount: number;
  createdAt: string;
}
