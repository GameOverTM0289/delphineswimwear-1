import { redirect, notFound } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import OrderEditor from '@/components/admin/OrderEditor';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { getOrderById } from '@/lib/db/orders';
import { hasDatabase } from '@/lib/prisma';
import { formatPriceCents, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await readAdminEmailFromCookie())) redirect('/admin/login');
  if (!hasDatabase()) redirect('/admin');
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <AdminShell>
      <div className="admin-back">
        <a href="/admin">← Back to orders</a>
      </div>
      <h1 style={{ fontFamily: 'var(--sans)', letterSpacing: '0.04em', fontSize: 24 }}>
        {order.orderNumber}
      </h1>
      <p style={{ color: 'var(--m)' }}>Placed {formatDate(order.createdAt)}</p>

      <div className="admin-grid">
        <div>
          <div className="admin-card">
            <h3>Items</h3>
            <table className="admin-table compact">
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td style={{ width: 60 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.image} alt="" style={{ width: 50, height: 60, objectFit: 'cover' }} />
                    </td>
                    <td>
                      <strong>{it.productName}</strong>
                      <div style={{ color: 'var(--m)', fontSize: 12, marginTop: 4 }}>
                        Size {it.size} · {it.color} · Qty {it.quantity}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatPriceCents(it.priceCents * it.quantity, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-totals">
              <div><span>Subtotal</span><span>{formatPriceCents(order.subtotalCents, order.currency)}</span></div>
              <div>
                <span>Shipping · {order.shippingMethod}</span>
                <span>{order.shippingCents === 0 ? 'Free' : formatPriceCents(order.shippingCents, order.currency)}</span>
              </div>
              {order.taxCents > 0 && (
                <div>
                  <span>VAT {(order.taxRate * 100).toFixed(0)}%</span>
                  <span>{formatPriceCents(order.taxCents, order.currency)}</span>
                </div>
              )}
              <div className="admin-total">
                <span>Total</span><span>{formatPriceCents(order.totalCents, order.currency)}</span>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h3>Customer</h3>
            <p>
              <strong>{order.customerName}</strong><br />
              <a href={`mailto:${order.email}`}>{order.email}</a><br />
              {order.phone && <>{order.phone}<br /></>}
            </p>
          </div>

          <div className="admin-card">
            <h3>Shipping address</h3>
            <p>
              {order.address1}{order.address2 ? <>, {order.address2}</> : null}<br />
              {order.city} {order.postalCode}<br />
              {order.countryName}
            </p>
          </div>
        </div>

        <div>
          <div className="admin-card">
            <h3>Status</h3>
            <p style={{ marginBottom: 14 }}>
              Payment: <span className={`pill ${order.paymentStatus}`}>{order.paymentStatus}</span>
            </p>
            <OrderEditor
              id={order.id}
              status={order.status}
              trackingNumber={order.trackingNumber ?? ''}
              trackingUrl={order.trackingUrl ?? ''}
              notes={order.notes ?? ''}
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
