import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { listSubscribers } from '@/lib/db/messages';
import { hasDatabase } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await readAdminEmailFromCookie())) redirect('/admin/login');
  if (!hasDatabase()) {
    return <AdminShell><h1><em>Subscribers</em></h1><div className="admin-empty"><p>Database not configured.</p></div></AdminShell>;
  }
  const sp = await searchParams;
  const status = sp.status;
  const subs = await listSubscribers({ status });
  const counts = {
    active: (await listSubscribers({ status: 'active' })).length,
    pending: (await listSubscribers({ status: 'pending' })).length,
    unsubscribed: (await listSubscribers({ status: 'unsubscribed' })).length,
  };

  return (
    <AdminShell>
      <h1><em>Subscribers</em></h1>
      <div className="admin-metrics" style={{ marginBottom: 24 }}>
        <div className="metric"><span className="metric-lab">Active</span><span className="metric-val">{counts.active}</span></div>
        <div className="metric"><span className="metric-lab">Pending</span><span className="metric-val">{counts.pending}</span></div>
        <div className="metric"><span className="metric-lab">Unsubscribed</span><span className="metric-val">{counts.unsubscribed}</span></div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filters">
          <a href="/admin/subscribers" className={!status ? 'on' : ''}>All</a>
          <a href="/admin/subscribers?status=active" className={status === 'active' ? 'on' : ''}>Active</a>
          <a href="/admin/subscribers?status=pending" className={status === 'pending' ? 'on' : ''}>Pending</a>
          <a href="/admin/subscribers?status=unsubscribed" className={status === 'unsubscribed' ? 'on' : ''}>Unsubscribed</a>
        </div>
        <a href="/api/admin/subscribers/export" className="btn btn-outline btn-sm">Export CSV ↓</a>
      </div>

      {subs.length === 0 ? (
        <div className="admin-empty"><p>No subscribers in this view.</p></div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Status</th><th>Source</th><th>Subscribed</th><th>Confirmed</th></tr></thead>
            <tbody>
              {subs.map((s: any) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td><span className={`pill ${s.status}`}>{s.status}</span></td>
                  <td>{s.source ?? '—'}</td>
                  <td>{s.subscribedAt.toLocaleDateString()}</td>
                  <td>{s.confirmedAt?.toLocaleDateString() ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
