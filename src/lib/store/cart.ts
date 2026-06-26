'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/lib/types';
import { trackAddToCart } from '@/lib/analytics';

interface CartState {
  items: CartLine[];
  isOpen: boolean;

  open: () => void;
  close: () => void;
  toggle: () => void;

  add: (line: CartLine) => void;
  remove: (productId: string, size: string, color: string) => void;
  setQty: (productId: string, size: string, color: string, qty: number) => void;
  clear: () => void;

  count: () => number;
  subtotal: () => number;
}

const sameLine = (a: CartLine, b: CartLine) =>
  a.productId === b.productId && a.size === b.size && a.color === b.color;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      add: (line) => {
        trackAddToCart({
          item_id: line.slug,
          item_name: line.name,
          price: line.price,
          quantity: line.quantity,
        });
        set((s) => {
          const existing = s.items.find((it) => sameLine(it, line));
          if (existing) {
            return {
              items: s.items.map((it) =>
                sameLine(it, line) ? { ...it, quantity: it.quantity + line.quantity } : it,
              ),
              isOpen: true,
            };
          }
          return { items: [...s.items, line], isOpen: true };
        });
      },

      remove: (productId, size, color) => {
        set((s) => ({
          items: s.items.filter(
            (it) => !(it.productId === productId && it.size === size && it.color === color),
          ),
        }));
      },

      setQty: (productId, size, color, qty) => {
        set((s) => ({
          items: s.items
            .map((it) =>
              it.productId === productId && it.size === size && it.color === color
                ? { ...it, quantity: Math.max(1, qty) }
                : it,
            )
            .filter((it) => it.quantity > 0),
        }));
      },

      clear: () => set({ items: [] }),

      count: () => get().items.reduce((acc, it) => acc + it.quantity, 0),
      subtotal: () => get().items.reduce((acc, it) => acc + it.price * it.quantity, 0),
    }),
    {
      name: 'delphine-cart-v1',
      // skipHydration prevents SSR/CSR mismatch warnings;
      // we trigger hydration manually on the client side.
      skipHydration: true,
    },
  ),
);
