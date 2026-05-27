'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useCart } from '@/lib/store/cart';
import { formatPrice } from '@/lib/utils';

export default function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  useEffect(() => {
    // ensure store is hydrated on the client side
    useCart.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);

  return (
    <>
      <div
        className={`cart-overlay ${isOpen ? 'on' : ''}`}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer ${isOpen ? 'on' : ''}`}
        aria-hidden={!isOpen}
        aria-label="Shopping bag"
      >
        <div className="cart-head">
          <h3>
            Your <em>Bag</em>
          </h3>
          <button className="cart-close" onClick={close}>
            Close
          </button>
        </div>

        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <p>Your bag is empty.</p>
              <Link href="/shop" className="btn btn-outline" onClick={close}>
                Shop the Collection <span className="ar">→</span>
              </Link>
            </div>
          ) : (
            items.map((it) => (
              <div className="cart-line" key={`${it.productId}-${it.size}-${it.color}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.image} alt={it.name} />
                <div className="info">
                  <div>
                    <div className="name">{it.name}</div>
                    <div className="meta">
                      Size {it.size} · {it.color}
                    </div>
                  </div>
                  <div className="row">
                    <div className="qty">
                      <button
                        onClick={() =>
                          setQty(it.productId, it.size, it.color, Math.max(1, it.quantity - 1))
                        }
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{it.quantity}</span>
                      <button
                        onClick={() => setQty(it.productId, it.size, it.color, it.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <div className="price">{formatPrice(it.price * it.quantity)}</div>
                  </div>
                  <button
                    className="remove"
                    onClick={() => remove(it.productId, it.size, it.color)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-foot">
            <div className="cart-row">
              <span className="lab">Subtotal</span>
              <span className="val">{formatPrice(subtotal)}</span>
            </div>
            <div className="cart-row">
              <span className="lab">Shipping</span>
              <span className="val">Calculated at checkout</span>
            </div>
            <div className="cart-row total">
              <span className="lab">Total</span>
              <span className="val">{formatPrice(subtotal)}</span>
            </div>
            <Link href="/checkout" className="btn btn-dark" onClick={close}>
              Checkout <span className="ar">→</span>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
