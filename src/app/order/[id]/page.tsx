import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import { getOrderById } from '@/lib/db/orders';
import { formatPriceCents } from '@/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pending?: string; paid?: string; cancelled?: string }>;
}

export const metadata = {
  title: 'Your Order',
};

function statusLabel(searchParams: { pending?: string; paid?: string; cancelled?: string }) {
  if (searchParams.paid) return 'Payment Received';
  if (searchParams.cancelled) return 'Payment Cancelled';
  if (searchParams.pending) return 'Awaiting Payment';
  return 'Order Received';
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const order = await getOrderById(id);

  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <div className="order-page">
          {!order ? (
            <>
              <h1>
                Thank <em>you</em>
              </h1>
              <span className="num">Order Received</span>
              <p>
                Your order details are not available right now — the database may not yet be
                connected. Once it is, your order summary will appear here.
              </p>
              <p>
                A confirmation email will follow as soon as everything is wired up. If you placed
                this order and need help, please email us at contact@delphineswimwear.com.
              </p>
              <Link href="/shop" className="btn btn-outline">
                Continue Shopping <span className="ar">→</span>
              </Link>
            </>
          ) : (
            <>
              <h1>
                Thank you, <em>{order.customerName.split(' ')[0]}</em>
              </h1>
              <span className="num">Order · {order.orderNumber}</span>
              <span className="order-status">{statusLabel(sp)}</span>
              <p>
                We&rsquo;ve received your order and will be in touch shortly with confirmation and
                shipping details.
              </p>

              {sp.pending && (
                <p style={{ color: 'var(--m)' }}>
                  POK payment integration is coming soon. Your order is saved and we&rsquo;ll reach
                  out to complete payment.
                </p>
              )}

              <div className="order-card">
                <div style={{ marginBottom: 18 }}>
                  <strong style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--m)' }}>
                    Shipping To
                  </strong>
                  <div>
                    {order.customerName}
                    <br />
                    {order.address1}
                    {order.address2 ? `, ${order.address2}` : ''}
                    <br />
                    {order.city} {order.postalCode}
                    <br />
                    {order.country}
                  </div>
                </div>

                <strong style={{ display: 'block', marginBottom: 10, fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--m)' }}>
                  Items
                </strong>
                {order.items.map((it) => (
                  <div className="row" key={it.id}>
                    <span>
                      {it.productName} · {it.size} · ×{it.quantity}
                    </span>
                    <span>{formatPriceCents(it.priceCents * it.quantity, order.currency)}</span>
                  </div>
                ))}

                <div className="row" style={{ marginTop: 12 }}>
                  <span>Subtotal</span>
                  <span>{formatPriceCents(order.subtotalCents, order.currency)}</span>
                </div>
                <div className="row">
                  <span>Shipping</span>
                  <span>
                    {order.shippingCents === 0
                      ? 'Complimentary'
                      : formatPriceCents(order.shippingCents, order.currency)}
                  </span>
                </div>
                <div className="row total">
                  <span>Total</span>
                  <span>{formatPriceCents(order.totalCents, order.currency)}</span>
                </div>
              </div>

              <Link href="/shop" className="btn btn-outline">
                Continue Shopping <span className="ar">→</span>
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
