import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { hasDatabase, prisma } from '@/lib/prisma';
import { formatPriceCents } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  if (!(await readAdminEmailFromCookie())) redirect('/admin/login');
  if (!hasDatabase()) {
    return <AdminShell><h1><em>Analytics</em></h1><div className="admin-empty"><p>Database not configured.</p></div></AdminShell>;
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [orders, items] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, totalCents: true, status: true },
    }),
    prisma.orderItem.groupBy({
      by: ['productSlug', 'productName'],
      where: { order: { createdAt: { gte: since } } },
      _sum: { quantity: true, priceCents: true },
      orderBy: { _sum: { priceCents: 'desc' } },
      take: 10,
    }),
  ]);

  // Group orders by day for the past 30 days
  const dayBuckets: Record<string, { count: number; revenue: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = { count: 0, revenue: 0 };
  }
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (dayBuckets[key]) {
      dayBuckets[key].count += 1;
      dayBuckets[key].revenue += o.totalCents;
    }
  }
  const max = Math.max(1, ...Object.values(dayBuckets).map((b) => b.revenue));

  return (
    <AdminShell>
      <h1><em>Analytics</em></h1>
      <p style={{ color: 'var(--m)', marginBottom: 28 }}>Last 30 days · revenue by day, top products by revenue.</p>

      <div className="admin-card">
        <h3>Daily revenue</h3>
        <div className="chart-bars">
          {Object.entries(dayBuckets).map(([day, bucket]) => (
            <div key={day} className="chart-bar" title={`${day} — ${formatPriceCents(bucket.revenue)} (${bucket.count} orders)`}>
              <div className="chart-fill" style={{ height: `${(bucket.revenue / max) * 100}%` }} />
              <span className="chart-day">{day.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h3>Top products (by revenue)</h3>
        {items.length === 0 ? (
          <p style={{ color: 'var(--m)' }}>No sales in the last 30 days.</p>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
            <tbody>
              {items.map((i: any) => (
                <tr key={i.productSlug}>
                  <td>{i.productName}</td>
                  <td>{i._sum.quantity ?? 0}</td>
                  <td>{formatPriceCents((i._sum.priceCents ?? 0) * (i._sum.quantity ?? 1))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
