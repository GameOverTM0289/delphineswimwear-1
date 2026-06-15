'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import PhoneInput from '@/components/ui/PhoneInput';
import CountrySelect from '@/components/ui/CountrySelect';
import { useCart } from '@/lib/store/cart';
import { formatPrice } from '@/lib/utils';
import { DEFAULT_COUNTRY } from '@/lib/data/countries';
import type { ShippingMethod } from '@/lib/types';

export default function CheckoutPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneCountry: DEFAULT_COUNTRY,
    phone: '',
    address1: '',
    address2: '',
    city: '',
    postalCode: '',
    country: DEFAULT_COUNTRY,
    website: '',
  });
  // Shipping is fixed to "standard" + always free. No selector
  // shown — backend still expects a method on the order payload.
  const shippingMethod: ShippingMethod = 'standard';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stockErrors, setStockErrors] = useState<
    Array<{ slug: string; size: string; available: number; requested: number }>
  >([]);

  useEffect(() => setHydrated(true), []);

  const itemsSubtotalCents = useMemo(
    () => items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0),
    [items],
  );
  // No VAT, free shipping → totals are just items subtotal.
  const totals = useMemo(
    () => ({
      subtotalCents: itemsSubtotalCents,
      shippingCents: 0,
      shippingLabel: 'Complimentary',
      taxCents: 0,
      taxRate: 0,
      totalCents: itemsSubtotalCents,
    }),
    [itemsSubtotalCents],
  );

  if (hydrated && items.length === 0) {
    return (
      <>
        <Announcement />
        <Nav />
        <main>
          <section className="checkout-empty">
            <h1>Your bag is <em>empty</em></h1>
            <p>Add a piece from the collection to begin checkout.</p>
            <Link href="/shop" className="btn btn-dark">
              Shop the Collection <span className="ar">→</span>
            </Link>
          </section>
        </main>
        <Footer />
        <CartDrawer />
      </>
    );
  }

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStockErrors([]);
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            slug: i.slug,
            name: i.name,
            image: i.image,
            size: i.size,
            color: i.color,
            price: i.price,
            quantity: i.quantity,
          })),
          shipping: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phoneCountry: form.phoneCountry,
            phone: form.phone,
            address1: form.address1,
            address2: form.address2,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          },
          shippingMethod,
          website: form.website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === 'INSUFFICIENT_STOCK') {
          setStockErrors(data.details ?? []);
          setError('Some items in your bag are no longer available in the size you selected.');
        } else if (data.error === 'VALIDATION') {
          setError('Please double-check the form — some fields look incomplete.');
        } else if (data.error === 'RATE_LIMIT') {
          setError('Too many attempts. Please wait a moment and try again.');
        } else if (data.error === 'DATABASE_NOT_CONFIGURED') {
          setError("Checkout isn't connected to a database yet. Please email us to order.");
        } else {
          setError('Something went wrong placing your order. Please try again.');
        }
        setSubmitting(false);
        return;
      }
      clear();
      router.push(data.redirectUrl ?? `/order/${data.orderId}`);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <div className="checkout-wrap">
          <div className="checkout-form-col">
            <h1>Checkout</h1>
            <form onSubmit={onSubmit} className="checkout-form">
              <input
                type="text" name="website" value={form.website}
                onChange={(e) => update('website', e.target.value)}
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
              />

              <h3>Contact</h3>
              <div className="row2">
                <div>
                  <label htmlFor="checkout-first-name">First Name</label>
                  <input id="checkout-first-name" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} autoComplete="given-name" />
                </div>
                <div>
                  <label htmlFor="checkout-last-name">Last Name</label>
                  <input id="checkout-last-name" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} autoComplete="family-name" />
                </div>
              </div>
              <div>
                <label htmlFor="checkout-email">Email</label>
                <input id="checkout-email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" />
              </div>
              <div className="checkout-phone-field">
                <label>Phone</label>
                <PhoneInput
                  phoneCountry={form.phoneCountry}
                  phone={form.phone}
                  onChange={({ phoneCountry, phone }) =>
                    setForm((f) => ({ ...f, phoneCountry, phone }))
                  }
                  required
                />
              </div>

              <h3>Shipping address</h3>
              <div>
                <label htmlFor="checkout-address1">Address</label>
                <input id="checkout-address1" required value={form.address1} onChange={(e) => update('address1', e.target.value)} autoComplete="address-line1" />
              </div>
              <div>
                <label htmlFor="checkout-address2">Apartment, suite, etc. (optional)</label>
                <input id="checkout-address2" value={form.address2} onChange={(e) => update('address2', e.target.value)} autoComplete="address-line2" />
              </div>
              <div className="row2">
                <div>
                  <label htmlFor="checkout-city">City</label>
                  <input id="checkout-city" required value={form.city} onChange={(e) => update('city', e.target.value)} autoComplete="address-level2" />
                </div>
                <div>
                  <label htmlFor="checkout-postal-code">Postal Code</label>
                  <input id="checkout-postal-code" required value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} autoComplete="postal-code" />
                </div>
              </div>
              <div>
                <label>Country</label>
                <CountrySelect value={form.country} onChange={(code) => update('country', code)} required />
              </div>

              {/* Shipping is complimentary on every order — no selector
                  shown to customers. Method is forced to "standard". */}

              {stockErrors.length > 0 && (
                <div className="checkout-error">
                  <strong>Stock changed while you were shopping:</strong>
                  <ul>
                    {stockErrors.map((s, i) => (
                      <li key={i}>
                        {s.slug} (size {s.size}) — only {s.available} available, you wanted {s.requested}.
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {error && !stockErrors.length && <div className="checkout-error">{error}</div>}

              <button type="submit" className="btn btn-dark btn-lg" disabled={submitting}>
                {submitting ? 'Placing order…' : 'Place Order'} <span className="ar">→</span>
              </button>
              <p className="checkout-note">
                You will be redirected to {process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? 'POK'} to complete your payment securely.
              </p>
            </form>
          </div>

          <aside className="checkout-summary">
            <h3>Order <em>Summary</em></h3>
            <ul className="summary-items">
              {items.map((i, idx) => (
                <li key={idx}>
                  <div className="summary-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.image} alt={i.name} />
                  </div>
                  <div>
                    <strong>{i.name}</strong>
                    <span>Size {i.size} · {i.color} · Qty {i.quantity}</span>
                  </div>
                  <span>{formatPrice(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="summary-line"><span>Subtotal</span><span>{formatPrice(totals.subtotalCents / 100)}</span></div>
            <div className="summary-line">
              <span>Shipping</span>
              <span>Complimentary</span>
            </div>
            <div className="summary-total"><span>Total</span><span>{formatPrice(totals.totalCents / 100)}</span></div>
          </aside>
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
