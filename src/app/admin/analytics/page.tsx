import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { hasDatabase, prisma } from '@/lib/prisma';
import { formatPriceCents } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

export default async function AnalyticsPage() {
  if (!(await readAdminEmailFromCookie())) redirect('/admin/login');
  if (!hasDatabase()) {
    return (
      <AdminShell>
        <h1><em>Analytics</em></h1>
        <div className="admin-empty"><p>Database not configured.</p></div>
      </AdminShell>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  type OrderRow = {
    createdAt: Date;
    totalCents: number;
    status: string;
    paymentStatus: string;
    countryName: string;
  };
  type LineRow = {
    productSlug: string;
    productName: string;
    priceCents: number;
    quantity: number;
  };

  const [ordersRaw, lineItemsRaw, newSubscribers] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: {
        createdAt: true,
        totalCents: true,
        status: true,
        paymentStatus: true,
        countryName: true,
      },
    }),
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: since } } },
      select: { productSlug: true, productName: true, priceCents: true, quantity: true },
    }),
    prisma.newsletterSubscriber.count({ where: { subscribedAt: { gte: since } } }),
  ]);
  const orders = ordersRaw as OrderRow[];
  const lineItems = lineItemsRaw as LineRow[];

  // ── Headline metrics ──────────────────────────────────────────────────
  const orderCount = orders.length;
  const grossCents = orders.reduce((s, o) => s + o.totalCents, 0);
  const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
  const paidCents = paidOrders.reduce((s, o) => s + o.totalCents, 0);
  const aovCents = orderCount > 0 ? Math.round(grossCents / orderCount) : 0;
  const unitsSold = lineItems.reduce((s, i) => s + i.quantity, 0);
  const paidRate = orderCount > 0 ? Math.round((paidOrders.length / orderCount) * 100) : 0;

  // ── Status breakdown ──────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {};
  for (const s of ORDER_STATUSES) statusCounts[s] = 0;
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

  // ── Top products by true revenue (Σ price × qty) ──────────────────────
  const byProduct = new Map<string, { name: string; units: number; revenue: number }>();
  for (const i of lineItems) {
    const cur = byProduct.get(i.productSlug) ?? { name: i.productName, units: 0, revenue: 0 };
    cur.units += i.quantity;
    cur.revenue += i.priceCents * i.quantity;
    byProduct.set(i.productSlug, cur);
  }
  const topProducts = [...byProduct.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ── Top countries by order count ──────────────────────────────────────
  const byCountry = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    const cur = byCountry.get(o.countryName) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += o.totalCents;
    byCountry.set(o.countryName, cur);
  }
  const topCountries = [...byCountry.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Daily revenue (last 30 days) ──────────────────────────────────────
  const dayBuckets: Record<string, { count: number; revenue: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayBuckets[d.toISOString().slice(0, 10)] = { count: 0, revenue: 0 };
  }
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (dayBuckets[key]) {
      dayBuckets[key].count += 1;
      dayBuckets[key].revenue += o.totalCents;
    }
  }
  const maxRevenue = Math.max(1, ...Object.values(dayBuckets).map((b) => b.revenue));

  return (
    <AdminShell>
      <h1><em>Analytics</em></h1>
      <p style={{ color: 'var(--m)', marginBottom: 28 }}>Last 30 days.</p>

      <div className="admin-metrics">
        <div className="metric">
          <span className="metric-lab">Revenue</span>
          <span className="metric-val">{formatPriceCents(grossCents)}</span>
          <span className="metric-sub">{formatPriceCents(paidCents)} paid</span>
        </div>
        <div className="metric">
          <span className="metric-lab">Orders</span>
          <span className="metric-val">{orderCount}</span>
          <span className="metric-sub">{paidRate}% paid</span>
        </div>
        <div className="metric">
          <span className="metric-lab">Avg order value</span>
          <span className="metric-val">{formatPriceCents(aovCents)}</span>
          <span className="metric-sub">{unitsSold} units sold</span>
        </div>
        <div className="metric">
          <span className="metric-lab">New subscribers</span>
          <span className="metric-val">{newSubscribers}</span>
          <span className="metric-sub">last 30 days</span>
        </div>
      </div>

      <div className="admin-card">
        <h3>Daily revenue</h3>
        <div className="chart-bars">
          {Object.entries(dayBuckets).map(([day, bucket]) => (
            <div
              key={day}
              className="chart-bar"
              title={`${day} — ${formatPriceCents(bucket.revenue)} (${bucket.count} orders)`}
            >
              <div className="chart-fill" style={{ height: `${(bucket.revenue / maxRevenue) * 100}%` }} />
              <span className="chart-day">{day.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-grid">
        <div>
          <div className="admin-card">
            <h3>Top products (by revenue)</h3>
            {topProducts.length === 0 ? (
              <p style={{ color: 'var(--m)' }}>No sales in the last 30 days.</p>
            ) : (
              <table className="admin-table">
                <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.slug}>
                      <td>{p.name}</td>
                      <td>{p.units}</td>
                      <td>{formatPriceCents(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <div className="admin-card">
            <h3>Orders by status</h3>
            <table className="admin-table">
              <tbody>
                {ORDER_STATUSES.map((s) => (
                  <tr key={s}>
                    <td><span className={`pill ${s}`}>{s}</span></td>
                    <td style={{ textAlign: 'right' }}>{statusCounts[s]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-card">
            <h3>Top countries</h3>
            {topCountries.length === 0 ? (
              <p style={{ color: 'var(--m)' }}>No orders yet.</p>
            ) : (
              <table className="admin-table">
                <thead><tr><th>Country</th><th>Orders</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topCountries.map((c) => (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td>{c.count}</td>
                      <td>{formatPriceCents(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
