// Zod validation schemas. All request bodies that touch the database
// are validated here before anything else happens. Server-side only —
// never trust client validation.

import { z } from 'zod';
import { COUNTRIES } from '@/lib/data/countries';

const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];

// Honeypot: a hidden form field that real users never fill in.
// Bots fill every input they see, so a non-empty value flags spam.
const honeypot = z.string().max(0).optional();

// ── Order ────────────────────────────────────────────────────────────

export const OrderItemSchema = z.object({
  productId: z.string().min(1),
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  image: z.string().min(1).max(400),
  size: z.enum(['S', 'M', 'L']),
  color: z.string().min(1).max(60),
  price: z.number().positive().max(99999),
  quantity: z.number().int().min(1).max(10),
});

export const ShippingSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email().max(160),
  phoneCountry: z.enum(COUNTRY_CODES),
  phone: z
    .string()
    .min(5)
    .max(15)
    .regex(/^\d+$/, 'Phone must contain only digits'),
  address1: z.string().min(5).max(200),
  address2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.enum(COUNTRY_CODES),
});

export const OrderRequestSchema = z.object({
  items: z.array(OrderItemSchema).min(1).max(40),
  shipping: ShippingSchema,
  shippingMethod: z.enum(['standard', 'express']),
  website: honeypot,
});
export type OrderRequest = z.infer<typeof OrderRequestSchema>;

export const OrderStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  trackingNumber: z.string().max(100).optional().or(z.literal('')),
  trackingUrl: z.string().url().max(400).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  notify: z.boolean().optional(),
});

// ── Contact ──────────────────────────────────────────────────────────

export const ContactRequestSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(160),
  subject: z.string().max(120).optional().or(z.literal('')),
  message: z.string().min(10).max(5000),
  website: honeypot,
});

// ── Newsletter ───────────────────────────────────────────────────────

export const NewsletterSubscribeSchema = z.object({
  email: z.string().email().max(160),
  source: z.enum(['footer', 'popup', 'checkout', 'manual']).optional(),
  website: honeypot,
});

// ── Product editor (admin) ───────────────────────────────────────────

export const ProductUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  subtitle: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
  badge: z.string().max(40).nullable().optional(),
  mainImage: z.string().min(1).max(400).optional(),
  altImage: z.string().min(1).max(400).optional(),
  swatchHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  category: z.enum(['one-pieces', 'bikinis']).optional(),
});

export const StockUpdateSchema = z.object({
  stock: z.record(z.enum(['S', 'M', 'L']), z.number().int().min(0).max(9999)),
});
