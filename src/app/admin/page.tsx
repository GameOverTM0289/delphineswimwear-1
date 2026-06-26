import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { readAdminEmailFromCookie, isSessionConfigured } from '@/lib/auth';
import { listOrders, getOrderMetrics } from '@/lib/db/orders';
import { hasDatabase } from '@/lib/prisma';
import { EMAIL_ENABLED } from '@/lib/email';
import { RATE_LIMITING_ENABLED } from '@/lib/ratelimit';
import { pokConfigured } from '@/lib/payment';
import { formatPriceCents, formatDate } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>;
}

const STATUS_FILTERS: Array<{ key: OrderStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default async function AdminOrdersPage({ searchParams }: Props) {
  if (!(await readAdminEmailFromCookie())) redirect('/admin/login');

  const sp = await searchParams;
  const ready = hasDatabase();
  const status = (sp.status as OrderStatus | undefined) || undefined;
  const q = sp.q?.trim() || undefined;
  const orders = ready ? await listOrders({ status, search: q, limit: 200 }) : [];
  const metrics = ready ? await getOrderMetrics() : null;

  const systems: Array<{ label: string; ok: boolean; hint: string }> = [
    { label: 'Database', ok: ready, hint: 'DATABASE_URL' },
    { label: 'Emails', ok: EMAIL_ENABLED, hint: 'RESEND_API_KEY' },
    { label: 'Rate limiting', ok: RATE_LIMITING_ENABLED, hint: 'UPSTASH_REDIS_REST_*' },
    { label: 'Admin sessions', ok: isSessionConfigured(), hint: 'ADMIN_SESSION_SECRET' },
    { label: 'Payments (POK)', ok: pokConfigured(), hint: 'POK_KEY_ID / SECRET / MERCHANT_ID' },
  ];

  return (
    <AdminShell>
      <h1><em>Orders</em></h1>

      <div className="admin-status" aria-label="System status">
        {systems.map((s) => (
          <span
            key={s.label}
            className={`sys-pill ${s.ok ? 'on' : 'off'}`}
            title={s.ok ? `${s.label}: configured` : `${s.label}: set ${s.hint}`}
          >
            <span className="sys-dot" aria-hidden />
            {s.label}
          </span>
        ))}
      </div>

      {!ready && (
        <div className="admin-empty">
          <p>
            <strong>Database not configured.</strong><br />
            Set <code>DATABASE_URL</code> to start receiving orders.
          </p>
        </div>
      )}

      {ready && metrics && (
        <div className="admin-metrics">
          <div className="metric">
            <span className="metric-lab">Today</span>
            <span className="metric-val">{formatPriceCents(metrics.today.revenue * 100)}</span>
            <span className="metric-sub">{metrics.today.count} orders</span>
          </div>
          <div className="metric">
            <span className="metric-lab">Last 7 days</span>
            <span className="metric-val">{formatPriceCents(metrics.week.revenue * 100)}</span>
            <span className="metric-sub">{metrics.week.count} orders</span>
          </div>
          <div className="metric">
            <span className="metric-lab">Last 30 days</span>
            <span className="metric-val">{formatPriceCents(metrics.month.revenue * 100)}</span>
            <span className="metric-sub">{metrics.month.count} orders</span>
          </div>
          <div className="metric">
            <span className="metric-lab">Pending action</span>
            <span className="metric-val">{metrics.pending + metrics.processing}</span>
            <span className="metric-sub">{metrics.pending} pending · {metrics.processing} processing</span>
          </div>
        </div>
      )}

      {ready && (
        <div className="admin-toolbar">
          <div className="admin-filters">
            {STATUS_FILTERS.map((f) => {
              const href = f.key === 'all' ? '/admin' : `/admin?status=${f.key}`;
              const on = (status ?? 'all') === f.key;
              return (
                <Link key={f.key} href={href} className={on ? 'on' : ''}>{f.label}</Link>
              );
            })}
          </div>
          <form className="admin-search">
            <input type="text" name="q" defaultValue={q ?? ''} placeholder="Search order # or email…" />
          </form>
        </div>
      )}

      {ready && orders.length === 0 && (
        <div className="admin-empty">
          <p>No orders match the current filters.</p>
        </div>
      )}

      {ready && orders.length > 0 && (
        <div className="admin-card" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th><th>Date</th><th>Customer</th><th>Items</th>
                <th>Total</th><th>Status</th><th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'var(--sans)', letterSpacing: '0.04em' }}>
                    <Link href={`/admin/orders/${o.id}`} style={{ color: 'var(--k)' }}>{o.orderNumber}</Link>
                  </td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td>
                    {o.customerName}
                    <div style={{ color: 'var(--m)', fontSize: 11 }}>{o.email}</div>
                  </td>
                  <td>{o.items.reduce((acc, it) => acc + it.quantity, 0)}</td>
                  <td>{formatPriceCents(o.totalCents, o.currency)}</td>
                  <td><span className={`pill ${o.status}`}>{o.status}</span></td>
                  <td><span className={`pill ${o.paymentStatus}`}>{o.paymentStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
