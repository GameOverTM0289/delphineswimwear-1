import Link from 'next/link';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import PurchaseTracker from '@/components/marketing/PurchaseTracker';
import { getOrderById } from '@/lib/db/orders';
import { reconcileOrderPayment, failUnpaidOrder } from '@/lib/reconcile';
import OrderCartSync from '@/components/order/OrderCartSync';
import { formatPriceCents } from '@/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pending?: string; paid?: string; failed?: string; cancelled?: string }>;
}

export const metadata = {
  title: 'Your Order',
};

// Always render fresh — the payment status is updated by the POK webhook
// after the customer pays, and we want the order page to reflect that
// without serving a stale cached copy.
export const dynamic = 'force-dynamic';

type PaymentStatusValue = 'pending' | 'paid' | 'failed' | 'refunded';

function statusLabel(paymentStatus: PaymentStatusValue, sp: { paid?: string; failed?: string }) {
  if (paymentStatus === 'paid') return 'Payment Received';
  if (paymentStatus === 'refunded') return 'Refunded';
  if (paymentStatus === 'failed' || sp.failed) return 'Payment Unsuccessful';
  if (sp.paid) return 'Confirming Payment';
  return 'Awaiting Payment';
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  let order = await getOrderById(id);

  if (order && order.paymentStatus === 'pending' && order.paymentRef) {
    if (sp.failed) {
      // Customer returned from POK after a failed/abandoned payment. Cancel the
      // open POK order and mark ours failed — but only if it's genuinely still
      // unpaid (failUnpaidOrder reconciles first, so it never kills a real
      // payment). No email; their bag is preserved so they can checkout again.
      try {
        await failUnpaidOrder(order);
        order = (await getOrderById(id)) ?? order;
      } catch {
        /* best-effort */
      }
    } else {
      // Self-healing: ask POK directly whether it's been paid (the webhook may
      // not have arrived). Lets a customer who just paid see "Payment Received"
      // immediately instead of a stale "pending".
      try {
        const result = await reconcileOrderPayment(order);
        if (result.changed) {
          order = (await getOrderById(id)) ?? order;
        }
      } catch {
        /* best-effort */
      }
    }
  }

  const isPaid = order?.paymentStatus === 'paid';

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
              <OrderCartSync orderNumber={order.orderNumber} paid={isPaid} />
              <PurchaseTracker
                orderNumber={order.orderNumber}
                value={order.totalCents / 100}
                items={order.items.map((it) => ({
                  item_id: it.productSlug,
                  item_name: it.productName,
                  price: it.priceCents / 100,
                  quantity: it.quantity,
                }))}
                enabled={order.paymentStatus === 'paid'}
              />
              {order.paymentStatus === 'failed' || sp.failed ? (
                <h1>
                  Payment <em>failed</em>
                </h1>
              ) : (
                <h1>
                  Thank you, <em>{order.customerName.split(' ')[0]}</em>
                </h1>
              )}
              <span className="num">Order · {order.orderNumber}</span>
              <span className="order-status">
                {statusLabel(order.paymentStatus as PaymentStatusValue, sp)}
              </span>

              {order.paymentStatus === 'paid' ? (
                <p>
                  Your payment was received and your order is confirmed. We&rsquo;ll email you when
                  it ships from our atelier on the Mediterranean coast.
                </p>
              ) : order.paymentStatus === 'failed' || sp.failed ? (
                <p style={{ color: 'var(--m)' }}>
                  Your payment didn&rsquo;t go through, so no charge was made. Your bag is still
                  saved — head back to checkout to try again, or email us at
                  contact@delphineswimwear.com if you need a hand.
                </p>
              ) : sp.paid ? (
                <p style={{ color: 'var(--m)' }}>
                  Thank you — we&rsquo;re confirming your payment with our provider. This can take a
                  moment; you&rsquo;ll receive a confirmation email shortly.
                </p>
              ) : (
                <p>
                  We&rsquo;ve received your order. Once payment is confirmed we&rsquo;ll send your
                  confirmation and shipping details.
                </p>
              )}

              {order.paymentStatus !== 'failed' && !sp.failed && (
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
              )}

              {order.paymentStatus === 'failed' || sp.failed ? (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link href="/checkout" className="btn btn-dark">
                    Return to Checkout <span className="ar">→</span>
                  </Link>
                  <Link href="/shop" className="btn btn-outline">
                    Continue Shopping
                  </Link>
                </div>
              ) : (
                <Link href="/shop" className="btn btn-outline">
                  Continue Shopping <span className="ar">→</span>
                </Link>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
